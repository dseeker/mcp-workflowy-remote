/**
 * Retry utility with exponential backoff
 * Based on Cloudflare Workers 2025 best practices
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export interface RetryError extends Error {
  retryable?: boolean;
  overloaded?: boolean;
  attempt?: number;
  totalAttempts?: number;
  originalError?: Error;
}

export class RetryManager {
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'NetworkError',
      'TimeoutError'
    ],
    nonRetryableErrors: [
      'AuthenticationError',
      'AuthorizationError',
      'ValidationError'
    ]
  };

  /**
   * Execute function with retry logic
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: RetryError | null = null;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = this.enrichError(error, attempt, finalConfig.maxAttempts);

        // Don't retry on final attempt
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // Check if error should be retried
        if (!this.shouldRetry(error, finalConfig)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, finalConfig, error);

        // Retry logging removed to avoid breaking MCP stdio protocol
        // Retry attempt: ${attempt}/${finalConfig.maxAttempts}, delay: ${delay}ms

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: any, config: RetryConfig): boolean {
    // Don't retry if explicitly marked as non-retryable
    if (error.retryable === false) {
      return false;
    }

    // Retry if explicitly marked as retryable
    if (error.retryable === true) {
      return true;
    }

    // Check error type against non-retryable list
    if (config.nonRetryableErrors?.some(pattern =>
      error.name?.includes(pattern) || error.message?.includes(pattern)
    )) {
      return false;
    }

    // Check error type against retryable list
    if (config.retryableErrors?.some(pattern =>
      error.name?.includes(pattern) || error.message?.includes(pattern)
    )) {
      return true;
    }

    // Check HTTP status codes
    if (error.status) {
      // Retry on 5xx errors and some 4xx errors
      if (error.status >= 500) {
        return true;
      }
      if ([408, 409, 429].includes(error.status)) {
        return true;
      }
      // Don't retry on other 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
    }

    // Default to retrying network-like errors
    return true;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig, error?: any): number {
    let baseDelay = config.baseDelayMs;

    // Use longer delays for rate limiting/overload errors
    if (error?.overloaded === true || error?.status === 429) {
      baseDelay = Math.max(baseDelay, 5000); // Minimum 5 second delay for rate limits
    }

    const exponentialDelay = baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

    // Add jitter (±25% randomization)
    const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);

    return Math.max(0, Math.round(cappedDelay + jitter));
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enrich error with retry metadata
   */
  private enrichError(error: any, attempt: number, totalAttempts: number): RetryError {
    const enrichedError = error as RetryError;
    enrichedError.attempt = attempt;
    enrichedError.totalAttempts = totalAttempts;
    enrichedError.originalError = error;

    return enrichedError;
  }
}

/**
 * Retry configuration presets for different operation types
 */
export const RetryPresets = {
  // Quick operations (authentication, node lookup) - enhanced for rate limiting
  QUICK: {
    maxAttempts: 15, // Very persistent for auth rate limits
    baseDelayMs: 3000, // Start with 3 seconds
    maxDelayMs: 180000, // Allow up to 3 minutes for auth
    backoffMultiplier: 1.5 // Slower escalation
  },

  // Standard operations (list, search)
  STANDARD: {
    maxAttempts: 15, // Much more persistent
    baseDelayMs: 2000,
    maxDelayMs: 240000, // Allow up to 4 minutes
    backoffMultiplier: 1.6
  },

  // Write operations (create, update, delete)
  WRITE: {
    maxAttempts: 20, // Very persistent for important operations
    baseDelayMs: 2000,
    maxDelayMs: 300000, // Allow up to 5 minutes
    backoffMultiplier: 1.5,
    nonRetryableErrors: [
      'AuthenticationError',
      'AuthorizationError',
      'ValidationError',
      'DuplicateError',
      'NotFoundError'
    ]
  },

  // Long operations (search, bulk operations)
  LONG: {
    maxAttempts: 25, // Even more persistent for long operations
    baseDelayMs: 3000,
    maxDelayMs: 360000, // Allow up to 6 minutes
    backoffMultiplier: 1.4
  },

  // Batch operations with aggressive rate limit handling
  BATCH: {
    maxAttempts: 20, // Very persistent for batch operations
    baseDelayMs: 3000,
    maxDelayMs: 300000, // Up to 5 minutes for severe rate limiting
    backoffMultiplier: 1.5, // Slower escalation to stay within limits
    retryableErrors: ['429', 'OverloadError', 'rate limit']
  },

  // Ultra-persistent for rate limiting - almost never give up
  RATE_LIMIT_PERSISTENT: {
    maxAttempts: 50, // Very high retry count
    baseDelayMs: 5000, // Start with 5 seconds
    maxDelayMs: 600000, // Up to 10 minutes maximum delay
    backoffMultiplier: 1.3, // Very slow escalation
    retryableErrors: ['429', 'OverloadError', 'rate limit', '503']
  }
} as const;

export const retryManager = new RetryManager();