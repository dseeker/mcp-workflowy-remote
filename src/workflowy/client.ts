import { WorkFlowy, Client } from 'workflowy';
import log from '../utils/logger.js';
import { retryManager, RetryPresets } from '../utils/retry.js';
import { createLogger } from '../utils/structured-logger.js';

// Enhanced error types for better error handling
export class WorkflowyError extends Error {
  retryable: boolean;
  overloaded: boolean;
  code?: string;
  status?: number;

  constructor(message: string, options: { 
    retryable?: boolean; 
    overloaded?: boolean; 
    code?: string; 
    status?: number; 
    cause?: Error 
  } = {}) {
    super(message);
    this.name = 'WorkflowyError';
    this.retryable = options.retryable ?? true;
    this.overloaded = options.overloaded ?? false;
    this.code = options.code;
    this.status = options.status;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class AuthenticationError extends WorkflowyError {
  constructor(message: string, cause?: Error) {
    super(message, { retryable: false, code: 'AUTH_FAILED', cause });
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends WorkflowyError {
  constructor(message: string, cause?: Error) {
    super(message, { retryable: true, code: 'NETWORK_ERROR', cause });
    this.name = 'NetworkError';
  }
}

export class NotFoundError extends WorkflowyError {
  constructor(message: string, nodeId?: string) {
    super(message, { retryable: false, code: 'NOT_FOUND' });
    this.name = 'NotFoundError';
  }
}

export class OverloadError extends WorkflowyError {
  constructor(message: string) {
    super(message, { retryable: false, overloaded: true, code: 'OVERLOADED' });
    this.name = 'OverloadError';
  }
}

class WorkflowyClient {
    private structuredLogger = createLogger({});

    /**
     * Create authenticated Workflowy client instance with retry logic
     * @private Helper method to create and authenticate a Workflowy client
     */
    private async createAuthenticatedClient(username?: string, password?: string): Promise<{wf: WorkFlowy, client: Client}> {
        return retryManager.withRetry(async () => {
            const startTime = Date.now();
            
            // Use parameters if provided, otherwise fall back to config
            const loginUsername = username || process.env.WORKFLOWY_USERNAME;
            const loginPassword = password || process.env.WORKFLOWY_PASSWORD;

            this.structuredLogger.debug('Creating authenticated client', { 
                username: loginUsername ? '[PROVIDED]' : '[NOT_PROVIDED]' 
            });

            if (!loginUsername || !loginPassword) {
                this.structuredLogger.error('Workflowy credentials not provided');
                throw new AuthenticationError('Workflowy credentials not provided. Please set WORKFLOWY_USERNAME and WORKFLOWY_PASSWORD environment variables.');
            }

            try {
                // Create a new Workflowy client instance
                const wf = new WorkFlowy(loginUsername, loginPassword);
                const client = wf.getClient();
                
                this.structuredLogger.debug('Attempting Workflowy authentication', { username: loginUsername });
                const ok = await client.login();
                const authTime = Date.now() - startTime;

                if (!ok.success) {
                    this.structuredLogger.error('Workflowy authentication failed', undefined, { 
                        username: loginUsername, 
                        duration: authTime 
                    });
                    throw new AuthenticationError('Workflowy authentication failed. Please provide valid credentials.');
                }

                this.structuredLogger.performance('authentication', authTime, { success: true });
                return { wf, client };
                
            } catch (error: any) {
                const authTime = Date.now() - startTime;
                
                // Enhanced error classification
                if (error instanceof AuthenticationError) {
                    throw error;
                }
                
                // Network-related errors should be retryable
                if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || 
                    error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
                    throw new NetworkError(`Network error during authentication: ${error.message}`, error);
                }
                
                // Rate limiting or server overload
                if (error.status === 429 || error.status === 503) {
                    throw new OverloadError(`Workflowy server overloaded: ${error.message}`);
                }
                
                // Default to authentication error for unknown issues
                throw new AuthenticationError(`Authentication failed: ${error.message}`, error);
            }
        }, RetryPresets.QUICK);
    }

    /**
     * Get the root nodes of the Workflowy document with retry logic
     */
    async getRootItems(username?: string, password?: string, maxDepth: number = 0, includeFields?: string[], previewLength?: number) {
        return retryManager.withRetry(async () => {
            const startTime = Date.now();
            const { wf, client } = await this.createAuthenticatedClient(username, password);
            
            try {
                const doc = await wf.getDocument();
                client.getTreeData();
                
                // Apply filtering (always filter now, with defaults if not specified)
                const rootData = doc.root.toJson();
                const rootItems = rootData.items || [];
                
                const result = rootItems.map(item => this.createFilteredNode(item, maxDepth, includeFields, 0, previewLength));
                
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('getRootItems', duration, true, {
                    itemCount: result.length,
                    maxDepth,
                    includeFields: includeFields?.join(','),
                    previewLength
                });
                
                return result;
            } catch (error: any) {
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('getRootItems', duration, false, { error: error.message });
                throw this.enhanceError(error, 'getRootItems');
            }
        }, RetryPresets.STANDARD);
    }

    /**
     * Get the child nodes of a specific node with retry logic
     */
    async getChildItems(parentId: string, username?: string, password?: string, maxDepth: number = 0, includeFields?: string[], previewLength?: number) {
        return retryManager.withRetry(async () => {
            const startTime = Date.now();
            const {wf, client } = await this.createAuthenticatedClient(username, password);
            
            try {
                let doc = await wf.getDocument();
                const parent = doc.root.items.find(item => item.id === parentId);
                
                if (!parent) {
                    throw new NotFoundError(`Parent node with ID ${parentId} not found.`, parentId);
                }
                
                // Apply filtering (always filter now, with defaults if not specified)
                const result = parent.items.map(item => this.createFilteredNode(item.toJson(), maxDepth, includeFields, 0, previewLength));
                
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('getChildItems', duration, true, {
                    parentId,
                    itemCount: result.length,
                    maxDepth,
                    includeFields: includeFields?.join(','),
                    previewLength
                });
                
                return result;
            } catch (error: any) {
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('getChildItems', duration, false, { 
                    parentId,
                    error: error.message 
                });
                throw this.enhanceError(error, 'getChildItems');
            }
        }, RetryPresets.STANDARD);
    }

    /**
     * Create filtered node JSON with depth and field control
     */
    private createFilteredNode(node: any, maxDepth: number = 0, includeFields?: string[], currentDepth: number = 0, previewLength?: number): any {
        const defaultFields = ['id', 'name', 'note', 'isCompleted'];
        const fieldsToInclude = includeFields || defaultFields;
        
        const filtered: any = {};
        
        // Include requested fields
        fieldsToInclude.forEach(field => {
            if (field in node && field !== 'items') {
                let value = node[field];
                
                // Apply content truncation for string fields if previewLength is specified
                if (previewLength && typeof value === 'string' && (field === 'name' || field === 'note')) {
                    value = value.length > previewLength ? value.substring(0, previewLength) + '...' : value;
                }
                
                filtered[field] = value;
            }
        });
        
        // Handle children based on depth
        if (maxDepth > currentDepth && node.items && node.items.length > 0) {
            filtered.items = node.items.map((child: any) => 
                this.createFilteredNode(child, maxDepth, includeFields, currentDepth + 1, previewLength)
            );
        } else {
            filtered.items = [];
        }
        
        return filtered;
    }

    /**
     * Search for nodes in Workflowy with depth and field control and retry logic
     */
    async search(query: string, username?: string, password?: string, limit?: number, maxDepth?: number, includeFields?: string[], previewLength?: number) {
        return retryManager.withRetry(async () => {
            const startTime = Date.now();
            const maxResults = limit || 10;
            const depth = maxDepth ?? 0;
            
            const { wf } = await this.createAuthenticatedClient(username, password);
            
            try {
                const t = await wf.getDocument();
                
                const items = t.root.items;
                let results = [];
                let stack = [...t.root.items];
                let nodesExamined = 0;
                
                while (stack.length > 0 && results.length < maxResults) {
                    const current = stack.pop();
                    nodesExamined++;
                    
                    if (current!.name.toLowerCase().includes(query.toLowerCase())) {
                        // Create filtered node with depth and field control
                        const fullNode = current!.toJson();
                        const nodeJson = this.createFilteredNode(fullNode, depth, includeFields, 0, previewLength);
                        results.push(nodeJson);
                    }
                    if (current!.items && results.length < maxResults) {
                        stack.push(...current!.items);
                    }
                }

                const searchTime = Date.now() - startTime;
                const resultSize = JSON.stringify(results).length;
                
                // Check for token limit issues
                const estimatedTokens = Math.ceil(resultSize / 4); // Rough estimate: 4 chars per token
                if (estimatedTokens > 20000) {
                    this.structuredLogger.warn('Large search result detected', {
                        query,
                        estimatedTokens,
                        resultCount: results.length,
                        resultSize
                    });
                }

                this.structuredLogger.workflowyApi('search', searchTime, true, {
                    query,
                    resultCount: results.length,
                    nodesExamined,
                    estimatedTokens,
                    maxResults,
                    depth
                });

                return results;
            } catch (error: any) {
                const searchTime = Date.now() - startTime;
                this.structuredLogger.workflowyApi('search', searchTime, false, { 
                    query,
                    error: error.message 
                });
                throw this.enhanceError(error, 'search');
            }
        }, RetryPresets.STANDARD);
    }

    /**
     * Create a new node at a specific location with retry logic
     */
    async createNode(parentId: string, name: string, description?: string, username?: string, password?: string) {
        return retryManager.withRetry(async () => {
            const startTime = Date.now();
            const { wf } = await this.createAuthenticatedClient(username, password);
            
            try {
                const doc = await wf.getDocument();
                const parent = doc.root.items.find(item => item.id === parentId);
                
                if (!parent) {
                    throw new NotFoundError(`Parent node with ID ${parentId} not found.`, parentId);
                }

                const newNode = await parent.createItem();
                newNode.setName(name);
                if (description) {
                    newNode.setNote(description);
                }
                
                if (doc.isDirty()) {
                    await doc.save();
                }
                
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('createNode', duration, true, {
                    parentId,
                    name: name.substring(0, 50) + (name.length > 50 ? '...' : ''),
                    hasDescription: !!description
                });
                
                return newNode.id; // Return the new node ID
            } catch (error: any) {
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('createNode', duration, false, { 
                    parentId,
                    error: error.message 
                });
                throw this.enhanceError(error, 'createNode');
            }
        }, RetryPresets.WRITE);
    }

    /**
     * Update an existing node with retry logic
     */
    async updateNode(nodeId: string, name?: string, description?: string, username?: string, password?: string) {
        return retryManager.withRetry(async () => {
            const startTime = Date.now();
            const { wf } = await this.createAuthenticatedClient(username, password);
            
            try {
                const doc = await wf.getDocument();
                const node = this.findNodeById(doc.root.items, nodeId);
                
                if (!node) {
                    throw new NotFoundError(`Node with ID ${nodeId} not found.`, nodeId);
                }

                if (name !== undefined) {
                    node.setName(name);
                }
                if (description !== undefined) {
                    node.setNote(description);
                }
                
                if (doc.isDirty()) {
                    await doc.save();
                }
                
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('updateNode', duration, true, {
                    nodeId,
                    hasNameUpdate: name !== undefined,
                    hasDescriptionUpdate: description !== undefined
                });
                
            } catch (error: any) {
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('updateNode', duration, false, { 
                    nodeId,
                    error: error.message 
                });
                throw this.enhanceError(error, 'updateNode');
            }
        }, RetryPresets.WRITE);
    }

    /**
     * Delete a node with retry logic
     */
    async deleteNode(nodeId: string, username?: string, password?: string) {
        return retryManager.withRetry(async () => {
            const startTime = Date.now();
            const { wf } = await this.createAuthenticatedClient(username, password);
            
            try {
                const doc = await wf.getDocument();
                const node = this.findNodeById(doc.root.items, nodeId);
                
                if (!node) {
                    throw new NotFoundError(`Node with ID ${nodeId} not found.`, nodeId);
                }

                await node.delete();
                
                if (doc.isDirty()) {
                    await doc.save();
                }
                
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('deleteNode', duration, true, { nodeId });
                
            } catch (error: any) {
                const duration = Date.now() - startTime;
                this.structuredLogger.workflowyApi('deleteNode', duration, false, { 
                    nodeId,
                    error: error.message 
                });
                throw this.enhanceError(error, 'deleteNode');
            }
        }, RetryPresets.WRITE);
    }

    /**
     * Complete/uncomplete a node
     */
    async toggleComplete(nodeId: string, completed: boolean, username?: string, password?: string) {
        const { wf } = await this.createAuthenticatedClient(username, password);
        const doc = await wf.getDocument();
        const node = this.findNodeById(doc.root.items, nodeId);
        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found.`);
        }

        if (completed) {
            await node.setCompleted();
        } else {
            await node.setCompleted(false);
        }

        if (doc.isDirty()) {
            // Saves the changes if there are any
            await doc.save();
        }
    }

    /**
     * Move a node to a different parent with optional priority
     */
    async moveNode(nodeId: string, newParentId: string, priority?: number, username?: string, password?: string) {
        const { wf } = await this.createAuthenticatedClient(username, password);
        const doc = await wf.getDocument();
        
        // Find the node to move
        const node = this.findNodeById(doc.root.items, nodeId);
        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found.`);
        }

        // Find the new parent
        const newParent = this.findNodeById(doc.root.items, newParentId);
        if (!newParent) {
            throw new Error(`Target parent node with ID ${newParentId} not found.`);
        }

        // Move the node using the Workflowy API
        await node.move(newParent, priority);

        if (doc.isDirty()) {
            // Saves the changes if there are any
            await doc.save();
        }
    }

    /**
     * Get a single node by its ID
     */
    async getNodeById(nodeId: string, username?: string, password?: string, maxDepth: number = 0, includeFields?: string[], previewLength?: number) {
        const { wf } = await this.createAuthenticatedClient(username, password);
        const doc = await wf.getDocument();
        
        // Find the node
        const node = this.findNodeById(doc.root.items, nodeId);
        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found.`);
        }

        // Convert to JSON and apply filtering
        const nodeJson = node.toJson();
        return this.createFilteredNode(nodeJson, maxDepth, includeFields, 0, previewLength);
    }

    /**
     * Helper method to recursively find a node by ID
     */
    private findNodeById(items: any[], nodeId: string): any {
        for (const item of items) {
            if (item.id === nodeId) {
                return item;
            }
            if (item.items && item.items.length > 0) {
                const found = this.findNodeById(item.items, nodeId);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    /**
     * Enhance errors with better classification and retry information
     */
    private enhanceError(error: any, operation: string): WorkflowyError {
        // If already enhanced, return as-is
        if (error instanceof WorkflowyError) {
            return error;
        }

        // Network-related errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' ||
            error.name === 'NetworkError') {
            return new NetworkError(`Network error in ${operation}: ${error.message}`, error);
        }

        // Server overload errors
        if (error.status === 429 || error.status === 503 || 
            error.message?.includes('rate limit') || error.message?.includes('overload')) {
            return new OverloadError(`Service overloaded during ${operation}: ${error.message}`);
        }

        // Authentication errors
        if (error.status === 401 || error.status === 403 || 
            error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
            return new AuthenticationError(`Authentication failed during ${operation}: ${error.message}`, error);
        }

        // Not found errors
        if (error.status === 404 || error.message?.includes('not found')) {
            return new NotFoundError(`Resource not found during ${operation}: ${error.message}`);
        }

        // Default to generic Workflowy error
        return new WorkflowyError(`Error in ${operation}: ${error.message}`, {
            retryable: true,
            code: 'UNKNOWN_ERROR',
            cause: error
        });
    }

    /**
     * Check if Workflowy service is available (graceful degradation)
     */
    async checkServiceHealth(username?: string, password?: string): Promise<{
        available: boolean;
        responseTime?: number;
        error?: string;
    }> {
        try {
            const startTime = Date.now();
            await this.createAuthenticatedClient(username, password);
            const responseTime = Date.now() - startTime;
            
            return {
                available: true,
                responseTime
            };
        } catch (error: any) {
            return {
                available: false,
                error: error.message
            };
        }
    }
}

// Export a singleton instance - still a singleton but methods are stateless
export const workflowyClient = new WorkflowyClient();