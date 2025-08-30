/**
 * Request deduplication utility for Cloudflare Workers
 * Prevents duplicate requests from being processed simultaneously
 */

export interface DeduplicationEntry {
  promise: Promise<any>;
  timestamp: number;
  requestCount: number;
}

export class RequestDeduplicator {
  private pendingRequests = new Map<string, DeduplicationEntry>();
  private readonly maxAge = 30000; // 30 seconds max age for pending requests
  private readonly cleanupInterval = 10000; // Cleanup every 10 seconds

  constructor() {
    // Cleanup expired entries periodically (only in runtime environments)
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), this.cleanupInterval);
    }
  }

  /**
   * Generate deduplication key from request parameters
   */
  private generateKey(method: string, params: any, credentials?: { username?: string }): string {
    const userKey = credentials?.username ? 
      this.simpleHash(credentials.username).toString() : 'anonymous';
    
    // Sort params to ensure consistent key generation
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    const paramsHash = this.simpleHash(sortedParams);
    
    return `${method}:${userKey}:${paramsHash}`;
  }

  /**
   * Simple hash function for key generation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Check if request should be deduplicated
   */
  shouldDeduplicate(method: string, params: any): boolean {
    // Only deduplicate read operations
    const readMethods = ['list_nodes', 'search_nodes', 'get_node_by_id'];
    
    if (!readMethods.includes(method)) {
      return false;
    }

    // Don't deduplicate very large requests (likely unique)
    const paramsSize = JSON.stringify(params).length;
    if (paramsSize > 2000) {
      return false;
    }

    // Don't deduplicate requests with time-sensitive parameters
    if (params.includeTimestamp || params.realtime) {
      return false;
    }

    return true;
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    method: string,
    params: any,
    credentials: { username?: string } | undefined,
    executor: () => Promise<T>
  ): Promise<T> {
    // Skip deduplication if not applicable
    if (!this.shouldDeduplicate(method, params)) {
      return executor();
    }

    const key = this.generateKey(method, params, credentials);
    
    // Check if there's already a pending request
    const existing = this.pendingRequests.get(key);
    if (existing && !this.isExpired(existing)) {
      console.log(`Deduplicating request: ${key} (${existing.requestCount + 1} total)`);
      existing.requestCount++;
      return existing.promise as Promise<T>;
    }

    // Create new pending request
    const promise = this.executeWithTracking(key, executor);
    
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      requestCount: 1
    });

    return promise;
  }

  /**
   * Execute request with cleanup tracking
   */
  private async executeWithTracking<T>(key: string, executor: () => Promise<T>): Promise<T> {
    try {
      const result = await executor();
      return result;
    } catch (error) {
      throw error;
    } finally {
      // Clean up after execution
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Check if deduplication entry is expired
   */
  private isExpired(entry: DeduplicationEntry): boolean {
    return Date.now() - entry.timestamp > this.maxAge;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.pendingRequests.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.pendingRequests.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired deduplication entries`);
    }
  }

  /**
   * Get current deduplication statistics
   */
  getStats(): { pendingRequests: number; totalRequestCount: number } {
    let totalRequestCount = 0;
    
    for (const entry of this.pendingRequests.values()) {
      totalRequestCount += entry.requestCount;
    }

    return {
      pendingRequests: this.pendingRequests.size,
      totalRequestCount
    };
  }

  /**
   * Clear all pending requests (for testing)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Force cleanup of specific request
   */
  invalidate(method: string, params: any, credentials?: { username?: string }): void {
    const key = this.generateKey(method, params, credentials);
    this.pendingRequests.delete(key);
  }

  /**
   * Check if request is currently being processed
   */
  isPending(method: string, params: any, credentials?: { username?: string }): boolean {
    const key = this.generateKey(method, params, credentials);
    const entry = this.pendingRequests.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }
}

export const requestDeduplicator = new RequestDeduplicator();