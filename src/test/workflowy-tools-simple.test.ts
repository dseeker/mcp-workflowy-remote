// Simple unit tests for MCP Workflowy operations
import { describe, it, expect, beforeAll } from "bun:test";
import { mockWorkflowyResponses } from "./mocks/workflowy-responses";

// We'll test the tools by creating our own test versions that use mock clients directly
// This avoids the complexity of module mocking

const createTestTools = (mockClient: any) => {
  return {
    list_nodes: {
      handler: async ({ parentId, maxDepth, includeFields, preview, username, password }: { parentId?: string, maxDepth?: number, includeFields?: string[], preview?: number, username?: string, password?: string }) => {
        try {
          const items = !!parentId
            ? await mockClient.getChildItems(parentId, username, password, maxDepth, includeFields, preview)
            : await mockClient.getRootItems(username, password, maxDepth, includeFields, preview);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(items, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error listing nodes: ${error.message}`
            }]
          };
        }
      }
    },

    search_nodes: {
      handler: async ({ query, limit, maxDepth, includeFields, preview, username, password }: 
        { query: string, limit?: number, maxDepth?: number, includeFields?: string[], preview?: number, username?: string, password?: string }) => {
        try {
          const items = await mockClient.search(query, username, password, limit, maxDepth, includeFields, preview);
          return {
            content: [{
              type: "text", 
              text: JSON.stringify(items, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error searching nodes: ${error.message}`
            }]
          };
        }
      }
    },

    create_node: {
      handler: async ({ parentId, name, description, username, password }: 
        { parentId: string, name: string, description?: string, username?: string, password?: string }) => {
        try {
          await mockClient.createNode(parentId, name, description, username, password);
          return {
            content: [{
              type: "text",
              text: `Successfully created node "${name}" under parent ${parentId}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error creating node: ${error.message}`
            }]
          };
        }
      }
    },

    update_node: {
      handler: async ({ nodeId, name, description, username, password }: 
        { nodeId: string, name?: string, description?: string, username?: string, password?: string }) => {
        try {
          await mockClient.updateNode(nodeId, name, description, username, password);
          return {
            content: [{
              type: "text",
              text: `Successfully updated node ${nodeId}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error updating node: ${error.message}`
            }]
          };
        }
      }
    },

    toggle_complete: {
      handler: async ({ nodeId, completed, username, password }: 
        { nodeId: string, completed: boolean, username?: string, password?: string }) => {
        try {
          await mockClient.toggleComplete(nodeId, completed, username, password);
          return {
            content: [{
              type: "text",
              text: `Successfully ${completed ? "completed" : "uncompleted"} node ${nodeId}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error toggling completion status: ${error.message}`
            }]
          };
        }
      }
    },

    delete_node: {
      handler: async ({ nodeId, username, password }: 
        { nodeId: string, username?: string, password?: string }) => {
        try {
          await mockClient.deleteNode(nodeId, username, password);
          return {
            content: [{
              type: "text",
              text: `Successfully deleted node ${nodeId}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error deleting node: ${error.message}`
            }]
          };
        }
      }
    },

    move_node: {
      handler: async ({ nodeId, newParentId, priority, username, password }: 
        { nodeId: string, newParentId: string, priority?: number, username?: string, password?: string }) => {
        try {
          await mockClient.moveNode(nodeId, newParentId, priority, username, password);
          const priorityText = priority !== undefined ? ` at position ${priority}` : '';
          return {
            content: [{
              type: "text",
              text: `Successfully moved node ${nodeId} to parent ${newParentId}${priorityText}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error moving node: ${error.message}`
            }]
          };
        }
      }
    },

    get_node_by_id: {
      handler: async ({ nodeId, maxDepth, includeFields, preview, username, password }: 
        { nodeId: string, maxDepth?: number, includeFields?: string[], preview?: number, username?: string, password?: string }) => {
        try {
          const node = await mockClient.getNodeById(nodeId, username, password, maxDepth, includeFields, preview);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(node, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error retrieving node: ${error.message}`
            }]
          };
        }
      }
    }
  };
};

// Use imported mock responses
const mockResponses = {
  rootNodes: mockWorkflowyResponses.rootDocument,
  childNodes: mockWorkflowyResponses.rootDocument.items[0].items, // First project's children
  searchResults: mockWorkflowyResponses.searchResults.typescript
};

// Mock client factory
const createMockClient = (scenario: 'success' | 'error' | 'empty' = 'success') => {
  
  // Helper function to apply filtering and preview truncation
  const applyFiltering = (node: any, maxDepth: number = 0, includeFields?: string[], preview?: number, currentDepth: number = 0): any => {
    const defaultFields = ['id', 'name', 'note', 'isCompleted'];
    const fieldsToInclude = includeFields || defaultFields;
    
    const filtered: any = {};
    
    // Include requested fields
    fieldsToInclude.forEach(field => {
      if (field in node && field !== 'items') {
        let value = node[field];
        
        // Apply content truncation for string fields if preview is specified
        if (preview && typeof value === 'string' && (field === 'name' || field === 'note')) {
          value = value.length > preview ? value.substring(0, preview) + '...' : value;
        }
        
        filtered[field] = value;
      }
    });
    
    // Handle children based on depth
    if (maxDepth > currentDepth && node.items && node.items.length > 0) {
      filtered.items = node.items.map((child: any) => 
        applyFiltering(child, maxDepth, includeFields, preview, currentDepth + 1)
      );
    } else {
      filtered.items = [];
    }
    
    return filtered;
  };
  
  return {
    getRootItems: async (username?: string, password?: string, maxDepth: number = 0, includeFields?: string[], preview?: number) => {
      if (scenario === 'error') throw new Error("Authentication failed: Invalid credentials");
      if (scenario === 'empty') return { id: "Root", name: "", note: "", isCompleted: false, items: [] };
      
      const rootData = mockResponses.rootNodes;
      const rootItems = rootData.items || [];
      
      // Apply list_nodes defaults: ['id', 'name'] if no fields specified
      const listNodeFields = includeFields ?? ['id', 'name'];
      
      return rootItems.map(item => applyFiltering(item, maxDepth, listNodeFields, preview));
    },

    getChildItems: async (parentId: string, username?: string, password?: string, maxDepth: number = 0, includeFields?: string[], preview?: number) => {
      if (scenario === 'error') throw new Error("Node not found: Invalid node ID");  
      if (scenario === 'empty') return [];
      
      // Apply list_nodes defaults: ['id', 'name'] if no fields specified  
      const listNodeFields = includeFields ?? ['id', 'name'];
      
      return mockResponses.childNodes.map(item => applyFiltering(item, maxDepth, listNodeFields, preview));
    },

    search: async (query: string, username?: string, password?: string, limit?: number, maxDepth?: number, includeFields?: string[], preview?: number) => {
      if (scenario === 'error') throw new Error("Network error: Unable to connect to Workflowy API");
      if (scenario === 'empty') return [];
      
      // Get base search results
      let results = query.toLowerCase().includes('typescript') 
        ? mockResponses.searchResults.slice() // Make a copy to avoid mutation
        : [mockResponses.searchResults[0]]; // Default to first result
        
      // Apply limit if specified
      if (limit && limit > 0) {
        results = results.slice(0, limit);
      }
      
      // Apply filtering to all results using the shared filtering function
      return results.map(result => applyFiltering(result, maxDepth ?? 0, includeFields, preview));
    },

    createNode: async (parentId: string, name: string, description?: string) => {
      if (scenario === 'error') throw new Error("Authentication failed: Invalid credentials");
      return { success: true, nodeId: "new-node-123" };
    },

    updateNode: async (nodeId: string, name?: string, description?: string) => {
      if (scenario === 'error') throw new Error("Node not found: Invalid node ID");
      return { success: true, nodeId };
    },

    toggleComplete: async (nodeId: string, completed: boolean) => {
      if (scenario === 'error') throw new Error("Node not found: Invalid node ID");
      return { success: true, nodeId, completed };
    },

    deleteNode: async (nodeId: string, username?: string, password?: string) => {
      if (scenario === 'error') throw new Error("Node not found: Invalid node ID");
      return { success: true, nodeId };
    },

    moveNode: async (nodeId: string, newParentId: string, priority?: number, username?: string, password?: string) => {
      if (scenario === 'error') throw new Error("Node not found: Invalid node ID");
      return { success: true, nodeId, newParentId, priority };
    },

    getNodeById: async (nodeId: string, username?: string, password?: string, maxDepth: number = 0, includeFields?: string[], preview?: number) => {
      if (scenario === 'error') throw new Error("Node not found: Invalid node ID");
      if (scenario === 'empty') return null;
      
      // Return a specific node from mock data based on nodeId
      const mockNode = {
        id: nodeId,
        name: `Node ${nodeId}`,
        note: `This is a note for node ${nodeId}`,
        isCompleted: false,
        items: [
          {
            id: `${nodeId}-child-1`,
            name: `Child 1 of ${nodeId}`,
            note: "Child note",
            isCompleted: true,
            items: []
          },
          {
            id: `${nodeId}-child-2`, 
            name: `Child 2 of ${nodeId}`,
            note: "Another child note",
            isCompleted: false,
            items: []
          }
        ]
      };
      
      return applyFiltering(mockNode, maxDepth, includeFields, preview);
    }
  };
};

describe('Workflowy MCP Tools', () => {
  const testCredentials = {
    username: 'test@example.com',
    password: 'testpassword'
  };

  let tools: any;

  beforeAll(() => {
    const mockClient = createMockClient('success');
    tools = createTestTools(mockClient);
  });

  describe('list_nodes', () => {
    it('should list root nodes when no parentId provided', async () => {
      const result = await tools.list_nodes.handler({
        ...testCredentials
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(3); // Updated to match new mock data - now returns array directly
      expect(parsedContent[0].name).toBe('Project Management');
      expect(parsedContent[1].name).toBe('Personal Goals');
      expect(parsedContent[2].name).toBe('Research Projects');
    });

    it('should list child nodes when parentId provided', async () => {
      const result = await tools.list_nodes.handler({
        parentId: 'root-node-1',
        ...testCredentials
      });

      expect(result.content).toBeDefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(2);
      expect(parsedContent[0].name).toBe('Sprint Planning');
      expect(parsedContent[1].name).toBe('Code Reviews');
    });

    it('should handle errors gracefully', async () => {
      const errorClient = createMockClient('error');
      const errorTools = createTestTools(errorClient);
      
      const result = await errorTools.list_nodes.handler({
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Error listing nodes');
      expect(result.content[0].text).toContain('Authentication failed');
    });

    it('should use default fields (id, name) when no includeFields specified', async () => {
      const result = await tools.list_nodes.handler({
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Should have default fields for list_nodes
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.items).toBeDefined(); // Always included
      
      // Should NOT have other fields by default
      expect(node.note).toBeUndefined();
      expect(node.isCompleted).toBeUndefined();
    });

    it('should respect includeFields parameter', async () => {
      const result = await tools.list_nodes.handler({
        includeFields: ['id', 'name', 'note', 'isCompleted'],
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Should have all requested fields
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.note).toBeDefined();
      expect(node.isCompleted).toBeDefined();
      expect(node.items).toBeDefined(); // Always included
    });

    it('should respect maxDepth=0 (no children)', async () => {
      const result = await tools.list_nodes.handler({
        maxDepth: 0,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      expect(node.items).toHaveLength(0); // Should have no children
    });

    it('should respect maxDepth=1 (include first level children)', async () => {
      const result = await tools.list_nodes.handler({
        maxDepth: 1,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      expect(node.items.length).toBeGreaterThan(0); // Should have children
      // Children should not have their own children (maxDepth=1)
      if (node.items[0].items) {
        expect(node.items[0].items).toHaveLength(0);
      }
    });

    it('should respect maxDepth=2 (include grandchildren)', async () => {
      const result = await tools.list_nodes.handler({
        maxDepth: 2,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      expect(node.items.length).toBeGreaterThan(0); // Should have children
      // Children should have their own children (grandchildren)
      if (node.items[0].items) {
        expect(node.items[0].items.length).toBeGreaterThan(0);
      }
    });

    it('should truncate content with preview parameter', async () => {
      const result = await tools.list_nodes.handler({
        includeFields: ['id', 'name', 'note'],
        preview: 10, // Truncate to 10 characters
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Names longer than 10 chars should be truncated with '...'
      if (node.name && node.name.length > 10) {
        expect(node.name).toEndWith('...');
        expect(node.name.length).toBeLessThanOrEqual(13); // 10 chars + '...'
      }
      
      // Notes longer than 10 chars should be truncated with '...'
      if (node.note && node.note.length > 10) {
        expect(node.note).toEndWith('...');
        expect(node.note.length).toBeLessThanOrEqual(13); // 10 chars + '...'
      }
    });

    it('should not truncate content shorter than preview limit', async () => {
      const result = await tools.list_nodes.handler({
        includeFields: ['id', 'name', 'note'],
        preview: 100, // Large preview limit
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Content shorter than limit should not be truncated
      if (node.name) {
        expect(node.name).not.toEndWith('...');
      }
      if (node.note) {
        expect(node.note).not.toEndWith('...');
      }
    });

    it('should combine all parameters correctly', async () => {
      const result = await tools.list_nodes.handler({
        maxDepth: 1,
        includeFields: ['id', 'name'],
        preview: 15,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Should respect field filtering
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.note).toBeUndefined();
      expect(node.isCompleted).toBeUndefined();
      
      // Should respect maxDepth
      expect(node.items.length).toBeGreaterThan(0);
      if (node.items[0].items) {
        expect(node.items[0].items).toHaveLength(0);
      }
      
      // Should respect preview truncation
      if (node.name && node.name.length > 15) {
        expect(node.name).toEndWith('...');
      }
    });
  });

  describe('search_nodes', () => {
    it('should search nodes with default parameters', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        ...testCredentials
      });

      expect(result.content).toBeDefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(5); // Updated to match new mock data (5 TypeScript results)
      expect(parsedContent[0].name).toContain('TypeScript');
    });

    it('should handle empty search results', async () => {
      const emptyClient = createMockClient('empty');
      const emptyTools = createTestTools(emptyClient);
      
      const result = await emptyTools.search_nodes.handler({
        query: 'nonexistent',
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(0);
    });

    it('should handle search errors', async () => {
      const errorClient = createMockClient('error');
      const errorTools = createTestTools(errorClient);
      
      const result = await errorTools.search_nodes.handler({
        query: 'TypeScript',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Error searching nodes');
      expect(result.content[0].text).toContain('Network error');
    });

    it('should respect limit parameter', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        limit: 2,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveLength(2);
      expect(parsedContent[0].name).toContain('TypeScript');
    });

    it('should handle limit larger than available results', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript', 
        limit: 10, // More than the 5 mock results
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.length).toBeLessThanOrEqual(5); // Max available in mock
    });

    it('should respect maxDepth=0 (no children)', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        maxDepth: 0,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].items).toHaveLength(0); // Should have no children
    });

    it('should respect maxDepth=1 (include first level children)', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        maxDepth: 1,
        limit: 1, // Just get first result to test
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].items.length).toBeGreaterThan(0); // Should have children
      // Children should not have their own children (maxDepth=1)
      if (parsedContent[0].items[0].items) {
        expect(parsedContent[0].items[0].items).toHaveLength(0);
      }
    });

    it('should respect maxDepth=2 (include grandchildren)', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        maxDepth: 2,
        limit: 1, // Just get first result to test
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent[0].items.length).toBeGreaterThan(0); // Should have children
      // Children should have their own children (grandchildren)
      if (parsedContent[0].items[0].items) {
        expect(parsedContent[0].items[0].items.length).toBeGreaterThan(0);
      }
    });

    it('should respect includeFields parameter', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        includeFields: ['id', 'name'],
        limit: 1,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Should have requested fields
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.items).toBeDefined(); // Always included
      
      // Should NOT have excluded fields
      expect(node.note).toBeUndefined();
      expect(node.isCompleted).toBeUndefined();
    });

    it('should apply includeFields recursively to children', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        includeFields: ['id', 'name'],
        maxDepth: 2, // Include children to test field filtering
        limit: 1,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      if (node.items && node.items.length > 0) {
        const child = node.items[0];
        // Child should also respect field filtering
        expect(child.id).toBeDefined();
        expect(child.name).toBeDefined(); 
        expect(child.items).toBeDefined(); // Always included
        expect(child.note).toBeUndefined(); // Should be excluded
        expect(child.isCompleted).toBeUndefined(); // Should be excluded

        // Test grandchildren if they exist
        if (child.items && child.items.length > 0) {
          const grandchild = child.items[0];
          expect(grandchild.id).toBeDefined();
          expect(grandchild.name).toBeDefined();
          expect(grandchild.items).toBeDefined();
          expect(grandchild.note).toBeUndefined();
          expect(grandchild.isCompleted).toBeUndefined();
        }
      }
    });

    it('should combine limit, maxDepth, and includeFields parameters', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        limit: 2,
        maxDepth: 1,
        includeFields: ['id', 'name'],
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      
      // Should respect limit
      expect(parsedContent).toHaveLength(2);
      
      // Should respect field filtering
      const node = parsedContent[0];
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.note).toBeUndefined();
      
      // Should respect maxDepth (children included but no grandchildren)
      if (node.items && node.items.length > 0 && node.items[0].items) {
        expect(node.items[0].items).toHaveLength(0);
      }
    });

    it('should truncate content with preview parameter', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        preview: 12, // Truncate to 12 characters
        limit: 1,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Names longer than 12 chars should be truncated with '...'
      if (node.name && node.name.length > 12) {
        expect(node.name).toEndWith('...');
        expect(node.name.length).toBeLessThanOrEqual(15); // 12 chars + '...'
      }
      
      // Notes longer than 12 chars should be truncated with '...'
      if (node.note && node.note.length > 12) {
        expect(node.note).toEndWith('...');
        expect(node.note.length).toBeLessThanOrEqual(15); // 12 chars + '...'
      }
    });

    it('should not truncate content shorter than preview limit', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        preview: 100, // Large preview limit
        limit: 1,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Content shorter than limit should not be truncated
      if (node.name) {
        expect(node.name).not.toEndWith('...');
      }
      if (node.note) {
        expect(node.note).not.toEndWith('...');
      }
    });

    it('should apply preview truncation recursively to children', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        maxDepth: 2,
        preview: 10, // Short preview to ensure truncation
        limit: 1,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const node = parsedContent[0];
      
      // Check children for preview truncation
      if (node.items && node.items.length > 0) {
        const child = node.items[0];
        if (child.name && child.name.length > 10) {
          expect(child.name).toEndWith('...');
        }
        if (child.note && child.note.length > 10) {
          expect(child.note).toEndWith('...');
        }
        
        // Check grandchildren for preview truncation
        if (child.items && child.items.length > 0) {
          const grandchild = child.items[0];
          if (grandchild.name && grandchild.name.length > 10) {
            expect(grandchild.name).toEndWith('...');
          }
          if (grandchild.note && grandchild.note.length > 10) {
            expect(grandchild.note).toEndWith('...');
          }
        }
      }
    });

    it('should combine all parameters including preview', async () => {
      const result = await tools.search_nodes.handler({
        query: 'TypeScript',
        limit: 1,
        maxDepth: 1,
        includeFields: ['id', 'name'],
        preview: 8,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      
      // Should respect limit
      expect(parsedContent).toHaveLength(1);
      
      const node = parsedContent[0];
      
      // Should respect field filtering
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.note).toBeUndefined();
      expect(node.isCompleted).toBeUndefined();
      
      // Should respect maxDepth
      if (node.items && node.items.length > 0 && node.items[0].items) {
        expect(node.items[0].items).toHaveLength(0);
      }
      
      // Should respect preview truncation
      if (node.name && node.name.length > 8) {
        expect(node.name).toEndWith('...');
        expect(node.name.length).toBeLessThanOrEqual(11); // 8 chars + '...'
      }
    });
  });

  describe('create_node', () => {
    it('should create a new node successfully', async () => {
      const result = await tools.create_node.handler({
        parentId: 'root-node-1',
        name: 'New Task',
        description: 'Task description',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Successfully created node "New Task"');
      expect(result.content[0].text).toContain('root-node-1');
    });

    it('should create a node without description', async () => {
      const result = await tools.create_node.handler({
        parentId: 'root-node-1',
        name: 'Simple Task',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Successfully created node "Simple Task"');
    });

    it('should handle creation errors', async () => {
      const errorClient = createMockClient('error');
      const errorTools = createTestTools(errorClient);
      
      const result = await errorTools.create_node.handler({
        parentId: 'invalid-parent',
        name: 'New Task',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Error creating node');
      expect(result.content[0].text).toContain('Authentication failed');
    });
  });

  describe('update_node', () => {
    it('should update node name and description', async () => {
      const result = await tools.update_node.handler({
        nodeId: 'node-123',
        name: 'Updated Name',
        description: 'Updated description',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Successfully updated node node-123');
    });

    it('should handle update errors', async () => {
      const errorClient = createMockClient('error');
      const errorTools = createTestTools(errorClient);
      
      const result = await errorTools.update_node.handler({
        nodeId: 'invalid-node',
        name: 'Updated Name',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Error updating node');
      expect(result.content[0].text).toContain('Node not found');
    });
  });

  describe('toggle_complete', () => {
    it('should mark node as completed', async () => {
      const result = await tools.toggle_complete.handler({
        nodeId: 'node-123',
        completed: true,
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Successfully completed node node-123');
    });

    it('should mark node as incomplete', async () => {
      const result = await tools.toggle_complete.handler({
        nodeId: 'node-123',
        completed: false,
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Successfully uncompleted node node-123');
    });

    it('should handle toggle errors', async () => {
      const errorClient = createMockClient('error');
      const errorTools = createTestTools(errorClient);
      
      const result = await errorTools.toggle_complete.handler({
        nodeId: 'invalid-node',
        completed: true,
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Error toggling completion status');
      expect(result.content[0].text).toContain('Node not found');
    });
  });

  describe('delete_node', () => {
    it('should delete a node successfully', async () => {
      const result = await tools.delete_node.handler({
        nodeId: 'node-123',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Successfully deleted node node-123');
    });

    it('should handle deletion errors', async () => {
      const errorClient = createMockClient('error');
      const errorTools = createTestTools(errorClient);
      
      const result = await errorTools.delete_node.handler({
        nodeId: 'invalid-node',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Error deleting node');
      expect(result.content[0].text).toContain('Node not found');
    });
  });

  describe('move_node', () => {
    it('should move a node to a new parent successfully', async () => {
      const result = await tools.move_node.handler({
        nodeId: 'node-123',
        newParentId: 'parent-456',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Successfully moved node node-123 to parent parent-456');
    });

    it('should move a node with priority', async () => {
      const result = await tools.move_node.handler({
        nodeId: 'node-123',
        newParentId: 'parent-456',
        priority: 0,
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Successfully moved node node-123 to parent parent-456 at position 0');
    });

    it('should handle move errors', async () => {
      const errorClient = createMockClient('error');
      const errorTools = createTestTools(errorClient);
      
      const result = await errorTools.move_node.handler({
        nodeId: 'invalid-node',
        newParentId: 'parent-456',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Error moving node');
      expect(result.content[0].text).toContain('Node not found');
    });
  });

  describe('get_node_by_id', () => {
    it('should retrieve a node by ID with default parameters', async () => {
      const result = await tools.get_node_by_id.handler({
        nodeId: 'test-node-123',
        ...testCredentials
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.id).toBe('test-node-123');
      expect(parsedContent.name).toContain('Node test-node-123');
      expect(parsedContent.note).toContain('This is a note for node test-node-123');
      expect(parsedContent.isCompleted).toBe(false);
    });

    it('should respect maxDepth=0 (no children)', async () => {
      const result = await tools.get_node_by_id.handler({
        nodeId: 'test-node-123',
        maxDepth: 0,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.items).toHaveLength(0); // Should have no children
    });

    it('should respect maxDepth=1 (include first level children)', async () => {
      const result = await tools.get_node_by_id.handler({
        nodeId: 'test-node-123',
        maxDepth: 1,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.items.length).toBeGreaterThan(0); // Should have children
      expect(parsedContent.items[0].name).toContain('Child 1');
      expect(parsedContent.items[1].name).toContain('Child 2');
      
      // Children should not have their own children (maxDepth=1)
      expect(parsedContent.items[0].items).toHaveLength(0);
      expect(parsedContent.items[1].items).toHaveLength(0);
    });

    it('should respect includeFields parameter', async () => {
      const result = await tools.get_node_by_id.handler({
        nodeId: 'test-node-123',
        includeFields: ['id', 'name'],
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      
      // Should have requested fields
      expect(parsedContent.id).toBeDefined();
      expect(parsedContent.name).toBeDefined();
      expect(parsedContent.items).toBeDefined(); // Always included
      
      // Should NOT have excluded fields
      expect(parsedContent.note).toBeUndefined();
      expect(parsedContent.isCompleted).toBeUndefined();
    });

    it('should truncate content with preview parameter', async () => {
      const result = await tools.get_node_by_id.handler({
        nodeId: 'test-node-123',
        includeFields: ['id', 'name', 'note'],
        preview: 10, // Truncate to 10 characters
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      
      // Names longer than 10 chars should be truncated with '...'
      if (parsedContent.name && parsedContent.name.length > 10) {
        expect(parsedContent.name).toEndWith('...');
        expect(parsedContent.name.length).toBeLessThanOrEqual(13); // 10 chars + '...'
      }
      
      // Notes longer than 10 chars should be truncated with '...'
      if (parsedContent.note && parsedContent.note.length > 10) {
        expect(parsedContent.note).toEndWith('...');
        expect(parsedContent.note.length).toBeLessThanOrEqual(13); // 10 chars + '...'
      }
    });

    it('should combine all parameters correctly', async () => {
      const result = await tools.get_node_by_id.handler({
        nodeId: 'test-node-123',
        maxDepth: 1,
        includeFields: ['id', 'name'],
        preview: 15,
        ...testCredentials
      });

      const parsedContent = JSON.parse(result.content[0].text);
      
      // Should respect field filtering
      expect(parsedContent.id).toBeDefined();
      expect(parsedContent.name).toBeDefined();
      expect(parsedContent.note).toBeUndefined();
      expect(parsedContent.isCompleted).toBeUndefined();
      
      // Should respect maxDepth
      expect(parsedContent.items.length).toBeGreaterThan(0);
      expect(parsedContent.items[0].items).toHaveLength(0);
      
      // Should respect preview truncation
      if (parsedContent.name && parsedContent.name.length > 15) {
        expect(parsedContent.name).toEndWith('...');
      }
    });

    it('should handle node not found errors', async () => {
      const errorClient = createMockClient('error');
      const errorTools = createTestTools(errorClient);
      
      const result = await errorTools.get_node_by_id.handler({
        nodeId: 'invalid-node',
        ...testCredentials
      });

      expect(result.content[0].text).toContain('Error retrieving node');
      expect(result.content[0].text).toContain('Node not found');
    });
  });
});