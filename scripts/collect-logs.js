#!/usr/bin/env node

/**
 * Local Worker Log Collection Script
 *
 * Collects logs from Cloudflare Workers using wrangler tail
 * Requires CLOUDFLARE_API_TOKEN in .env file
 *
 * Usage:
 *   npm run logs                    # Collect logs for 30 seconds
 *   npm run logs -- --duration 60  # Collect for 60 seconds
 *   npm run logs -- --worker-url https://your-worker.workers.dev
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const WORKER_URL = process.env.WORKER_URL || 'https://mcp-workflowy-remote.daniel-bca.workers.dev';
const ALLOWED_API_KEYS = process.env.ALLOWED_API_KEYS || '';
const FIRST_API_KEY = ALLOWED_API_KEYS.split(',')[0];

// Parse command line arguments
const args = process.argv.slice(2);
const durationIndex = args.indexOf('--duration');
const DURATION = durationIndex !== -1 ? parseInt(args[durationIndex + 1]) || 30 : 30;
const workerUrlIndex = args.indexOf('--worker-url');
const CUSTOM_WORKER_URL = workerUrlIndex !== -1 ? args[workerUrlIndex + 1] : WORKER_URL;

// Validate environment
if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error('❌ CLOUDFLARE_API_TOKEN is required in .env file');
  process.exit(1);
}

if (!FIRST_API_KEY) {
  console.error('❌ ALLOWED_API_KEYS is required in .env file');
  process.exit(1);
}

console.log('📋 Local Worker Log Collection');
console.log(`   Worker URL: ${CUSTOM_WORKER_URL}`);
console.log(`   Duration: ${DURATION} seconds`);
console.log(`   API Key: ${FIRST_API_KEY.substring(0, 12)}...`);
console.log('');

// Create log files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const rawLogFile = path.join(logDir, `worker-logs-${timestamp}.json`);
const requestLogFile = path.join(logDir, `requests-${timestamp}.txt`);

fs.writeFileSync(rawLogFile, '');
fs.writeFileSync(requestLogFile, '');

let tailProcess;
let logCount = 0;

// Function to make test requests
async function makeRequest(url, description, extraArgs = '') {
  const startTime = Date.now();

  console.log(`🔄 ${description}`);
  console.log(`   URL: ${url}`);

  try {
    const { spawn } = await import('child_process');

    const curlArgs = ['-w', '%{http_code}', '-s'];
    if (extraArgs) {
      curlArgs.push(...extraArgs.split(' '));
    }
    curlArgs.push(url);

    const curlProcess = spawn('curl', curlArgs);
    let response = '';

    curlProcess.stdout.on('data', (data) => {
      response += data.toString();
    });

    await new Promise((resolve) => {
      curlProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const statusCode = response.slice(-3);
        const responseBody = response.slice(0, -3);

        console.log(`   Status: ${statusCode} (${duration}ms)`);
        console.log(`   Response: ${responseBody.substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
        console.log('');

        // Log request info
        const logEntry = `${new Date().toISOString()} | ${description} | ${statusCode} | ${duration}ms | ${url}\n`;
        fs.appendFileSync(requestLogFile, logEntry);

        resolve();
      });
    });

    // Wait briefly for worker logs to be captured
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error(`   Error: ${error.message}`);
    console.log('');
  }
}

// Start wrangler tail
function startLogCollection() {
  console.log('📡 Starting wrangler tail...');

  tailProcess = spawn('npx', ['wrangler', 'tail', '--format', 'json'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  tailProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());

    lines.forEach(line => {
      if (line.trim()) {
        // Save raw log
        fs.appendFileSync(rawLogFile, line + '\n');
        logCount++;

        try {
          const logEntry = JSON.parse(line);

          // Extract key information
          const outcome = logEntry.outcome || 'unknown';
          const wallTime = logEntry.wallTime || 0;
          const cpuTime = logEntry.cpuTime || 0;
          const status = logEntry.event?.response?.status || 'N/A';
          const method = logEntry.event?.request?.method || 'N/A';
          const url = (logEntry.event?.request?.url || 'N/A').replace(/https:\/\/[^\/]*\.workers\.dev/, '');

          if (outcome !== 'unknown') {
            console.log(`📊 WORKER: ${method} ${url} | ${status} | ${wallTime}ms wall, ${cpuTime}ms cpu | ${outcome}`);
          }

          // Extract structured logs
          const logs = logEntry.logs || [];
          logs.forEach(log => {
            const messages = log.message || [];
            messages.forEach(msg => {
              if (typeof msg === 'object') {
                const timestamp = msg.timestamp || '';
                const level = msg.level || 'INFO';
                const message = msg.message || '';
                const endpoint = msg.context?.endpoint || '';
                const duration = msg.context?.duration || '';
                const perfMetric = msg.context?.performanceMetric;

                const timeOnly = timestamp.replace(/.*T([0-9:]{8}).*/, '$1');

                if (perfMetric) {
                  console.log(`⚡ PERF [${timeOnly}] ${level}: ${message} (${endpoint}) ${duration}ms`);
                } else {
                  console.log(`📝 LOG  [${timeOnly}] ${level}: ${message} (${endpoint})`);
                }
              } else if (typeof msg === 'string') {
                console.log(`📜 TEXT: ${msg}`);
              }
            });
          });

        } catch (parseError) {
          // Non-JSON log entry
          if (line.trim()) {
            console.log(`⚠️  RAW: ${line}`);
          }
        }
      }
    });
  });

  tailProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('Retrieving cached values')) {
      console.error(`⚠️  TAIL ERROR: ${output}`);
    }
  });

  tailProcess.on('close', (code) => {
    console.log(`📡 Wrangler tail stopped (exit code: ${code})`);
  });

  // Give wrangler time to initialize
  return new Promise(resolve => setTimeout(resolve, 3000));
}

// Main execution
async function main() {
  try {
    // Start log collection
    await startLogCollection();

    if (!tailProcess || tailProcess.killed) {
      console.error('❌ Failed to start wrangler tail');
      process.exit(1);
    }

    console.log('✅ Wrangler tail started, beginning test requests...');
    console.log('');

    // Make test requests
    await makeRequest(`${CUSTOM_WORKER_URL}/health`, 'Health check (no auth)');
    await makeRequest(`${CUSTOM_WORKER_URL}/`, 'Root endpoint info');
    await makeRequest(`${CUSTOM_WORKER_URL}/tools`, 'Tools endpoint (with auth)', `-H "Authorization: Bearer ${FIRST_API_KEY}"`);
    await makeRequest(`${CUSTOM_WORKER_URL}/tools`, 'Tools endpoint (no auth - should fail)');

    // MCP request
    console.log('🔄 Testing MCP endpoint with tools/list');
    const mcpPayload = JSON.stringify({
      jsonrpc: '2.0',
      id: 'log-test-1',
      method: 'tools/list',
      params: {}
    });

    await makeRequest(
      `${CUSTOM_WORKER_URL}/mcp`,
      'MCP tools/list',
      `-X POST -H "Authorization: Bearer ${FIRST_API_KEY}" -H "Content-Type: application/json" -d '${mcpPayload}'`
    );

    // Error test
    await makeRequest(`${CUSTOM_WORKER_URL}/nonexistent-endpoint`, 'Invalid endpoint (should 404)');

    console.log(`⏱️  Waiting for remaining logs (${Math.max(0, DURATION - 15)} seconds)...`);
    await new Promise(resolve => setTimeout(resolve, Math.max(0, DURATION - 15) * 1000));

  } catch (error) {
    console.error(`❌ Error during log collection: ${error.message}`);
  } finally {
    // Stop log collection
    if (tailProcess && !tailProcess.killed) {
      console.log('🛑 Stopping wrangler tail...');
      tailProcess.kill('SIGTERM');

      // Force kill if needed
      setTimeout(() => {
        if (!tailProcess.killed) {
          tailProcess.kill('SIGKILL');
        }
      }, 3000);
    }

    // Show summary
    setTimeout(() => {
      console.log('');
      console.log('📊 === LOG COLLECTION SUMMARY ===');
      console.log('');

      if (fs.existsSync(rawLogFile) && fs.statSync(rawLogFile).size > 0) {
        console.log(`✅ Raw logs saved: ${rawLogFile}`);
        console.log(`✅ Request log saved: ${requestLogFile}`);
        console.log(`📊 Total log entries: ${logCount}`);

        // Quick analysis
        try {
          const rawLogs = fs.readFileSync(rawLogFile, 'utf8');
          const requests = (rawLogs.match(/"outcome":/g) || []).length;
          const errors = (rawLogs.match(/"level":"ERROR"/g) || []).length;
          const warnings = (rawLogs.match(/"level":"WARN"/g) || []).length;

          console.log(`📈 Requests processed: ${requests}`);
          console.log(`⚠️  Warnings: ${warnings}`);
          console.log(`❌ Errors: ${errors}`);

        } catch (analysisError) {
          console.log('⚠️  Could not analyze logs');
        }

      } else {
        console.log('⚠️  No logs collected');
      }

      console.log('');
      console.log('🎉 Log collection complete!');

      process.exit(0);
    }, 2000);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted by user');
  if (tailProcess && !tailProcess.killed) {
    tailProcess.kill('SIGTERM');
  }
  process.exit(0);
});

main().catch(error => {
  console.error(`❌ Fatal error: ${error.message}`);
  if (tailProcess && !tailProcess.killed) {
    tailProcess.kill('SIGTERM');
  }
  process.exit(1);
});