// Logger utility that works in both Node.js and Cloudflare Worker environments

// Check if we're in a Cloudflare Worker environment
const isCloudflareWorker = typeof globalThis !== 'undefined' && 'caches' in globalThis;

// Simple console-based logger for environments that don't support winston
const simpleLogger = {
    info: (message: string, meta?: any) => {
        const logMessage = meta ? `${message} ${JSON.stringify(meta)}` : message;
        console.error(`[INFO] ${logMessage}`);
    },
    error: (message: string, error?: Error | any, meta?: any) => {
        const errorMeta = error instanceof Error
            ? { error: error.message, stack: error.stack, ...meta }
            : { error, ...meta };
        const logMessage = `${message} ${JSON.stringify(errorMeta)}`;
        console.error(`[ERROR] ${logMessage}`);
    },
    warn: (message: string, meta?: any) => {
        const logMessage = meta ? `${message} ${JSON.stringify(meta)}` : message;
        console.error(`[WARN] ${logMessage}`);
    },
    debug: (message: string, meta?: any) => {
        const logMessage = meta ? `${message} ${JSON.stringify(meta)}` : message;
        console.error(`[DEBUG] ${logMessage}`);
    }
};

let logger: any;

if (isCloudflareWorker) {
    // Use simple console logging in Cloudflare Worker
    logger = simpleLogger;
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
                // Write all logs to simple files (no rotation)
                new winston.transports.File({
                    filename: path.join(logsDir, 'error.log'),
                    level: 'error'
                }),
                new winston.transports.File({
                    filename: path.join(logsDir, 'combined.log')
                }),
            ],
        });

        // If in development, also log to console
        if (process.env.NODE_ENV === 'development' || process.env.MCP_LOG_CONSOLE === 'true') {
            winstonLogger.add(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }

        logger = winstonLogger;
    } catch (error) {
        // Fallback to simple console logging if winston is not available
        logger = simpleLogger;
    }
}

// Helper functions for common logging patterns
export const log = {
    info: (message: string, meta?: any) => {
        if (logger.info) {
            logger.info(message, meta);
        } else {
            simpleLogger.info(message, meta);
        }
    },
    error: (message: string, error?: Error | any, meta?: any) => {
        const errorMeta = error instanceof Error
            ? { error: error.message, stack: error.stack, ...meta }
            : { error, ...meta };
        if (logger.error) {
            logger.error(message, errorMeta);
        } else {
            simpleLogger.error(message, error, meta);
        }
    },
    warn: (message: string, meta?: any) => {
        if (logger.warn) {
            logger.warn(message, meta);
        } else {
            simpleLogger.warn(message, meta);
        }
    },
    debug: (message: string, meta?: any) => {
        if (logger.debug) {
            logger.debug(message, meta);
        } else {
            simpleLogger.debug(message, meta);
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
        if (logger.info) {
            logger.info('MCP Tool Called', logData);
        } else {
            simpleLogger.info('MCP Tool Called', logData);
        }
    },

    workflowyRequest: (operation: string, params: any, responseSize?: number) => {
        const logData = {
            operation,
            params,
            responseSize: responseSize ? `${responseSize} characters` : undefined,
            category: 'workflowy-api'
        };
        if (logger.debug) {
            logger.debug('Workflowy API Request', logData);
        } else {
            simpleLogger.debug('Workflowy API Request', logData);
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
        if (logger.debug) {
            logger.debug('Workflowy API Response', logData);
        } else {
            simpleLogger.debug('Workflowy API Response', logData);
        }
    },

    performance: (operation: string, duration: number, additionalMetrics?: any) => {
        const logData = {
            operation,
            duration: `${duration}ms`,
            ...additionalMetrics,
            category: 'performance'
        };
        if (logger.info) {
            logger.info('Performance Metric', logData);
        } else {
            simpleLogger.info('Performance Metric', logData);
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
        if (logger.warn) {
            logger.warn('Token Limit Warning', logData);
        } else {
            simpleLogger.warn('Token Limit Warning', logData);
        }
    }
};

// Log the initialization if we have a proper logger
if (!isCloudflareWorker && typeof process !== 'undefined' && process.cwd) {
    log.info('Logger initialized', {
        environment: isCloudflareWorker ? 'cloudflare-worker' : 'nodejs',
        hasWinston: !!logger.info,
        level: process.env.MCP_LOG_LEVEL || 'info',
        console: process.env.NODE_ENV === 'development' || process.env.MCP_LOG_CONSOLE === 'true'
    });
}

export { logger };
export default log;