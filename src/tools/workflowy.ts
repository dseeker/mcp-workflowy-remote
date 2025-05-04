import { z } from "zod";
import { workflowyClient } from "../workflowy/client.js";

export const workflowyTools: Record<string, any> = {
  list_nodes: {
    description: "List nodes in Workflowy. If a `parentId` is provided, it lists the child nodes of that parent. If omitted, it lists the root nodes.",
    inputSchema: {
      parentId: z.string().optional().describe("ID of the parent node to list children from. If omitted, returns root nodes.")
    },
    handler: async ({ parentId, username, password }: { parentId?: string, username?: string, password?: string }) => {
      try {
        const items = !!parentId
          ? await workflowyClient.getChildItems(parentId, username, password)
          : await workflowyClient.getRootItems(username, password);
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
      query: z.string().describe("Search query to find matching nodes")
    },
    annotations: {
        title: "Search nodes in Workflowy",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
    },
    handler: async ({ query, username, password }: { query: string, username?: string, password?: string }, client: typeof workflowyClient) => {
      try {
        const items = await workflowyClient.search(query, username, password);
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

//   delete_node: {
//     description: "Delete a node",
//     inputSchema: {
//       nodeId: z.string().describe("ID of the node to delete")
//     },
//     annotations: {
//         title: "Search nodes in Workflowy",
//         readOnlyHint: false,
//         destructiveHint: true,
//         idempotentHint: false,
//         openWorldHint: false
//     },
//     handler: async ({ nodeId, username, password }:
//         { nodeId: string, username?: string, password?: string },
//         client: typeof workflowyClient) => {
//       try {
//         await workflowyClient.deleteNode(nodeId, username, password);
//         return {
//           content: [{
//             type: "text",
//             text: `Successfully deleted node ${nodeId}`
//           }]
//         };
//       } catch (error: any) {
//         return {
//           content: [{
//             type: "text",
//             text: `Error deleting node: ${error.message}`
//           }]
//         };
//       }
//     }
//   },

  toggle_complete: {
    description: "Toggle completion status of a node",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to toggle completion status"),
      completed: z.boolean().describe("Whether the node should be marked as complete (true) or incomplete (false)")
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
  }
};