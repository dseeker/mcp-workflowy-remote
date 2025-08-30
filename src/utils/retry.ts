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
        const delay = this.calculateDelay(attempt, finalConfig);
        
        console.log(`Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${delay}ms:`, {
          error: error.message,
          retryable: error.retryable,
          overloaded: error.overloaded
        });

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: any, config: RetryConfig): boolean {
    // Don't retry if explicitly marked as overloaded
    if (error.overloaded === true) {
      return false;
    }

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
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
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
  // Quick operations (authentication, node lookup)
  QUICK: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 2000,
    backoffMultiplier: 2
  },

  // Standard operations (list, search)
  STANDARD: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
    backoffMultiplier: 2
  },

  // Write operations (create, update, delete)
  WRITE: {
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
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
    maxAttempts: 4,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2
  }
} as const;

export const retryManager = new RetryManager();