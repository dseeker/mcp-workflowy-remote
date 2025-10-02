import { z } from "zod";
import { workflowyClient } from "../workflowy/client.js";
import log from "../utils/logger.js";

export const workflowyTools: Record<string, any> = {
  list_nodes: {
    description: "List nodes in Workflowy. If a `parentId` is provided, it lists the child nodes of that parent. If omitted, it lists the root nodes.",
    inputSchema: {
      parentId: z.string().optional().describe("Parent node ID to list children from (omit for root nodes)"),
      maxDepth: z.number().optional().describe("How many levels deep to include children (0=none, 1=direct children, 2=grandchildren, etc. default: 0)"),
      includeFields: z.array(z.string()).optional().describe("Fields to include - Basic: id, name, note, isCompleted; Metadata: parentId, parentName, priority, lastModifiedAt, completedAt, isMirror, originalId, isSharedViaUrl, sharedUrl, hierarchy, siblings, siblingCount (default: id, name)"),
      preview: z.number().optional().describe("Character limit for name/note fields to truncate long content (omit for full content)")
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
      query: z.string().describe("Search text to find matching nodes"),
      limit: z.number().optional().describe("Maximum results to return (default: 10)"),
      maxDepth: z.number().optional().describe("How many levels deep to include children (0=none, 1=direct children, 2=grandchildren, etc. default: 0)"),
      includeFields: z.array(z.string()).optional().describe("Fields to include - Basic: id, name, note, isCompleted; Metadata: parentId, parentName, priority, lastModifiedAt, completedAt, isMirror, originalId, isSharedViaUrl, sharedUrl, hierarchy, siblings, siblingCount (default: all basic)"),
      preview: z.number().optional().describe("Character limit for name/note fields to truncate long content (omit for full content)")
    },
    annotations: {
        title: "Search nodes in Workflowy",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ query, limit, maxDepth, includeFields, preview, username, password }: { query: string, limit?: number, maxDepth?: number, includeFields?: string[], preview?: number, username?: string, password?: string }, client: typeof workflowyClient) => {
      try {
        const startTime = Date.now();
        const items = await workflowyClient.search(query, username, password, limit, maxDepth, includeFields, preview);

        const executionTime = Date.now() - startTime;

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
    description: "Create a new node",
    inputSchema: {
      parentId: z.string().describe("Parent node ID where the node will be created"),
      name: z.string().describe("Main node text (use for primary information)"),
      note: z.string().optional().describe("Additional details (use for context, notes, or supplementary info)")
    },
    annotations: {
        title: "Create a new node in Workflowy",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
    },
    handler: async ({ parentId, name, note, username, password }:
        { parentId: string, name: string, note?: string, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.createNode(parentId, name, note, username, password);
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

  batch_create_nodes: {
    description: "Create multiple nodes under the same parent in a single atomic operation",
    inputSchema: {
      parentId: z.string().describe("Parent node ID where all nodes will be created"),
      nodes: z.array(z.object({
        name: z.string().describe("Main node text (use for primary information)"),
        note: z.string().optional().describe("Additional details (use for context, notes, or supplementary info)")
      })).describe("Array of nodes to create")
    },
    annotations: {
        title: "Create multiple nodes in Workflowy atomically",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
    },
    handler: async ({ parentId, nodes, username, password }:
        { parentId: string, nodes: Array<{name: string, note?: string}>, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        const result = await workflowyClient.batchCreateNodes(parentId, nodes, username, password);

        return {
          content: [{
            type: "text",
            text: `Successfully created ${result.nodesCreated} nodes under parent ${parentId} in ${result.timing}:\n${result.nodes.map(n => `- ${n.name} (${n.id})`).join('\n')}`
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error creating batch nodes: ${error.message}`
          }]
        };
      };
    }
  },

  batch_update_nodes: {
    description: "Update multiple nodes in a single atomic operation",
    inputSchema: {
      nodes: z.array(z.object({
        id: z.string().describe("Node ID to update"),
        name: z.string().optional().describe("Main node text (use for primary information)"),
        note: z.string().optional().describe("Additional details (use for context, notes, or supplementary info)"),
        isCompleted: z.boolean().optional().describe("Completion status (true = completed, false = active)")
      })).describe("Array of nodes to update")
    },
    annotations: {
        title: "Update multiple nodes in Workflowy atomically",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ nodes, username, password }:
        { nodes: Array<{id: string, name?: string, note?: string, isCompleted?: boolean}>, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        const result = await workflowyClient.batchUpdateNodes(nodes, username, password);

        const successMessage = `Successfully updated ${result.nodesUpdated} nodes in ${result.timing}:\n${result.nodes.map(n => `- ${n.id}${n.name ? ` (name: ${n.name})` : ''}${n.note !== undefined ? ` (note updated)` : ''}${n.isCompleted !== undefined ? ` (completed: ${n.isCompleted})` : ''}`).join('\n')}`;
        const warningMessage = result.notFound ? `\n\nWarning: ${result.notFound.length} nodes not found: ${result.notFound.join(', ')}` : '';

        return {
          content: [{
            type: "text",
            text: successMessage + warningMessage
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error updating batch nodes: ${error.message}`
          }]
        };
      };
    }
  },

  update_node: {
    description: "Update an existing node",
    inputSchema: {
      id: z.string().describe("Node ID to update"),
      name: z.string().optional().describe("Main node text (use for primary information)"),
      note: z.string().optional().describe("Additional details (use for context, notes, or supplementary info)")
    },
    annotations: {
        title: "Update an existing node in Workflowy",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ id, name, note, username, password }:
        { id: string, name?: string, note?: string, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.updateNode(id, name, note, username, password);
        return {
          content: [{
            type: "text",
            text: `Successfully updated node ${id}`
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
      id: z.string().describe("Node ID to delete")
    },
    annotations: {
        title: "Delete a node in Workflowy",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
    },
    handler: async ({ id, username, password }:
        { id: string, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.deleteNode(id, username, password);
        return {
          content: [{
            type: "text",
            text: `Successfully deleted node ${id}`
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
      id: z.string().describe("Node ID to toggle completion"),
      completed: z.boolean().describe("Completion status (true = mark completed, false = mark active)")
    },
    annotations: {
        title: "Toggle completion status of a node",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ id, completed, username, password }:
        { id: string, completed: boolean, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.toggleComplete(id, completed, username, password);
        return {
          content: [{
            type: "text",
            text: `Successfully ${completed ? "completed" : "uncompleted"} node ${id}`
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
      id: z.string().describe("Node ID to move"),
      newParentId: z.string().describe("New parent node ID"),
      priority: z.number().optional().describe("Position within parent siblings (0 = first, omit for last)")
    },
    annotations: {
        title: "Move a node to different parent",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
    },
    handler: async ({ id, newParentId, priority, username, password }:
        { id: string, newParentId: string, priority?: number, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        await workflowyClient.moveNode(id, newParentId, priority, username, password);
        const priorityText = priority !== undefined ? ` at position ${priority}` : '';
        return {
          content: [{
            type: "text",
            text: `Successfully moved node ${id} to parent ${newParentId}${priorityText}`
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
      id: z.string().describe("Node ID to retrieve"),
      maxDepth: z.number().optional().describe("How many levels deep to include children (0=none, 1=direct children, 2=grandchildren, etc. default: 0)"),
      includeFields: z.array(z.string()).optional().describe("Fields to include - Basic: id, name, note, isCompleted; Metadata: parentId, parentName, priority, lastModifiedAt, completedAt, isMirror, originalId, isSharedViaUrl, sharedUrl, hierarchy, siblings, siblingCount (default: all basic)"),
      preview: z.number().optional().describe("Character limit for name/note fields to truncate long content (omit for full content)")
    },
    annotations: {
        title: "Get node by ID",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ id, maxDepth, includeFields, preview, username, password }:
        { id: string, maxDepth?: number, includeFields?: string[], preview?: number, username?: string, password?: string },
        client: typeof workflowyClient) => {
      try {
        const node = await workflowyClient.getNodeById(id, username, password, maxDepth, includeFields, preview);
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