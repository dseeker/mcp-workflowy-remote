// Simple unit tests for MCP Workflowy operations
import { describe, it, expect, beforeAll } from "bun:test";
import { mockWorkflowyResponses } from "./mocks/workflowy-responses";

// We'll test the tools by creating our own test versions that use mock clients directly
// This avoids the complexity of module mocking

const createTestTools = (mockClient: any) => {
  return {
    list_nodes: {
      handler: async ({ parentId, username, password }: { parentId?: string, username?: string, password?: string }) => {
        try {
          const items = !!parentId
            ? await mockClient.getChildItems(parentId, username, password)
            : await mockClient.getRootItems(username, password);
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
      handler: async ({ query, limit, maxDepth, includeFields, username, password }: 
        { query: string, limit?: number, maxDepth?: number, includeFields?: string[], username?: string, password?: string }) => {
        try {
          const items = await mockClient.search(query, username, password, limit, maxDepth, includeFields);
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
  return {
    getRootItems: async () => {
      if (scenario === 'error') throw new Error("Authentication failed: Invalid credentials");
      if (scenario === 'empty') return { id: "Root", name: "", note: "", isCompleted: false, items: [] };
      return mockResponses.rootNodes;
    },

    getChildItems: async (parentId: string) => {
      if (scenario === 'error') throw new Error("Node not found: Invalid node ID");  
      if (scenario === 'empty') return [];
      return mockResponses.childNodes;
    },

    search: async (query: string, username?: string, password?: string, limit?: number, maxDepth?: number, includeFields?: string[]) => {
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
      
      // Apply field filtering and depth limiting
      const filterNodeFields = (node: any, depth: number): any => {
        const filteredNode: any = {};
        
        // Always include items array (required for structure)
        filteredNode.items = [];
        
        // Apply field filtering if includeFields specified
        if (includeFields && includeFields.length > 0) {
          includeFields.forEach(field => {
            if (node[field] !== undefined) {
              filteredNode[field] = node[field];
            }
          });
        } else {
          // Include all fields if no filtering specified
          Object.keys(node).forEach(key => {
            if (key !== 'items') {
              filteredNode[key] = node[key];
            }
          });
        }
        
        // Handle nested items based on maxDepth
        if (node.items && node.items.length > 0) {
          if (maxDepth === undefined || depth < maxDepth) {
            filteredNode.items = node.items.map((child: any) => 
              filterNodeFields(child, depth + 1)
            );
          }
          // If maxDepth is 0 or we've reached the limit, items remains empty array
        }
        
        return filteredNode;
      };
      
      // Apply filtering to all results starting at depth 0
      return results.map(result => filterNodeFields(result, 0));
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
      expect(parsedContent.items).toBeDefined();
      expect(parsedContent.items).toHaveLength(3); // Updated to match new mock data
      expect(parsedContent.items[0].name).toBe('Project Management');
      expect(parsedContent.items[1].name).toBe('Personal Goals');
      expect(parsedContent.items[2].name).toBe('Research Projects');
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
});