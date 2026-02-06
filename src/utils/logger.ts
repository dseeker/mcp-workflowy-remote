// Logger utility that works in both Node.js and Cloudflare Worker environments
// IMPORTANT: Logs ONLY go to local files, never to stdout/stderr (to avoid breaking MCP stdio protocol)

import { promises as fs } from 'fs';
import path from 'path';

// Check if we're in a Cloudflare Worker environment
const isCloudflareWorker = typeof globalThis !== 'undefined' && 'caches' in globalThis;

// File-based simple logger that never writes to console
const fileLogger = {
    logFilePath: '',
    
    init: async () => {
        if (!fileLogger.logFilePath) {
            const projectRoot = process.env.MCP_LOG_PATH || process.cwd();
            const logsDir = path.join(projectRoot, 'logs');
            await fs.mkdir(logsDir, { recursive: true });
            fileLogger.logFilePath = path.join(logsDir, 'simple.log');
        }
    },
    
    write: async (level: string, message: string, meta?: any) => {
        try {
            await fileLogger.init();
            const timestamp = new Date().toISOString();
            const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
            const logLine = `[${timestamp}] [${level}] ${message}${metaStr}\n`;
            await fs.appendFile(fileLogger.logFilePath, logLine, 'utf-8');
        } catch {
            // Silently fail - never write to console
        }
    },
    
    info: (message: string, meta?: any) => fileLogger.write('INFO', message, meta),
    error: (message: string, error?: Error | any, meta?: any) => {
        const errorMeta = error instanceof Error
            ? { error: error.message, stack: error.stack, ...meta }
            : { error, ...meta };
        return fileLogger.write('ERROR', message, errorMeta);
    },
    warn: (message: string, meta?: any) => fileLogger.write('WARN', message, meta),
    debug: (message: string, meta?: any) => fileLogger.write('DEBUG', message, meta)
};

let logger: any;

if (isCloudflareWorker) {
    // In Cloudflare Worker, use no-op logger since file system isn't available
    logger = {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {}
    };
} else {
    try {
        // Try to import winston for Node.js environments
        const winston = require('winston');
        const path = require('path');
        const fs = require('fs');

        // Get the project root directory (cross-platform with env override)
        const projectRoot = process.env.MCP_LOG_PATH || process.cwd();
        const logsDir = path.join(projectRoot, 'logs');

        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Clear log files on startup for development
        const errorLogPath = path.join(logsDir, 'error.log');
        const combinedLogPath = path.join(logsDir, 'combined.log');

        if (fs.existsSync(errorLogPath)) {
            fs.writeFileSync(errorLogPath, '');
        }
        if (fs.existsSync(combinedLogPath)) {
            fs.writeFileSync(combinedLogPath, '');
        }

        const winstonLogger = winston.createLogger({
            level: process.env.MCP_LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'mcp-workflowy-remote' },
            transports: [
                // Write all logs to simple files (no rotation) - NO CONSOLE TRANSPORT
                new winston.transports.File({
                    filename: path.join(logsDir, 'error.log'),
                    level: 'error'
                }),
                new winston.transports.File({
                    filename: path.join(logsDir, 'combined.log')
                }),
            ],
        });

        // NOTE: Console transport is intentionally disabled to avoid breaking MCP stdio protocol
        // All logs go only to files

        logger = winstonLogger;
    } catch (error) {
        // Fallback to file-based logger if winston is not available
        logger = fileLogger;
    }
}

// Helper functions for common logging patterns
export const log = {
    info: (message: string, meta?: any) => {
        if (logger?.info) {
            logger.info(message, meta);
        } else {
            fileLogger.info(message, meta);
        }
    },
    error: (message: string, error?: Error | any, meta?: any) => {
        const errorMeta = error instanceof Error
            ? { error: error.message, stack: error.stack, ...meta }
            : { error, ...meta };
        if (logger?.error) {
            logger.error(message, errorMeta);
        } else {
            fileLogger.error(message, error, meta);
        }
    },
    warn: (message: string, meta?: any) => {
        if (logger?.warn) {
            logger.warn(message, meta);
        } else {
            fileLogger.warn(message, meta);
        }
    },
    debug: (message: string, meta?: any) => {
        if (logger?.debug) {
            logger.debug(message, meta);
        } else {
            fileLogger.debug(message, meta);
        }
    },

    // Specialized logging for MCP operations
    mcpCall: (toolName: string, params: any, executionTime?: number) => {
        const logData = {
            toolName,
            params,
            executionTime: executionTime ? `${executionTime}ms` : undefined,
            category: 'mcp-call'
        };
        if (logger?.info) {
            logger.info('MCP Tool Called', logData);
        } else {
            fileLogger.info('MCP Tool Called', logData);
        }
    },

    workflowyRequest: (operation: string, params: any, responseSize?: number) => {
        const logData = {
            operation,
            params,
            responseSize: responseSize ? `${responseSize} characters` : undefined,
            category: 'workflowy-api'
        };
        if (logger?.debug) {
            logger.debug('Workflowy API Request', logData);
        } else {
            fileLogger.debug('Workflowy API Request', logData);
        }
    },

    workflowyResponse: (operation: string, response: any, size?: number) => {
        const responseStr = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
        const responseSize = size || responseStr.length;

        const logData = {
            operation,
            fullResponse: responseStr,
            fullResponseSize: responseSize,
            category: 'workflowy-response'
        };
        if (logger?.debug) {
            logger.debug('Workflowy API Response', logData);
        } else {
            fileLogger.debug('Workflowy API Response', logData);
        }
    },

    performance: (operation: string, duration: number, additionalMetrics?: any) => {
        const logData = {
            operation,
            duration: `${duration}ms`,
            ...additionalMetrics,
            category: 'performance'
        };
        if (logger?.info) {
            logger.info('Performance Metric', logData);
        } else {
            fileLogger.info('Performance Metric', logData);
        }
    },

    tokenLimitWarning: (operation: string, tokenCount: number, limit: number = 25000) => {
        const logData = {
            operation,
            tokenCount,
            limit,
            percentage: Math.round((tokenCount / limit) * 100),
            category: 'token-limit'
        };
        if (logger?.warn) {
            logger.warn('Token Limit Warning', logData);
        } else {
            fileLogger.warn('Token Limit Warning', logData);
        }
    }
};

export { logger };
export default log;
