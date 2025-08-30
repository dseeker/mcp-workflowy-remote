/**
 * Token usage optimization utility
 * Smart batching and response truncation to stay within token limits
 */

export interface TokenLimits {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
  warningThreshold: number; // Percentage (0.8 = 80%)
}

export interface OptimizationResult<T> {
  data: T;
  optimized: boolean;
  originalSize: number;
  optimizedSize: number;
  estimatedTokens: number;
  truncated: boolean;
  batchCount?: number;
}

export class TokenOptimizer {
  private defaultLimits: TokenLimits = {
    maxInputTokens: 20000,   // Conservative limit for MCP requests
    maxOutputTokens: 30000,  // Conservative limit for MCP responses
    maxTotalTokens: 45000,   // Total context limit
    warningThreshold: 0.8    // 80% threshold
  };

  /**
   * Estimate token count from text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Very rough approximation: 1 token ≈ 4 characters for English
    // More accurate would use actual tokenizer, but this is sufficient for optimization
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if content exceeds token limits
   */
  checkLimits(content: string, type: 'input' | 'output', limits?: Partial<TokenLimits>): {
    withinLimits: boolean;
    estimatedTokens: number;
    limit: number;
    utilizationPercent: number;
  } {
    const finalLimits = { ...this.defaultLimits, ...limits };
    const estimatedTokens = this.estimateTokens(content);
    const limit = type === 'input' ? finalLimits.maxInputTokens : finalLimits.maxOutputTokens;
    
    return {
      withinLimits: estimatedTokens <= limit,
      estimatedTokens,
      limit,
      utilizationPercent: (estimatedTokens / limit) * 100
    };
  }

  /**
   * Optimize search results by truncating if necessary
   */
  optimizeSearchResults(
    results: any[], 
    maxTokens?: number, 
    truncateIndividualItems: boolean = true
  ): OptimizationResult<any[]> {
    const targetTokens = maxTokens || this.defaultLimits.maxOutputTokens;
    const originalContent = JSON.stringify(results);
    const originalSize = originalContent.length;
    const originalTokens = this.estimateTokens(originalContent);
    
    if (originalTokens <= targetTokens) {
      return {
        data: results,
        optimized: false,
        originalSize,
        optimizedSize: originalSize,
        estimatedTokens: originalTokens,
        truncated: false
      };
    }

    let optimizedResults = [...results];
    let optimized = false;
    let truncated = false;

    // Strategy 1: Remove items from the end until we're under limit
    while (optimizedResults.length > 0) {
      const currentContent = JSON.stringify(optimizedResults);
      const currentTokens = this.estimateTokens(currentContent);
      
      if (currentTokens <= targetTokens) {
        break;
      }
      
      optimizedResults.pop();
      optimized = true;
      truncated = true;
    }

    // Strategy 2: If still over limit and truncateIndividualItems is true, 
    // truncate individual item content
    if (truncateIndividualItems && optimizedResults.length > 0) {
      const currentContent = JSON.stringify(optimizedResults);
      const currentTokens = this.estimateTokens(currentContent);
      
      if (currentTokens > targetTokens) {
        optimizedResults = optimizedResults.map(item => 
          this.truncateItem(item, Math.floor(targetTokens / optimizedResults.length))
        );
        optimized = true;
        truncated = true;
      }
    }

    const optimizedContent = JSON.stringify(optimizedResults);
    const optimizedSize = optimizedContent.length;
    const estimatedTokens = this.estimateTokens(optimizedContent);

    return {
      data: optimizedResults,
      optimized,
      originalSize,
      optimizedSize,
      estimatedTokens,
      truncated
    };
  }

  /**
   * Truncate individual item content
   */
  private truncateItem(item: any, maxTokensPerItem: number): any {
    if (typeof item !== 'object' || !item) {
      return item;
    }

    const truncatedItem = { ...item };
    const maxCharsPerField = maxTokensPerItem * 4; // Rough conversion

    // Truncate string fields that are typically large
    if (typeof truncatedItem.name === 'string' && truncatedItem.name.length > maxCharsPerField) {
      truncatedItem.name = truncatedItem.name.substring(0, maxCharsPerField - 3) + '...';
    }

    if (typeof truncatedItem.note === 'string' && truncatedItem.note.length > maxCharsPerField) {
      truncatedItem.note = truncatedItem.note.substring(0, maxCharsPerField - 3) + '...';
    }

    // Truncate child items if present
    if (Array.isArray(truncatedItem.items) && truncatedItem.items.length > 0) {
      const maxChildItems = Math.max(1, Math.floor(maxTokensPerItem / 100)); // Conservative limit
      if (truncatedItem.items.length > maxChildItems) {
        truncatedItem.items = truncatedItem.items.slice(0, maxChildItems);
      }
    }

    return truncatedItem;
  }

  /**
   * Create batched requests to stay within token limits
   */
  createBatches<T>(
    items: T[], 
    maxTokensPerBatch: number,
    getItemSize: (item: T) => number = (item) => this.estimateTokens(JSON.stringify(item))
  ): OptimizationResult<T[][]> {
    if (items.length === 0) {
      return {
        data: [],
        optimized: false,
        originalSize: 0,
        optimizedSize: 0,
        estimatedTokens: 0,
        truncated: false,
        batchCount: 0
      };
    }

    const batches: T[][] = [];
    let currentBatch: T[] = [];
    let currentBatchTokens = 0;

    for (const item of items) {
      const itemTokens = getItemSize(item);
      
      // If single item exceeds limit, put it in its own batch (will need truncation later)
      if (itemTokens > maxTokensPerBatch && currentBatch.length === 0) {
        batches.push([item]);
        continue;
      }
      
      // If adding this item would exceed limit, start new batch
      if (currentBatchTokens + itemTokens > maxTokensPerBatch && currentBatch.length > 0) {
        batches.push([...currentBatch]);
        currentBatch = [item];
        currentBatchTokens = itemTokens;
      } else {
        currentBatch.push(item);
        currentBatchTokens += itemTokens;
      }
    }

    // Add final batch if not empty
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    const originalSize = JSON.stringify(items).length;
    const optimizedSize = JSON.stringify(batches).length;

    return {
      data: batches,
      optimized: batches.length > 1,
      originalSize,
      optimizedSize,
      estimatedTokens: Math.max(...batches.map(batch => 
        this.estimateTokens(JSON.stringify(batch))
      )),
      truncated: false,
      batchCount: batches.length
    };
  }

  /**
   * Smart field selection based on token budget
   */
  optimizeFieldSelection(
    includeFields?: string[],
    maxTokens?: number,
    itemCount: number = 1
  ): { 
    optimizedFields: string[];
    previewLength?: number;
    maxDepth: number;
  } {
    const targetTokens = maxTokens || this.defaultLimits.maxOutputTokens;
    const tokensPerItem = Math.floor(targetTokens / itemCount);
    
    // Base fields (always include)
    const baseFields = ['id', 'name'];
    
    // Optional fields in order of priority
    const optionalFields = ['isCompleted', 'note', 'items'];
    
    let selectedFields = [...baseFields];
    let previewLength: number | undefined;
    let maxDepth = 0;
    
    // Add fields based on available token budget
    if (tokensPerItem > 50) { // Very tight budget
      selectedFields.push('isCompleted');
      previewLength = 100;
    }
    
    if (tokensPerItem > 200) { // Moderate budget
      selectedFields.push('note');
      previewLength = 250;
    }
    
    if (tokensPerItem > 500) { // Good budget
      selectedFields.push('items');
      maxDepth = 1;
      previewLength = 500;
    }
    
    if (tokensPerItem > 1000) { // Large budget
      maxDepth = 2;
      previewLength = 1000;
    }
    
    if (tokensPerItem > 2000) { // Very large budget
      maxDepth = 3;
      previewLength = undefined; // No truncation
    }
    
    // Use provided fields if specified, but respect token budget
    if (includeFields && includeFields.length > 0) {
      selectedFields = includeFields.filter(field => 
        baseFields.includes(field) || tokensPerItem > 200
      );
    }
    
    return {
      optimizedFields: selectedFields,
      previewLength,
      maxDepth
    };
  }

  /**
   * Get optimization recommendations based on usage patterns
   */
  getRecommendations(stats: {
    averageResponseSize: number;
    maxResponseSize: number;
    totalRequests: number;
    cacheHitRate: number;
  }): string[] {
    const recommendations: string[] = [];
    
    const avgTokens = this.estimateTokens(stats.averageResponseSize.toString());
    const maxTokens = this.estimateTokens(stats.maxResponseSize.toString());
    
    if (avgTokens > this.defaultLimits.maxOutputTokens * 0.7) {
      recommendations.push('Consider using smaller maxDepth values in search/list operations');
    }
    
    if (maxTokens > this.defaultLimits.maxOutputTokens) {
      recommendations.push('Enable previewLength parameter to truncate large text fields');
    }
    
    if (stats.cacheHitRate < 0.3) {
      recommendations.push('Similar queries detected - consider using more consistent search parameters');
    }
    
    if (stats.totalRequests > 100 && stats.averageResponseSize > 10000) {
      recommendations.push('High token usage detected - consider implementing request batching');
    }
    
    return recommendations;
  }
}

export const tokenOptimizer = new TokenOptimizer();