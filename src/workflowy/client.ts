import { WorkFlowy, Client } from 'workflowy';
import log from '../utils/logger.js';

class WorkflowyClient {
    /**
     * Create authenticated Workflowy client instance
     * @private Helper method to create and authenticate a Workflowy client
     */
    private async createAuthenticatedClient(username?: string, password?: string): Promise<{wf: WorkFlowy, client: Client}> {
        const startTime = Date.now();
        
        // Use parameters if provided, otherwise fall back to config
        const loginUsername = username || process.env.WORKFLOWY_USERNAME;
        const loginPassword = password || process.env.WORKFLOWY_PASSWORD;

        log.debug('Creating authenticated client', { username: loginUsername ? '[PROVIDED]' : '[NOT_PROVIDED]' });

        if (!loginUsername || !loginPassword) {
            log.error('Workflowy credentials not provided');
            throw new Error('Workflowy credentials not provided. Please set WORKFLOWY_USERNAME and WORKFLOWY_PASSWORD environment variables.');
        }

        // Create a new Workflowy client instance
        const wf = new WorkFlowy(loginUsername, loginPassword);
        const client = wf.getClient();
        
        log.workflowyRequest('authentication', { username: loginUsername });
        const ok = await client.login();
        const authTime = Date.now() - startTime;

        if (!ok.success) {
            log.error('Workflowy authentication failed', null, { username: loginUsername, duration: authTime });
            throw new Error('Workflowy authentication failed. Please provide valid credentials.');
        }

        log.performance('authentication', authTime, { success: true });

        return { wf, client };
    }

    /**
     * Get the root nodes of the Workflowy document
     */
    async getRootItems(username?: string, password?: string, maxDepth: number = 0, includeFields?: string[], previewLength?: number) {
        const { wf, client } = await this.createAuthenticatedClient(username, password);
        const doc = await wf.getDocument();
        client.getTreeData()
        
        // Apply filtering (always filter now, with defaults if not specified)
        const rootData = doc.root.toJson();
        const rootItems = rootData.items || [];
        
        return rootItems.map(item => this.createFilteredNode(item, maxDepth, includeFields, 0, previewLength));
    }

    /**
     * Get the child nodes of a specific node
     */
    async getChildItems(parentId: string, username?: string, password?: string, maxDepth: number = 0, includeFields?: string[], previewLength?: number) {
        const {wf, client } = await this.createAuthenticatedClient(username, password);
        let doc = await wf.getDocument();
        const parent = doc.root.items.find(item => item.id === parentId);
        if (!parent) {
            throw new Error(`Parent node with ID ${parentId} not found.`);
        }
        
        // Apply filtering (always filter now, with defaults if not specified)
        return parent.items.map(item => this.createFilteredNode(item.toJson(), maxDepth, includeFields, 0, previewLength));
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
     * Search for nodes in Workflowy with depth and field control
     */
    async search(query: string, username?: string, password?: string, limit?: number, maxDepth?: number, includeFields?: string[], previewLength?: number) {
        const startTime = Date.now();
        const maxResults = limit || 10;
        
        const depth = maxDepth ?? 0;
        
        const { wf } = await this.createAuthenticatedClient(username, password);
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
            console.warn(`Token limit warning: search estimated ${estimatedTokens} tokens`);
        }

        return results
    }

    /**
     * Create a new node at a specific location
     */
    async createNode(parentId: string, name: string, description?: string, username?: string, password?: string) {
        const { wf } = await this.createAuthenticatedClient(username, password);
        const doc = await wf.getDocument();
        const parent = doc.root.items.find(item => item.id === parentId);
        if (!parent) {
            throw new Error(`Parent node with ID ${parentId} not found.`);
        }

        const newNode = await parent.createItem();
        newNode.setName(name);
        if (description) {
            newNode.setNote(description);
        }
        if (doc.isDirty()) {
            // Saves the changes if there are any
            await doc.save();
        }
    }

    /**
     * Update an existing node
     */
    async updateNode(nodeId: string, name?: string, description?: string, username?: string, password?: string) {
        const { wf } = await this.createAuthenticatedClient(username, password);
        const doc = await wf.getDocument();
        const node = doc.root.items.find(item => item.id === nodeId);
        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found.`);
        }

        if (name !== undefined) {
            node.setName(name);
        }
        if (description !== undefined) {
            node.setNote(description);
        }
        if (doc.isDirty()) {
            // Saves the changes if there are any
            await doc.save();
        }
    }

    /**
     * Delete a node
     */
    async deleteNode(nodeId: string, username?: string, password?: string) {
        const { wf } = await this.createAuthenticatedClient(username, password);
        const doc = await wf.getDocument();
        const node = doc.root.items.find(item => item.id === nodeId);
        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found.`);
        }

        await node.delete();
        if (doc.isDirty()) {
            // Saves the changes if there are any
            await doc.save();
        }
    }

    /**
     * Complete/uncomplete a node
     */
    async toggleComplete(nodeId: string, completed: boolean, username?: string, password?: string) {
        const { wf } = await this.createAuthenticatedClient(username, password);
        const doc = await wf.getDocument();
        const node = doc.root.items.find(item => item.id === nodeId);
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
}

// Export a singleton instance - still a singleton but methods are stateless
export const workflowyClient = new WorkflowyClient();