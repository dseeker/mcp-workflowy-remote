import { z } from "zod";
import { workflowyClient } from "../workflowy/client.js";
import log from "../utils/logger.js";
import { promises as fs } from "fs";
import path from "path";
import { convertToMarkdown, convertToPlainText } from "../utils/format-converters.js";

// Helper to create tool definitions with proper Zod schemas
const createTool = <T extends z.ZodRawShape>(
  description: string,
  schema: T,
  handler: (args: z.infer<z.ZodObject<T>> & { username?: string; password?: string }) => Promise<any>,
  annotations: any
) => ({
  description,
  parameters: z.object(schema),
  handler,
  annotations
});

export const workflowyTools: Record<string, any> = {
  list_nodes: createTool(
    "List child nodes from a parent (or root if no parentId). EFFICIENCY: Use maxDepth=10 to get entire subtree in one call. Default maxDepth=0 returns only direct children.",
    {
      parentId: z.string().optional().describe("Parent node ID (omit for root nodes). Find IDs via search_nodes or list_nodes."),
      maxDepth: z.number().optional().describe("Child levels to include: 0=none, 1=direct children, 2=grandchildren, 10=all. Default: 0. TIP: Use 10 for unknown depths."),
      includeFields: z.array(z.string()).optional().describe("Fields to return. Default: ['id','name']. Add 'note', 'isCompleted' as needed. More fields = more tokens."),
      preview: z.number().optional().describe("Truncate content to N chars. Use for summaries; omit for full content.")
    },
    async ({ parentId, maxDepth, includeFields, preview, username, password }) => {
      try {
        const depth = maxDepth ?? 0;
        const fields = includeFields ?? ['id', 'name'];
        const items = !!parentId
          ? await workflowyClient.getChildItems(parentId, username, password, depth, fields, preview)
          : await workflowyClient.getRootItems(username, password, depth, fields, preview);
        return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error listing nodes: ${error.message}` }] };
      }
    },
    { title: "List nodes in Workflowy", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  ),

  search_nodes: createTool(
    "Search nodes by text across the entire tree. Use maxDepth=2 to include parent/child context with matches.",
    {
      query: z.string().describe("Search text. Partial, case-insensitive match in names and notes."),
      limit: z.number().optional().describe("Max results to return (default: 10)."),
      maxDepth: z.number().optional().describe("Child levels: 0=node only, 1=children, 2=grandchildren, 10=all. Use 2 for context. Default: 0."),
      includeFields: z.array(z.string()).optional().describe("Fields to return. Default: ['id','name']. Add fields sparingly."),
      preview: z.number().optional().describe("Truncate to N chars. Use for summaries; omit for full content.")
    },
    async ({ query, limit, maxDepth, includeFields, preview, username, password }) => {
      try {
        const items = await workflowyClient.search(query, username, password, limit, maxDepth, includeFields, preview);
        return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error searching nodes: ${error.message}` }] };
      }
    },
    { title: "Search nodes in Workflowy", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  ),

  create_node: createTool(
    "Create a single node under a parent. For 2+ nodes, use batch_create_nodes (more efficient).",
    {
      parentId: z.string().describe("Parent node ID. Find via search_nodes or list_nodes."),
      name: z.string().describe("REQUIRED. Main content/headline visible in the outline. Keep concise. Examples: 'Buy groceries', 'Project deadline: March 15'."),
      note: z.string().optional().describe("Optional details shown below the name (hidden by default). Supports the main content. Example: name='Buy groceries', note='Milk, eggs, bread'.")
    },
    async ({ parentId, name, note, username, password }) => {
      try {
        await workflowyClient.createNode(parentId, name, note, username, password);
        return { content: [{ type: "text", text: `Successfully created node "${name}" under parent ${parentId}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error creating node: ${error.message}` }] };
      }
    },
    { title: "Create a new node in Workflowy", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  ),

  batch_create_nodes: createTool(
    "Create multiple sibling nodes atomically (all succeed or none). PREFERRED for 2+ nodes vs multiple create_node calls.",
    {
      parentId: z.string().describe("Parent node ID. Find via search_nodes or list_nodes."),
      nodes: z.array(z.object({
        name: z.string().describe("REQUIRED. Main content visible in outline. Examples: 'Task 1', 'Meeting notes'."),
        note: z.string().optional().describe("Optional details shown below name (hidden by default). Supports the main content.")
      })).describe("Array of {name, note?} objects to create as siblings under the parent.")
    },
    async ({ parentId, nodes, username, password }) => {
      try {
        const result = await workflowyClient.batchCreateNodes(parentId, nodes, username, password);
        return { content: [{ type: "text", text: `Successfully created ${result.nodesCreated} nodes under parent ${parentId} in ${result.timing}:\n${result.nodes.map((n: any) => `- ${n.name} (${n.id})`).join('\n')}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error creating batch nodes: ${error.message}` }] };
      }
    },
    { title: "Create multiple nodes in Workflowy atomically", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  ),

  batch_update_nodes: createTool(
    "Update multiple nodes atomically. PREFERRED for 2+ nodes vs multiple update_node calls.",
    {
      nodes: z.array(z.object({
        id: z.string().describe("REQUIRED. Node ID to update. Find via search_nodes or list_nodes."),
        name: z.string().optional().describe("New main content. Omit if not changing."),
        note: z.string().optional().describe("New details shown below name. Omit if not changing."),
        isCompleted: z.boolean().optional().describe("Completion status: true=done, false=active. Use for batch completing items.")
      })).describe("Array of {id, name?, note?, isCompleted?}. Include only fields to change.")
    },
    async ({ nodes, username, password }) => {
      try {
        const result = await workflowyClient.batchUpdateNodes(nodes, username, password);
        const successMessage = `Successfully updated ${result.nodesUpdated} nodes in ${result.timing}:\n${result.nodes.map((n: any) => `- ${n.id}${n.name ? ` (name: ${n.name})` : ''}${n.note !== undefined ? ` (note updated)` : ''}${n.isCompleted !== undefined ? ` (completed: ${n.isCompleted})` : ''}`).join('\n')}`;
        const warningMessage = result.notFound ? `\n\nWarning: ${result.notFound.length} nodes not found: ${result.notFound.join(', ')}` : '';
        return { content: [{ type: "text", text: successMessage + warningMessage }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating batch nodes: ${error.message}` }] };
      }
    },
    { title: "Update multiple nodes in Workflowy atomically", readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  ),

  update_node: createTool(
    "Update a single node. For 2+ nodes, use batch_update_nodes.",
    {
      id: z.string().describe("Node ID to update. Find via search_nodes or list_nodes."),
      name: z.string().optional().describe("New main content. Omit if not changing."),
      note: z.string().optional().describe("New details shown below name. Omit if not changing.")
    },
    async ({ id, name, note, username, password }) => {
      try {
        await workflowyClient.updateNode(id, name, note, username, password);
        return { content: [{ type: "text", text: `Successfully updated node ${id}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating node: ${error.message}` }] };
      }
    },
    { title: "Update an existing node in Workflowy", readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  ),

  delete_node: createTool(
    "Delete a single node. WARNING: Deletes all descendants (cascade). For 2+ nodes, use batch_delete_nodes.",
    {
      id: z.string().describe("Node ID to delete. Find via search_nodes or list_nodes.")
    },
    async ({ id, username, password }) => {
      try {
        await workflowyClient.deleteNode(id, username, password);
        return { content: [{ type: "text", text: `Successfully deleted node ${id}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error deleting node: ${error.message}` }] };
      }
    },
    { title: "Delete a node in Workflowy", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  ),

  batch_delete_nodes: createTool(
    "Delete multiple nodes atomically. PREFERRED for 2+ nodes vs multiple delete_node calls.",
    {
      ids: z.array(z.string()).describe("Array of node IDs to delete. WARNING: Deleting a parent removes all descendants.")
    },
    async ({ ids, username, password }) => {
      try {
        const result = await workflowyClient.batchDeleteNodes(ids, username, password);
        const successMessage = result.success ? `Successfully deleted ${result.deleted} nodes` : `Partial failure: deleted ${result.deleted} of ${ids.length} nodes`;
        const notFoundMessage = result.notFound ? `\n\nNot found: ${result.notFound.join(', ')}` : '';
        return { content: [{ type: "text", text: `${successMessage}${notFoundMessage}\n\nResult: ${JSON.stringify(result, null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error deleting nodes: ${error.message}` }] };
      }
    },
    { title: "Delete multiple nodes atomically", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  ),

  toggle_complete: createTool(
    "Toggle completion status of a node. For batch updates, use batch_update_nodes with isCompleted field.",
    {
      id: z.string().describe("Node ID. Find via search_nodes or list_nodes."),
      completed: z.boolean().describe("Target state: true=done (checked), false=active (unchecked). Sets directly; not a toggle.")
    },
    async ({ id, completed, username, password }) => {
      try {
        await workflowyClient.toggleComplete(id, completed, username, password);
        return { content: [{ type: "text", text: `Successfully ${completed ? "completed" : "uncompleted"} node ${id}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error toggling completion status: ${error.message}` }] };
      }
    },
    { title: "Toggle completion status of a node", readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  ),

  move_node: createTool(
    "Move a single node to a new parent. For 2+ nodes, use batch_move_nodes.",
    {
      id: z.string().describe("Node ID to move. Find via search_nodes or list_nodes."),
      newParentId: z.string().describe("Destination parent node ID. Find via list_nodes or search_nodes."),
      priority: z.number().optional().describe("Position among siblings: 0=first, omit=last.")
    },
    async ({ id, newParentId, priority, username, password }) => {
      try {
        await workflowyClient.moveNode(id, newParentId, priority, username, password);
        const priorityText = priority !== undefined ? ` at position ${priority}` : '';
        return { content: [{ type: "text", text: `Successfully moved node ${id} to parent ${newParentId}${priorityText}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error moving node: ${error.message}` }] };
      }
    },
    { title: "Move a node to different parent", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  ),

  batch_move_nodes: createTool(
    "Move multiple nodes atomically. PREFERRED for 2+ nodes vs multiple move_node calls.",
    {
      moves: z.array(z.object({
        id: z.string().describe("REQUIRED. Node ID to move."),
        newParentId: z.string().describe("REQUIRED. Destination parent node ID."),
        priority: z.number().optional().describe("Position among siblings: 0=first, omit=last.")
      })).describe("Array of {id, newParentId, priority?} moves to execute.")
    },
    async ({ moves, username, password }) => {
      try {
        const result = await workflowyClient.batchMoveNodes(moves, username, password);
        const successMessage = result.success ? `Successfully moved ${result.moved} nodes` : `Partial failure: moved ${result.moved} of ${moves.length} nodes`;
        const errorDetails = result.errors && result.errors.length > 0 ? `\n\nFailed moves:\n${result.errors.map((e: any) => `- Node ${e.id} → ${e.newParentId}: ${e.error}`).join('\n')}` : '';
        return { content: [{ type: "text", text: `${successMessage}${errorDetails}\n\nResult: ${JSON.stringify(result, null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error moving nodes: ${error.message}` }] };
      }
    },
    { title: "Move multiple nodes atomically", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  ),

  get_node_by_id: createTool(
    "Get a node by ID with optional subtree. CRITICAL: Use maxDepth=10 to get entire subtree in ONE call. Avoid multiple calls for related nodes - get the top node with maxDepth instead.",
    {
      id: z.string().describe("Node ID to retrieve. Find via search_nodes or list_nodes."),
      maxDepth: z.number().optional().describe("Child levels: 0=node only, 1=children, 2=grandchildren, 10=all. CRITICAL: Use 10 for complete subtree. Default: 0."),
      includeFields: z.array(z.string()).optional().describe("Fields to return. Default: ['id','name']. Add fields sparingly."),
      preview: z.number().optional().describe("Truncate to N chars. Use for summaries; omit for full content.")
    },
    async ({ id, maxDepth, includeFields, preview, username, password }) => {
      try {
        const node = await workflowyClient.getNodeById(id, username, password, maxDepth, includeFields, preview);
        return { content: [{ type: "text", text: JSON.stringify(node, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error retrieving node: ${error.message}` }] };
      }
    },
    { title: "Get node by ID", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  ),

  export_to_file: createTool(
    "Export nodes to a local file (JSON/Markdown/Text). Workflow: Use search_nodes first to preview, then export with matching parameters.",
    {
      filePath: z.string().describe("Absolute file path. Examples: '/home/user/backup.json', 'C:\\Users\\Me\\notes.md'. Directory created if needed."),
      query: z.string().optional().describe("Search text to export matching nodes (omit if using nodeId or root)."),
      nodeId: z.string().optional().describe("Specific node ID to export (omit if using query or root)."),
      format: z.enum(['json', 'markdown', 'txt']).default('json').describe("Export format. JSON=structured (best for processing). Markdown=readable outline. TXT=plain text."),
      maxDepth: z.number().optional().describe("Child levels: 0=none, 1=children, 10=all. Use 10 for complete export."),
      includeFields: z.array(z.string()).optional().describe("Fields for JSON export. Default includes name, note, isCompleted, children."),
      includeIds: z.boolean().optional().describe("Include node IDs in markdown/txt exports."),
      downloadAttachments: z.boolean().optional().describe("Download attachments to subfolder (markdown/txt only).")
    },
    async ({ filePath, query, nodeId, format = 'json', maxDepth, includeFields, includeIds, downloadAttachments, username, password }) => {
      try {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
        let data;
        let dataDescription;
        let effectiveFields = includeFields;
        if (downloadAttachments && format !== 'json') {
          effectiveFields = [...(includeFields || []), 's3File', 'attachmentUrl'];
        }
        if (nodeId) {
          data = await workflowyClient.getNodeById(nodeId, username, password, maxDepth || 0, effectiveFields);
          dataDescription = `node ${nodeId}`;
        } else if (query) {
          data = await workflowyClient.search(query, username, password, undefined, maxDepth || 0, effectiveFields);
          dataDescription = `search results for "${query}" (${Array.isArray(data) ? data.length : 1} nodes)`;
        } else {
          data = await workflowyClient.getRootItems(username, password, maxDepth || 0, effectiveFields);
          dataDescription = `root nodes (${Array.isArray(data) ? data.length : 1} nodes)`;
        }
        let content;
        switch (format) {
          case 'markdown':
            content = convertToMarkdown(data, 0, { includeIds });
            break;
          case 'txt':
            content = convertToPlainText(data, 0, { includeIds });
            break;
          default:
            content = JSON.stringify(data, null, 2);
        }
        let attachmentInfo = '';
        if (downloadAttachments && format !== 'json') {
          const attachmentsDir = absolutePath.replace(/\.[^.]+$/, '') + '_attachments';
          await fs.mkdir(attachmentsDir, { recursive: true });
          const nodes = Array.isArray(data) ? data : [data];
          const downloadedAttachments: Array<{nodeId: string, fileName: string, localPath: string, url?: string}> = [];
          async function processNodeAttachments(node: any) {
            if (node.s3File && node.s3File.isFile) {
              const fileName = node.s3File.fileName;
              const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
              const localPath = path.join(attachmentsDir, `${node.id}_${safeFileName}`);
              try {
                if (node.attachmentUrl) {
                  const response = await fetch(node.attachmentUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    await fs.writeFile(localPath, Buffer.from(buffer));
                    downloadedAttachments.push({ nodeId: node.id, fileName, localPath, url: node.attachmentUrl });
                  }
                }
              } catch (err: any) {
                log.warn(`Failed to download attachment for node ${node.id}: ${err.message}`);
              }
            }
            const children = node.items || node.children || [];
            for (const child of children) {
              await processNodeAttachments(child);
            }
          }
          for (const node of nodes) {
            await processNodeAttachments(node);
          }
          if (downloadedAttachments.length > 0) {
            for (const att of downloadedAttachments) {
              const relativePath = path.relative(dir, att.localPath).replace(/\\/g, '/');
              const escapedName = att.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const localLink = format === 'markdown' ? `![${att.fileName}](${relativePath})` : `[File: ${att.fileName} - ${relativePath}]`;
              content = content.replace(new RegExp(`\\[ATTACHMENT\\] \\[Image: ${escapedName}[^\\n]*`, 'g'), localLink);
              content = content.replace(new RegExp(`\\[ATTACHMENT\\] \\[File: ${escapedName}[^\\n]*`, 'g'), localLink);
            }
            attachmentInfo = `\nAttachments: ${downloadedAttachments.length} files downloaded to ${attachmentsDir}`;
          }
        }
        await fs.writeFile(absolutePath, content, 'utf-8');
        const sizeKB = (content.length / 1024).toFixed(2);
        return { content: [{ type: "text", text: `Successfully exported ${dataDescription} to:\n${absolutePath}\nSize: ${sizeKB} KB\nFormat: ${format}${attachmentInfo}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error exporting to file: ${error.message}` }] };
      }
    },
    { title: "Export Workflowy data to file", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  ),

  get_file_url: createTool(
    "Get temporary download URL for file attachments. For saving to disk, use download_file instead (handles download automatically).",
    {
      nodeId: z.string().describe("Node ID with attachment. Find via search_nodes with includeFields=['s3File']."),
      userId: z.union([z.string(), z.number()]).optional().describe("User ID (auto-fetched if omitted)."),
      maxWidth: z.number().optional().describe("Max image width (default: 800)."),
      maxHeight: z.number().optional().describe("Max image height (default: 800).")
    },
    async ({ nodeId, userId, maxWidth, maxHeight, username, password }) => {
      try {
        const effectiveUserId = userId ?? await workflowyClient.getUserId(username, password);
        const result = await workflowyClient.getFileUrl(effectiveUserId, nodeId, maxWidth || 800, maxHeight || 800, username, password);
        return { content: [{ type: "text", text: `Signed URL for file attachment:\n${result.url}\n\nNote: This URL is temporary and will expire. Use it to download the file content.` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error getting file URL: ${error.message}` }] };
      }
    },
    { title: "Get file attachment URL", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  ),

  download_file: createTool(
    "Download file attachment to local disk. Preferred over get_file_url for direct downloads (includes auto-retry).",
    {
      nodeId: z.string().describe("Node ID with attachment. Find via search_nodes with includeFields=['s3File']."),
      filePath: z.string().describe("Absolute path to save file. Examples: '/home/user/image.png', 'C:\\Users\\Me\\file.pdf'. Directory created if needed."),
      userId: z.union([z.string(), z.number()]).optional().describe("User ID (auto-fetched if omitted)."),
      maxWidth: z.number().optional().describe("Max image width (default: 800)."),
      maxHeight: z.number().optional().describe("Max image height (default: 800)."),
      timeout: z.number().optional().describe("Timeout in ms (default: 30000 = 30s).")
    },
    async ({ nodeId, filePath, userId, maxWidth, maxHeight, timeout, username, password }) => {
      const maxRetries = 3;
      const downloadTimeout = timeout || 30000;
      let lastError: any;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const dir = path.dirname(filePath);
          await fs.mkdir(dir, { recursive: true });

          const effectiveUserId = userId ?? await workflowyClient.getUserId(username, password);

          log.debug(`download_file attempt ${attempt}/${maxRetries}`, { nodeId, filePath });
          const result = await workflowyClient.getFileUrl(effectiveUserId, nodeId, maxWidth || 800, maxHeight || 800, username, password);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), downloadTimeout);
          let response;
          try {
            response = await fetch(result.url, { signal: controller.signal });
            clearTimeout(timeoutId);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') throw new Error(`Download timed out after ${downloadTimeout}ms`);
            throw fetchError;
          }

          if (!response.ok) {
            if (response.status === 403 && attempt < maxRetries) {
              lastError = new Error(`HTTP ${response.status} ${response.statusText} - URL may have expired`);
              log.debug(`download_file got 403, will retry with fresh URL`, { nodeId, attempt });
              continue;
            }
            throw new Error(`Failed to download file: HTTP ${response.status} ${response.statusText}`);
          }

          const buffer = await response.arrayBuffer();
          await fs.writeFile(filePath, Buffer.from(buffer));
          const sizeKB = (buffer.byteLength / 1024).toFixed(2);
          return { content: [{ type: "text", text: `File downloaded successfully:\nPath: ${filePath}\nSize: ${sizeKB} KB\nURL: ${result.url}${attempt > 1 ? `\nRetries: ${attempt - 1}` : ''}` }], isError: false };
        } catch (error: any) {
          lastError = error;
          log.debug(`download_file error on attempt ${attempt}`, { nodeId, error: error.message });
          if (attempt < maxRetries) {
            const isRetryable = error.message?.includes('fetch') || error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('ECONNRESET') || error.message?.includes('timed out');
            if (isRetryable) {
              await new Promise(resolve => setTimeout(resolve, 500 * attempt));
              continue;
            }
          }
          break;
        }
      }
      return { content: [{ type: "text", text: `Error downloading file after ${maxRetries} attempts:\n${lastError?.message || 'Unknown error'}` }], isError: true };
    },
    { title: "Download file attachment", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  )
};
