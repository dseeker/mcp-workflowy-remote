/**
 * Structured logging utility for Cloudflare Workers
 * Provides consistent logging with structured data
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  endpoint?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export class StructuredLogger {
  private level: LogLevel;
  private environment: string;

  constructor(level: LogLevel = LogLevel.INFO, environment: string = 'production') {
    this.level = level;
    this.environment = environment;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: {
        environment: this.environment,
        ...context
      }
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.environment !== 'production' ? error.stack : undefined,
        code: (error as any).code
      };
    }

    return entry;
  }

  /**
   * Log message if level is sufficient
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level <= this.level) {
      const entry = this.createLogEntry(level, message, context, error);

      // In Cloudflare Workers, console methods are available
      switch (level) {
        case LogLevel.ERROR:
          console.error(JSON.stringify(entry));
          break;
        case LogLevel.WARN:
          console.warn(JSON.stringify(entry));
          break;
        case LogLevel.INFO:
          console.error(JSON.stringify(entry));
          break;
        case LogLevel.DEBUG:
          console.error(JSON.stringify(entry));
          break;
      }
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, durationMs: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      duration: durationMs,
      performanceMetric: true
    });
  }

  /**
   * Log cache operations
   */
  cache(operation: 'hit' | 'miss' | 'set' | 'invalidate', key: string, context?: LogContext): void {
    this.debug(`Cache ${operation}: ${key}`, {
      ...context,
      cacheOperation: operation,
      cacheKey: key
    });
  }

  /**
   * Log Workflowy API calls
   */
  workflowyApi(method: string, duration: number, success: boolean, context?: LogContext): void {
    this.info(`Workflowy API: ${method}`, {
      ...context,
      apiMethod: method,
      duration,
      success,
      workflowyApi: true
    });
  }

  /**
   * Log MCP operations
   */
  mcpOperation(
    method: string,
    tool: string,
    duration: number,
    cached: boolean,
    context?: LogContext
  ): void {
    this.info(`MCP: ${method}/${tool}`, {
      ...context,
      mcpMethod: method,
      mcpTool: tool,
      duration,
      cached,
      mcpOperation: true
    });
  }

  /**
   * Log retry attempts
   */
  retry(operation: string, attempt: number, maxAttempts: number, error?: Error, context?: LogContext): void {
    this.warn(`Retry ${attempt}/${maxAttempts}: ${operation}`, {
      ...context,
      retryOperation: operation,
      attempt,
      maxAttempts,
      retryAttempt: true
    }, error);
  }

  /**
   * Create child logger with additional context
   */
  child(childContext: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger(this.level, this.environment);

    // Override log method to include child context
    const originalCreateLogEntry = childLogger.createLogEntry.bind(childLogger);
    childLogger.createLogEntry = (level, message, context, error) => {
      return originalCreateLogEntry(level, message, { ...childContext, ...context }, error);
    };

    return childLogger;
  }

  /**
   * Create request-scoped logger
   */
  forRequest(requestId: string, method?: string, endpoint?: string): StructuredLogger {
    return this.child({
      requestId,
      method,
      endpoint,
      requestScope: true
    });
  }

  /**
   * Create user-scoped logger
   */
  forUser(userId: string, requestId?: string): StructuredLogger {
    return this.child({
      userId,
      requestId,
      userScope: true
    });
  }
}

/**
 * Create logger instance based on environment
 */
export function createLogger(env: any): StructuredLogger {
  const environment = env.ENVIRONMENT || 'production';
  const isProduction = environment === 'production';

  const level = isProduction ? LogLevel.INFO : LogLevel.DEBUG;

  return new StructuredLogger(level, environment);
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Default logger instance
export const logger = new StructuredLogger();