import { z } from "zod";
import { workflowyClient } from "../workflowy/client.js";
import log from "../utils/logger.js";

export const workflowyTools: Record<string, any> = {
  list_nodes: {
    description: "List nodes in Workflowy. If a `parentId` is provided, it lists the child nodes of that parent. If omitted, it lists the root nodes.",
    inputSchema: {
      parentId: z.string().optional().describe("ID of the parent node to list children from. If omitted, returns root nodes."),
      maxDepth: z.number().optional().describe("Maximum depth of children to include (0=no children, 1=first level, etc. default: 0)"),
      includeFields: z.array(z.string()).optional().describe("Fields to include in response. Available: id, name, note, isCompleted (default: id, name)"),
      preview: z.number().optional().describe("Truncate content fields (name, note) to specified number of characters. If omitted, full content is returned.")
    },
    handler: async ({ parentId, maxDepth, includeFields, preview, username, password }: { parentId?: string, maxDepth?: number, includeFields?: string[], preview?: number, username?: string, password?: string }) => {
      try {
        const depth = maxDepth ?? 0;
        const fields = includeFields ?? ['id', 'name']; // Default to basic meta and tree structure only
        
        const items = !!parentId
          ? await workflowyClient.getChildItems(parentId, username, password, depth, fields, preview)
          : await workflowyClient.getRootItems(username, password, depth, fields, preview);
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
    },
    annotations: {
        title: "List nodes in Workflowy",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    }
  },

  search_nodes: {
    description: "Search nodes in Workflowy",
    inputSchema: {
      query: z.string().describe("Search query to find matching nodes"),
      limit: z.number().optional().describe("Maximum number of results to return (default: 10)"),
      maxDepth: z.number().optional().describe("Maximum depth of children to include (0=no children, 1=first level, etc. default: 0)"),
      includeFields: z.array(z.string()).optional().describe("Fields to include in response. Available: id, name, note, isCompleted (default: all)"),
      preview: z.number().optional().describe("Truncate content fields (name, note) to specified number of characters. If omitted, full content is returned.")
    },
    annotations: {
        title: "Search nodes in Workflowy",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ query, limit, maxDepth, includeFields, preview, username, password }: { query: string, limit?: number, maxDepth?: number, includeFields?: string[], preview?: number, username?: string, password?: string }, client: typeof workflowyClient) => {
      const startTime = Date.now();
      const toolParams = { query, limit, maxDepth, includeFields, preview, username: username ? '[PROVIDED]' : '[ENV_VAR]', password: password ? '[PROVIDED]' : '[ENV_VAR]' };
      
      try {
        const items = await workflowyClient.search(query, username, password, limit, maxDepth, includeFields, preview);
        
        const responseSize = JSON.stringify(items, null, 2).length;
        const executionTime = Date.now() - startTime;

        const response = {
          content: [{
            type: "text",
            text: JSON.stringify(items, null, 2)
          }]
        };
        
        return response;
        
      } catch (error: any) {
        const executionTime = Date.now() - startTime;
        
        const errorResponse = {
          content: [{
            type: "text",
            text: `Error searching nodes: ${error.message}`
          }]
        };
        
        return errorResponse;
      }
    }
  },

  create_node: {
    description: "Create a new node",
    annotations: {
        title: "Create a new node in Workflowy",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
    },
    handler: async ({ parentId, name, description, username, password }:
        { parentId: string, name: string, description?: string, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.createNode(parentId, name, description, username, password);
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
    description: "Update an existing node",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to update"),
      name: z.string().optional().describe("New name/title for the node"),
      description: z.string().optional().describe("New description/note for the node")
    },
    annotations: {
        title: "Search nodes in Workflowy",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ nodeId, name, description, username, password }:
        { nodeId: string, name?: string, description?: string, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.updateNode(nodeId, name, description, username, password);
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

  delete_node: {
    description: "Delete a node",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to delete")
    },
    annotations: {
        title: "Delete a node in Workflowy",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
    },
    handler: async ({ nodeId, username, password }:
        { nodeId: string, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.deleteNode(nodeId, username, password);
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

  toggle_complete: {
    description: "Toggle completion status of a node",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to toggle completion status"),
      completed: z.boolean().describe("Whether the node should be marked as complete (true) or incomplete (false)")
    },
    annotations: {
        title: "Toggle completion status of a node",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ nodeId, completed, username, password }:
        { nodeId: string, completed: boolean, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.toggleComplete(nodeId, completed, username, password);
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

  move_node: {
    description: "Move a node to a different parent with optional priority control",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to move"),
      newParentId: z.string().describe("ID of the new parent node"),
      priority: z.number().optional().describe("Priority/position within the new parent (0 = first position)")
    },
    annotations: {
        title: "Move a node to different parent",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
    },
    handler: async ({ nodeId, newParentId, priority, username, password }:
        { nodeId: string, newParentId: string, priority?: number, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.moveNode(nodeId, newParentId, priority, username, password);
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
    description: "Get a single node by its ID with full details",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to retrieve"),
      maxDepth: z.number().optional().describe("Maximum depth of children to include (0=no children, 1=first level, etc. default: 0)"),
      includeFields: z.array(z.string()).optional().describe("Fields to include in response. Available: id, name, note, isCompleted (default: all)"),
      preview: z.number().optional().describe("Truncate content fields (name, note) to specified number of characters. If omitted, full content is returned.")
    },
    annotations: {
        title: "Get node by ID",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ nodeId, maxDepth, includeFields, preview, username, password }:
        { nodeId: string, maxDepth?: number, includeFields?: string[], preview?: number, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        const node = await workflowyClient.getNodeById(nodeId, username, password, maxDepth, includeFields, preview);
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