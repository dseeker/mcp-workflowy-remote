#!/usr/bin/env node

/**
 * Advanced Worker Log Collection Script
 *
 * Collects both historical and real-time logs from Cloudflare Workers
 * Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env file
 *
 * Usage:
 *   npm run logs:advanced                          # Recent activity logs (2min wrangler tail)
 *   npm run logs:advanced -- --mode realtime      # Real-time logs for 30 seconds
 *   npm run logs:advanced -- --mode both          # Recent activity + real-time
 *   npm run logs:advanced -- --hours 1            # Collect recent activity (max 2min capture)
 *   npm run logs:advanced -- --duration 60        # 60 seconds of real-time logs
 *   npm run logs:advanced -- --skip-tail          # Skip tail collection (test requests only)
 *   npm run logs:advanced -- --worker-name your-worker-name
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const WORKER_URL = process.env.WORKER_URL || 'https://mcp-workflowy-remote.daniel-bca.workers.dev';
const ALLOWED_API_KEYS = process.env.ALLOWED_API_KEYS || '';
const FIRST_API_KEY = ALLOWED_API_KEYS.split(',')[0];
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Parse command line arguments
const args = process.argv.slice(2);
const modeIndex = args.indexOf('--mode');
const MODE = modeIndex !== -1 ? args[modeIndex + 1] : 'historical'; // realtime, historical, both

const durationIndex = args.indexOf('--duration');
const DURATION = durationIndex !== -1 ? parseInt(args[durationIndex + 1]) || 30 : 30;

const hoursIndex = args.indexOf('--hours');
const HOURS = hoursIndex !== -1 ? parseInt(args[hoursIndex + 1]) || 24 : 24;

const workerNameIndex = args.indexOf('--worker-name');
const WORKER_NAME = workerNameIndex !== -1 ? args[workerNameIndex + 1] : 'mcp-workflowy-remote';

const workerUrlIndex = args.indexOf('--worker-url');
const CUSTOM_WORKER_URL = workerUrlIndex !== -1 ? args[workerUrlIndex + 1] : WORKER_URL;

const SKIP_TAIL = args.includes('--skip-tail');

// Validate environment
if (!API_TOKEN) {
  console.error('❌ CLOUDFLARE_API_TOKEN is required in .env file');
  process.exit(1);
}

if ((MODE === 'historical' || MODE === 'both') && !ACCOUNT_ID) {
  console.error('❌ CLOUDFLARE_ACCOUNT_ID is required for historical logs');
  console.error('   Add CLOUDFLARE_ACCOUNT_ID=your-account-id to .env file');
  process.exit(1);
}

console.log('📋 Advanced Worker Log Collection');
console.log(`   Mode: ${MODE}`);
console.log(`   Worker URL: ${CUSTOM_WORKER_URL}`);
console.log(`   Worker Name: ${WORKER_NAME}`);
if (MODE === 'realtime' || MODE === 'both') {
  console.log(`   Real-time Duration: ${DURATION} seconds`);
}
if (MODE === 'historical' || MODE === 'both') {
  console.log(`   Historical Range: Last ${HOURS} hours`);
}
console.log('');

// Create log files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const historicalLogFile = path.join(logDir, `historical-logs-${timestamp}.json`);
const realtimeLogFile = path.join(logDir, `realtime-logs-${timestamp}.json`);
const requestLogFile = path.join(logDir, `requests-${timestamp}.txt`);
const summaryFile = path.join(logDir, `summary-${timestamp}.json`);

// Log collection using wrangler tail (current working method)
async function collectHistoricalLogs() {
  console.log('📚 Collecting logs using wrangler tail...');
  console.log(`   Note: Collecting recent activity (not true historical logs)`);
  console.log(`   Duration: ${HOURS} hours worth of activity (max 2 min capture)`);

  // Make some test requests first to generate logs if needed
  if (FIRST_API_KEY && !SKIP_TAIL) {
    console.log('🚀 Making test requests to generate activity...');
    await makeTestRequests();
    console.log('⏱️  Waiting 3 seconds for requests to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return new Promise((resolve, reject) => {
    const wranglerProcess = spawn('npx', [
      'wrangler', 'tail', WORKER_NAME,
      '--format', 'json',
      '--status', 'ok',
      '--status', 'error',
      '--status', 'canceled'
    ]);

    let logCount = 0;
    const collectedLogs = [];

    console.log('📡 Starting wrangler tail to capture activity...');

    wranglerProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      const lines = chunk.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          try {
            const logEntry = JSON.parse(line);

            // Extract and parse structured logs from the worker
            if (logEntry.logs && Array.isArray(logEntry.logs)) {
              logEntry.logs.forEach(log => {
                if (log.message && Array.isArray(log.message)) {
                  log.message.forEach(msg => {
                    try {
                      const structuredLog = JSON.parse(msg);
                      collectedLogs.push(structuredLog);
                      logCount++;
                    } catch (e) {
                      // Not a structured log, add as text
                      collectedLogs.push({ message: msg, timestamp: logEntry.eventTimestamp });
                      logCount++;
                    }
                  });
                }
              });
            }

            // Also store the main invocation log
            collectedLogs.push(logEntry);
            logCount++;

            // Show real-time activity
            const method = logEntry.event?.request?.method || 'N/A';
            const url = (logEntry.event?.request?.url || 'N/A').replace(/https:\/\/[^\/]*\.workers\.dev/, '');
            const status = logEntry.event?.response?.status || 'N/A';
            const wallTime = logEntry.wallTime || 0;
            const outcome = logEntry.outcome || 'unknown';

            if (outcome !== 'unknown') {
              console.log(`📊 ${method} ${url} | ${status} | ${wallTime}ms | ${outcome}`);
            }
          } catch (e) {
            // Not JSON, skip
          }
        }
      });
    });

    wranglerProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('Retrieving cached values') && !output.includes('▲') && !output.includes('version of Wrangler')) {
        console.error(`⚠️  Wrangler: ${output.trim()}`);
      }
    });

    // Collection duration - longer for better capture
    const duration = Math.min(HOURS * 3600, 120); // Cap at 2 minutes
    console.log(`⏱️  Collecting for ${duration} seconds...`);

    setTimeout(() => {
      wranglerProcess.kill('SIGTERM');

      console.log(`✅ Collected ${logCount} log entries from recent activity`);

      // Save logs
      fs.writeFileSync(historicalLogFile, JSON.stringify(collectedLogs, null, 2));

      // Analyze collected logs
      const summary = analyzeHistoricalLogs(collectedLogs);
      console.log('📊 Activity Log Summary:');
      console.log(`   • Total requests captured: ${summary.totalRequests}`);
      console.log(`   • Unique endpoints: ${summary.uniqueEndpoints.length}`);
      console.log(`   • Errors: ${summary.errors}`);
      console.log(`   • Average response time: ${summary.avgResponseTime}ms`);
      console.log(`   • Most active endpoint: ${summary.mostActiveEndpoint}`);
      console.log('');

      resolve({
        ...summary,
        method: 'wrangler-tail'
      });
    }, duration * 1000);

    wranglerProcess.on('error', (error) => {
      console.error(`❌ Wrangler tail failed: ${error.message}`);
      resolve({
        totalRequests: 0,
        method: 'failed',
        uniqueEndpoints: [],
        errors: 0,
        avgResponseTime: 0,
        mostActiveEndpoint: 'none'
      });
    });
  });
}

// Analyze historical logs
function analyzeHistoricalLogs(logs) {
  const summary = {
    totalRequests: 0,
    uniqueEndpoints: new Set(),
    errors: 0,
    responseTimes: [],
    endpointCounts: {},
    statusCodes: {},
    timeRange: { start: null, end: null },
    logTypes: { structured: 0, invocation: 0, text: 0 }
  };

  logs.forEach(log => {
    // Handle structured application logs
    if (log.level && log.message && log.context) {
      summary.logTypes.structured++;

      // Extract endpoint from context
      const endpoint = log.context?.endpoint;
      if (endpoint) {
        summary.uniqueEndpoints.add(endpoint);
        summary.endpointCounts[endpoint] = (summary.endpointCounts[endpoint] || 0) + 1;
      }

      // Count errors from log level
      if (log.level === 'ERROR' || log.level === 'WARN') {
        summary.errors++;
      }

      // Extract performance metrics
      if (log.context?.duration && typeof log.context.duration === 'number') {
        summary.responseTimes.push(log.context.duration);
      }

      // Time range from structured logs
      if (log.timestamp) {
        const time = new Date(log.timestamp);
        if (!summary.timeRange.start || time < summary.timeRange.start) {
          summary.timeRange.start = time;
        }
        if (!summary.timeRange.end || time > summary.timeRange.end) {
          summary.timeRange.end = time;
        }
      }

      // Count as request if it has request context
      if (log.context?.method && log.context?.endpoint) {
        summary.totalRequests++;
      }
    }
    // Handle invocation logs (from wrangler)
    else if (log.event && log.outcome) {
      summary.logTypes.invocation++;

      // Extract endpoint from URL
      const url = log.event?.request?.url || '';
      if (url) {
        const path = url.replace(/https?:\/\/[^\/]+/, '');
        summary.uniqueEndpoints.add(path);
        summary.endpointCounts[path] = (summary.endpointCounts[path] || 0) + 1;
      }

      // Count errors from HTTP status
      const status = log.event?.response?.status || 200;
      summary.statusCodes[status] = (summary.statusCodes[status] || 0) + 1;
      if (status >= 400) {
        summary.errors++;
      }

      // Response times from wallTime
      if (log.wallTime > 0) {
        summary.responseTimes.push(log.wallTime);
      }

      // Time range from eventTimestamp
      if (log.eventTimestamp) {
        const time = new Date(log.eventTimestamp);
        if (!summary.timeRange.start || time < summary.timeRange.start) {
          summary.timeRange.start = time;
        }
        if (!summary.timeRange.end || time > summary.timeRange.end) {
          summary.timeRange.end = time;
        }
      }

      summary.totalRequests++;
    }
    // Handle text logs
    else {
      summary.logTypes.text++;
    }
  });

  // Calculate averages
  summary.avgResponseTime = summary.responseTimes.length > 0
    ? Math.round(summary.responseTimes.reduce((a, b) => a + b, 0) / summary.responseTimes.length)
    : 0;

  // Find most active endpoint
  summary.mostActiveEndpoint = Object.entries(summary.endpointCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

  // Convert Set to Array
  summary.uniqueEndpoints = Array.from(summary.uniqueEndpoints);

  return summary;
}

// Real-time log collection (from previous script)
async function collectRealtimeLogs() {
  console.log('📡 Starting real-time log collection...');

  return new Promise((resolve, reject) => {
    const tailProcess = spawn('npx', ['wrangler', 'tail', '--format', 'json'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let logCount = 0;
    const realtimeSummary = {
      totalRequests: 0,
      errors: 0,
      endpoints: new Set(),
      startTime: new Date(),
      endTime: null
    };

    tailProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());

      lines.forEach(line => {
        if (line.trim()) {
          fs.appendFileSync(realtimeLogFile, line + '\n');
          logCount++;

          try {
            const logEntry = JSON.parse(line);
            realtimeSummary.totalRequests++;

            // Track endpoints
            const url = logEntry.event?.request?.url || '';
            if (url) {
              const path = url.replace(/https?:\/\/[^\/]+/, '');
              realtimeSummary.endpoints.add(path);
            }

            // Track errors
            const status = logEntry.event?.response?.status || 200;
            if (status >= 400) {
              realtimeSummary.errors++;
            }

            // Display simplified real-time output
            const outcome = logEntry.outcome || 'unknown';
            const wallTime = logEntry.wallTime || 0;
            const method = logEntry.event?.request?.method || 'N/A';
            const shortUrl = (logEntry.event?.request?.url || 'N/A').replace(/https:\/\/[^\/]*\.workers\.dev/, '');

            if (outcome !== 'unknown') {
              console.log(`📊 ${method} ${shortUrl} | ${status} | ${wallTime}ms | ${outcome}`);
            }

          } catch (parseError) {
            // Non-JSON log entry
            if (line.trim()) {
              console.log(`⚠️  ${line}`);
            }
          }
        }
      });
    });

    tailProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('Retrieving cached values')) {
        console.error(`⚠️  ${output}`);
      }
    });

    // Stop after specified duration
    setTimeout(() => {
      realtimeSummary.endTime = new Date();
      realtimeSummary.endpoints = Array.from(realtimeSummary.endpoints);

      tailProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!tailProcess.killed) {
          tailProcess.kill('SIGKILL');
        }
        resolve(realtimeSummary);
      }, 2000);
    }, DURATION * 1000);

    tailProcess.on('error', (error) => {
      reject(new Error(`Real-time collection failed: ${error.message}`));
    });
  });
}

// Make test requests to generate some logs
async function makeTestRequests() {
  if (!FIRST_API_KEY) {
    console.log('⚠️  No API key available, skipping test requests');
    return;
  }

  console.log('🚀 Making test requests to generate logs...');

  const requests = [
    { url: `${CUSTOM_WORKER_URL}/health`, desc: 'Health check' },
    { url: `${CUSTOM_WORKER_URL}/`, desc: 'Root endpoint' },
    { url: `${CUSTOM_WORKER_URL}/tools`, desc: 'Tools (auth)', headers: [`Authorization: Bearer ${FIRST_API_KEY}`] },
    { url: `${CUSTOM_WORKER_URL}/tools`, desc: 'Tools (no auth)' },
    { url: `${CUSTOM_WORKER_URL}/invalid`, desc: 'Invalid endpoint' }
  ];

  for (const req of requests) {
    try {
      const curlArgs = ['-s', '-w', '%{http_code}'];
      if (req.headers) {
        req.headers.forEach(header => {
          curlArgs.push('-H', header);
        });
      }
      curlArgs.push(req.url);

      const curlProcess = spawn('curl', curlArgs);

      await new Promise((resolve) => {
        curlProcess.on('close', () => {
          console.log(`   ✅ ${req.desc}`);
          resolve();
        });
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   ❌ ${req.desc}: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const results = {};

  try {
    // Historical logs
    if (MODE === 'historical' || MODE === 'both') {
      results.historical = await collectHistoricalLogs();
    }

    // Real-time logs
    if ((MODE === 'realtime' || MODE === 'both') && !SKIP_TAIL) {
      if (MODE === 'both') {
        console.log('🔄 Switching to real-time collection...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Make test requests to generate some logs
      await makeTestRequests();

      results.realtime = await collectRealtimeLogs();
    } else if (SKIP_TAIL) {
      console.log('⏭️  Skipping real-time tail collection (--skip-tail flag)');
    }

    // Generate final summary
    const finalSummary = {
      timestamp: new Date().toISOString(),
      mode: MODE,
      worker: WORKER_NAME,
      results: results
    };

    fs.writeFileSync(summaryFile, JSON.stringify(finalSummary, null, 2));

    console.log('');
    console.log('📊 === FINAL SUMMARY ===');
    console.log('');

    if (results.historical) {
      console.log('📚 Historical Logs:');
      console.log(`   • Total requests: ${results.historical.totalRequests}`);
      console.log(`   • Errors: ${results.historical.errors}`);
      console.log(`   • Unique endpoints: ${results.historical.uniqueEndpoints.length}`);
      console.log(`   • Avg response time: ${results.historical.avgResponseTime}ms`);
      console.log('');
    }

    if (results.realtime) {
      console.log('📡 Real-time Logs:');
      console.log(`   • Total requests: ${results.realtime.totalRequests}`);
      console.log(`   • Errors: ${results.realtime.errors}`);
      console.log(`   • Unique endpoints: ${results.realtime.endpoints.length}`);
      console.log(`   • Duration: ${DURATION} seconds`);
      console.log('');
    }

    console.log('📁 Files created:');
    if (fs.existsSync(historicalLogFile)) console.log(`   • ${historicalLogFile}`);
    if (fs.existsSync(realtimeLogFile)) console.log(`   • ${realtimeLogFile}`);
    if (fs.existsSync(requestLogFile)) console.log(`   • ${requestLogFile}`);
    if (fs.existsSync(summaryFile)) console.log(`   • ${summaryFile}`);

    console.log('');
    console.log('🎉 Log collection complete!');

  } catch (error) {
    console.error(`❌ Error during log collection: ${error.message}`);
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted by user');
  process.exit(0);
});

main().catch(error => {
  console.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});