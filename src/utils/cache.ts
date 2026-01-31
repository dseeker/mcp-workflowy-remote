/**
 * Cloudflare Workers caching utility
 * Implements caching strategies based on 2025 CF Workers best practices
 */

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate?: number; // Optional stale-while-revalidate time
  cacheKey?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hash: string; // Content hash for integrity
}

export class WorkerCache {
  private cache: Cache | null = null;

  constructor() {
    // Handle environments where caches might not be available (like tests)
    if (typeof caches !== 'undefined' && caches.default) {
      this.cache = caches.default;
    }
  }

  /**
   * Generate consistent cache key for requests
   */
  private generateCacheKey(
    method: string,
    params: any,
    credentials?: { username?: string }
  ): string {
    // Create deterministic key based on method, params, and user
    const userHash = credentials?.username ?
      this.simpleHash(credentials.username).toString() : 'anonymous';

    const paramsString = JSON.stringify(params, Object.keys(params).sort());
    const paramsHash = this.simpleHash(paramsString);

    return `workflowy:${method}:${userHash}:${paramsHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if cached response is still valid
   */
  private isValidCacheEntry(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // Age in seconds
    return age < entry.ttl;
  }

  /**
   * Get cached response for MCP tool call
   */
  async get<T>(
    method: string,
    params: any,
    credentials?: { username?: string }
  ): Promise<T | null> {
    if (!this.cache) {
      return null; // No cache available
    }

    try {
      const cacheKey = this.generateCacheKey(method, params, credentials);
      const cacheUrl = new URL(`https://cache.workflowy.local/${cacheKey}`);

      const cachedResponse = await this.cache.match(new Request(cacheUrl.toString()));

      if (!cachedResponse) {
        return null;
      }

      const cacheEntry: CacheEntry<T> = await cachedResponse.json();

      if (!this.isValidCacheEntry(cacheEntry)) {
        // Cache expired, delete it
        await this.cache.delete(new Request(cacheUrl.toString()));
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set<T>(
    method: string,
    params: any,
    data: T,
    config: CacheConfig,
    credentials?: { username?: string }
  ): Promise<void> {
    if (!this.cache) {
      return; // No cache available
    }

    try {
      const cacheKey = this.generateCacheKey(method, params, credentials);
      const cacheUrl = new URL(`https://cache.workflowy.local/${cacheKey}`);

      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: config.ttl,
        hash: this.simpleHash(JSON.stringify(data)).toString()
      };

      const response = new Response(JSON.stringify(cacheEntry), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${config.ttl}`,
          'X-Cache-Tags': config.tags?.join(',') || '',
          'X-Cache-Method': method
        }
      });

      await this.cache.put(new Request(cacheUrl.toString()), response);
    } catch (error) {
      console.warn('Cache storage failed:', error);
      // Don't throw - caching failures shouldn't break the application
    }
  }

  /**
   * Check if request should be cached
   */
  shouldCache(method: string, params: any): boolean {
    // Cache read operations but not write operations
    const readMethods = ['list_nodes', 'search_nodes', 'get_node_by_id'];

    if (!readMethods.includes(method)) {
      return false;
    }

    // Don't cache very large parameter sets (likely one-off queries)
    const paramsSize = JSON.stringify(params).length;
    if (paramsSize > 1000) {
      return false;
    }

    return true;
  }

  /**
   * Get cache configuration based on method type
   */
  getCacheConfig(method: string, params: any): CacheConfig {
    switch (method) {
      case 'list_nodes':
        // Cache list operations for 5 minutes
        return {
          ttl: 300,
          tags: ['nodes', 'list'],
          staleWhileRevalidate: 60
        };

      case 'search_nodes':
        // Cache search results for 2 minutes (more dynamic)
        return {
          ttl: 120,
          tags: ['nodes', 'search'],
          staleWhileRevalidate: 30
        };

      case 'get_node_by_id':
        // Cache individual node lookups for 10 minutes
        return {
          ttl: 600,
          tags: ['nodes', 'single'],
          staleWhileRevalidate: 120
        };

      default:
        // Default short cache for unknown read methods
        return {
          ttl: 60,
          tags: ['default']
        };
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidate(tags: string[]): Promise<void> {
    // Note: Cloudflare Workers Cache API doesn't support tag-based invalidation
    // In a full implementation, you'd need to track cache keys by tags
    // For now, we'll implement basic key tracking if needed
    console.error('Cache invalidation requested for tags:', tags);
  }

  /**
   * Clear all cache entries (for testing/debugging)
   */
  async clear(): Promise<void> {
    // Note: Cloudflare Workers Cache API doesn't have a clear-all method
    // This would require tracking all cache keys
    console.error('Cache clear requested - not implemented in CF Workers');
  }
}

export const workerCache = new WorkerCache();