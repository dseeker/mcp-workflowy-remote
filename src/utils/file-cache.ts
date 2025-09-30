/**
 * File-based cache with timestamp validation for Workflowy data
 * Stores cache entries as JSON files in a local cache directory
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface FileCacheEntry {
  data: any;
  lastModifiedAt: string;
  cachedAt: number;
  nodeId: string;
  cacheKey: string;
  ttl?: number; // Optional time-to-live in seconds
}

export interface CacheOptions {
  maxDepth?: number;
  includeFields?: string[];
  preview?: number;
  username?: string;
}

export class FileCache {
  private cacheDir: string;
  private defaultTTL: number = 24 * 60 * 60; // 24 hours in seconds

  constructor(cacheDir: string = 'cache') {
    this.cacheDir = path.resolve(cacheDir);
    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn(`Failed to create cache directory: ${error}`);
    }
  }

  /**
   * Generate cache key from nodeId and options
   */
  private generateCacheKey(nodeId: string, options: CacheOptions = {}): string {
    const keyData = {
      nodeId,
      maxDepth: options.maxDepth || 0,
      includeFields: options.includeFields?.sort() || [],
      preview: options.preview,
      username: options.username ? crypto.createHash('md5').update(options.username).digest('hex').substring(0, 8) : undefined
    };

    const keyString = JSON.stringify(keyData);
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Get cache file path for a cache key
   */
  private getCacheFilePath(cacheKey: string): string {
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }

  /**
   * Check if cache entry is still valid (not expired and timestamp matches)
   */
  private isCacheValid(entry: FileCacheEntry, currentTimestamp?: string): boolean {
    const now = Date.now();
    const age = (now - entry.cachedAt) / 1000; // Age in seconds

    // Check TTL expiration
    const ttl = entry.ttl || this.defaultTTL;
    if (age > ttl) {
      return false;
    }

    // Check timestamp if provided
    if (currentTimestamp && entry.lastModifiedAt) {
      return new Date(currentTimestamp) <= new Date(entry.lastModifiedAt);
    }

    return true;
  }

  /**
   * Get cached data for a node
   */
  async get(nodeId: string, options: CacheOptions = {}): Promise<FileCacheEntry | null> {
    try {
      const cacheKey = this.generateCacheKey(nodeId, options);
      const filePath = this.getCacheFilePath(cacheKey);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return null; // File doesn't exist
      }

      // Read and parse cache entry
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const entry: FileCacheEntry = JSON.parse(fileContent);

      // Basic validation
      if (!this.isCacheValid(entry)) {
        // Cache expired, delete file
        await this.delete(nodeId, options);
        return null;
      }

      return entry;
    } catch (error) {
      console.warn(`Failed to read cache for ${nodeId}: ${error}`);
      return null;
    }
  }

  /**
   * Store data in cache
   */
  async set(
    nodeId: string,
    data: any,
    lastModifiedAt: string,
    options: CacheOptions = {},
    ttl?: number
  ): Promise<void> {
    try {
      await this.ensureCacheDir();

      const cacheKey = this.generateCacheKey(nodeId, options);
      const filePath = this.getCacheFilePath(cacheKey);

      const entry: FileCacheEntry = {
        data,
        lastModifiedAt,
        cachedAt: Date.now(),
        nodeId,
        cacheKey,
        ttl: ttl || this.defaultTTL
      };

      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    } catch (error) {
      console.warn(`Failed to write cache for ${nodeId}: ${error}`);
    }
  }

  /**
   * Delete cached data for a node
   */
  async delete(nodeId: string, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(nodeId, options);
      const filePath = this.getCacheFilePath(cacheKey);

      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, that's fine
    }
  }

  /**
   * Check if cached data is still valid by comparing timestamps
   */
  async isValid(nodeId: string, currentTimestamp: string, options: CacheOptions = {}): Promise<boolean> {
    const cached = await this.get(nodeId, options);
    if (!cached) {
      return false;
    }

    return this.isCacheValid(cached, currentTimestamp);
  }

  /**
   * Clear all cache files
   */
  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      await Promise.all(
        jsonFiles.map(file =>
          fs.unlink(path.join(this.cacheDir, file)).catch(() => {})
        )
      );
    } catch (error) {
      console.warn(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      let totalSize = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;

      for (const file of jsonFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: FileCacheEntry = JSON.parse(content);

          if (entry.cachedAt < oldestEntry) {
            oldestEntry = entry.cachedAt;
          }
          if (entry.cachedAt > newestEntry) {
            newestEntry = entry.cachedAt;
          }
        } catch {
          // Skip invalid entries
        }
      }

      return {
        totalFiles: jsonFiles.length,
        totalSize,
        oldestEntry: jsonFiles.length > 0 ? oldestEntry : 0,
        newestEntry: jsonFiles.length > 0 ? newestEntry : 0
      };
    } catch (error) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestEntry: 0,
        newestEntry: 0
      };
    }
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanup(): Promise<number> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      let deletedCount = 0;

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: FileCacheEntry = JSON.parse(content);

          if (!this.isCacheValid(entry)) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch {
          // Skip invalid files
        }
      }

      return deletedCount;
    } catch (error) {
      console.warn(`Failed to cleanup cache: ${error}`);
      return 0;
    }
  }
}

// Export singleton instance
export const fileCache = new FileCache();