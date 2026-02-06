# API Reference

This document provides detailed API documentation for all available tools and endpoints.

## Available Tools

This MCP server provides the following tools to interact with your Workflowy:

1. **list_nodes** - Get a list of nodes from your Workflowy (root nodes or children of a specified node) with filtering and preview options
2. **search_nodes** - Search for nodes by query text with advanced filtering and preview options
3. **create_node** - Create a new node in your Workflowy
4. **batch_create_nodes** - Create multiple nodes under the same parent in a single atomic operation
5. **update_node** - Modify an existing node's text or note
6. **batch_update_nodes** - Update multiple nodes in a single atomic operation
7. **toggle_complete** - Mark a node as complete or incomplete
8. **delete_node** - Delete a node from your Workflowy
9. **move_node** - Move a node to a different parent with optional priority control
10. **get_node_by_id** - Get a single node by its ID with full details and filtering options
11. **get_file_url** - Get a signed URL to download file attachments from Workflowy nodes
12. **download_file** - Download file attachments directly to a local file path
13. **export_to_file** - Export Workflowy data directly to a file on disk (JSON, Markdown, or text)

## Enhanced List & Search Features

Both **list_nodes** and **search_nodes** tools include powerful parameters for optimized performance and precise results.

### list_nodes - Smart Node Listing

The `list_nodes` tool now provides efficient node listing with sensible defaults:

**Default Behavior (Optimized for Performance):**
- Returns only `id` and `name` fields by default (not `note` and `isCompleted`)
- No children included by default (`maxDepth: 0`)
- Much faster and lighter than previous versions

**Example Usage:**
```javascript
// Basic usage - lightweight response
list_nodes()  // Returns root nodes with id, name only

// Get specific node's children with more detail
list_nodes({ 
  parentId: "node-123",
  includeFields: ["id", "name", "note", "isCompleted"],
  maxDepth: 2,
  preview: 100
})
```

### Advanced Search Features

The **search_nodes** tool includes powerful parameters for optimized performance and precise results:

#### **Depth Control (`maxDepth`)**
Control how many levels of nested children to include:
- `maxDepth: 0` - Only parent nodes, no children
- `maxDepth: 1` - Include first-level children only
- `maxDepth: 2` - Include children and grandchildren
- `maxDepth: undefined` (default) - Include all nested levels

**Example Usage:**
```javascript
// Get only top-level results (no children)
search_nodes({ query: "project", maxDepth: 0 })

// Get results with one level of children
search_nodes({ query: "project", maxDepth: 1 })
```

#### **Result Limiting (`limit`)**
Control the maximum number of results returned:
- `limit: 5` - Return maximum 5 results
- `limit: 10` - Return maximum 10 results  
- `limit: undefined` (default) - Return all matching results

**Example Usage:**
```javascript
// Get only the first 3 matching results
search_nodes({ query: "TypeScript", limit: 3 })
```

#### **Field Selection (`includeFields`)**
Choose which fields to include in the response for performance optimization:

**Basic Fields:**
- `id` - Node identifier
- `name` - Node title/text
- `note` - Node description/note
- `isCompleted` - Completion status
- `items` - Child nodes (always included for structural integrity)

**Metadata Fields (Advanced):**
- `parentId` - ID of parent node
- `parentName` - Name of parent node
- `priority` - Position among siblings (0-based)
- `siblingCount` - Total number of siblings including self
- `lastModifiedAt` - Last modification timestamp (ISO string)
- `completedAt` - Completion timestamp (ISO string, if completed)
- `isMirror` - Whether node is a mirror/reference
- `originalId` - Original node ID (for mirrors)
- `isSharedViaUrl` - Whether node is shared via URL
- `sharedUrl` - Shared URL (if shared)
- `hierarchy` - Array of parent names from root to node
- `siblings` - Array of sibling nodes with basic info
- `s3File` - File attachment metadata (if present)

**Performance Notes:**
- Basic fields are lightweight and fast
- Metadata fields require additional processing - only request when needed
- `includeFields: undefined` (default) - Include all basic fields only
- Field filtering applies recursively to all children at all levels

**Example Usage:**
```javascript
// Get compact results with only essential fields
search_nodes({ 
  query: "project", 
  includeFields: ["id", "name"],
  maxDepth: 2 
})

// Get results with navigation context
search_nodes({
  query: "project",
  includeFields: ["id", "name", "parentName", "hierarchy", "priority"],
  maxDepth: 1
})

// Get full metadata for detailed analysis
search_nodes({
  query: "project", 
  includeFields: ["id", "name", "note", "isCompleted", "hierarchy", "siblings", "lastModifiedAt"],
  limit: 5
})

// Include file attachment metadata
search_nodes({
  query: "image",
  includeFields: ["id", "name", "s3File"]
})

// Response with s3File:
[
  {
    "id": "node-1",
    "name": "Screenshot",
    "s3File": {
      "isFile": true,
      "fileName": "screenshot.png",
      "fileType": "image/png",
      "imageOriginalWidth": 1024,
      "imageOriginalHeight": 569
    }
  }
]

// Result structure (basic fields only):
[
  {
    "id": "node-1",
    "name": "Project Management", 
    "items": [
      {
        "id": "child-1",
        "name": "Sprint Planning",
        "items": [
          {
            "id": "grandchild-1", 
            "name": "Sprint Tasks",
            "items": []
          }
        ]
      }
    ]
  }
]
// Note: 'note' and 'isCompleted' fields excluded from all levels

// Result structure (with metadata fields):
[
  {
    "id": "node-1",
    "name": "Project Management",
    "parentId": "root-123", 
    "parentName": "Work Projects",
    "hierarchy": ["Work Projects"],
    "priority": 0,
    "siblingCount": 3,
    "lastModifiedAt": "2023-12-01T10:30:00.000Z",
    "siblings": [
      { "id": "node-2", "name": "Personal Goals", "priority": 1 },
      { "id": "node-3", "name": "Research", "priority": 2 }
    ],
    "items": []
  }
]
```

#### **Content Preview (`preview`)**
Control content length by truncating text fields to a specified number of characters:
- `preview: 50` - Truncate `name` and `note` fields to 50 characters (adds "..." if truncated)
- `preview: 100` - Truncate to 100 characters
- `preview: undefined` (default) - No truncation, return full content

**Example Usage:**
```javascript
// Truncate long content for quick previews
search_nodes({ 
  query: "project", 
  preview: 30  // Long names/notes truncated to 30 chars + "..."
})

// Result:
[
  {
    "id": "node-1",
    "name": "Very long project name that...", // Truncated
    "note": "Detailed description that...",   // Truncated
    "isCompleted": false,
    "items": []
  }
]
```

**Benefits:**
- **Reduced Token Usage**: Shorter responses use fewer tokens
- **Quick Overviews**: Get essence of content without overwhelming detail
- **Consistent Layout**: Predictable response sizes for UI display

#### **Combined Parameters**
All parameters can be used together for maximum control:

```javascript
search_nodes({
  query: "TypeScript",
  limit: 3,                     // Max 3 results
  maxDepth: 1,                  // Include children but not grandchildren  
  includeFields: ["id", "name"], // Only essential fields
  preview: 50                   // Truncate content to 50 characters
})
```

## Tool Details

#### **Metadata Use Cases**
Metadata fields enable powerful workflows:

**Navigation & Context:**
- `hierarchy` - Build breadcrumb navigation ("Home > Projects > Sprint Planning")
- `parentName` - Show parent context without full hierarchy
- `siblings` - Navigate between items at same level

**Organization & Prioritization:**
- `priority` - Understand item ordering and positioning
- `siblingCount` - Show "Item 2 of 5" context
- `lastModifiedAt` - Sort by recent activity, show staleness

**Advanced Workflows:**
- `isSharedViaUrl` + `sharedUrl` - Manage shared content
- `isMirror` + `originalId` - Handle references and links
- `completedAt` - Audit completion times, generate reports

## Tool Details

### 1. list_nodes - List Workflowy nodes with filtering and preview options

**Parameters:**
- `parentId` (optional): Parent node ID
- `maxDepth` (optional): How many levels deep to include children (0=none, 1=direct children, 2=grandchildren, etc. default: 0)
- `includeFields` (optional): Fields to include in response. Basic: id, name, note, isCompleted. Metadata: parentId, parentName, priority, lastModifiedAt, completedAt, isMirror, originalId, isSharedViaUrl, sharedUrl, hierarchy, siblings, siblingCount, s3File (default: id, name)
- `preview` (optional): Truncate content fields (name, note) to specified number of characters

### 2. search_nodes - Search nodes by text with advanced filtering

**Parameters:**
- `query` (required): Search query
- `limit` (optional): Maximum number of results to return
- `maxDepth` (optional): How many levels deep to include children (0=none, 1=direct children, 2=grandchildren, etc. default: 0)
- `includeFields` (optional): Fields to include in response. Basic: id, name, note, isCompleted. Metadata: parentId, parentName, priority, lastModifiedAt, completedAt, isMirror, originalId, isSharedViaUrl, sharedUrl, hierarchy, siblings, siblingCount, s3File (default: all basic fields)
- `preview` (optional): Truncate content fields (name, note) to specified number of characters

### 3. create_node - Create new node

**Parameters:**
- `parentId` (required): Parent node ID where the node will be created
- `name` (required): Main node text (use for primary information)
- `note` (optional): Additional details (use for context, notes, or supplementary info)

### 4. batch_create_nodes - Create multiple nodes atomically

**Parameters:**
- `parentId` (required): Parent node ID where all nodes will be created
- `nodes` (required): Array of nodes to create, each with:
  - `name` (required): Main node text (use for primary information)
  - `note` (optional): Additional details (use for context, notes, or supplementary info)

**Example:**
```javascript
batch_create_nodes({
  parentId: "node-123",
  nodes: [
    { name: "Task 1", note: "First task details" },
    { name: "Task 2", note: "Second task details" },
    { name: "Task 3" }
  ]
})
```

**Benefits:**
- Single API call for multiple creates
- Atomic operation - all nodes created or none
- Efficient for bulk operations

### 5. update_node - Update existing node

**Parameters:**
- `id` (required): Node ID to update
- `name` (optional): Main node text (use for primary information)
- `note` (optional): Additional details (use for context, notes, or supplementary info)

### 6. batch_update_nodes - Update multiple nodes atomically

**Parameters:**
- `nodes` (required): Array of nodes to update, each with:
  - `id` (required): Node ID to update
  - `name` (optional): Main node text (use for primary information)
  - `note` (optional): Additional details (use for context, notes, or supplementary info)
  - `isCompleted` (optional): Completion status (true = completed, false = active)

**Example:**
```javascript
batch_update_nodes({
  nodes: [
    { id: "node-1", name: "Updated Title 1" },
    { id: "node-2", note: "Updated note content" },
    { id: "node-3", name: "New Title", note: "New note" },
    { id: "node-4", isCompleted: true },
    { id: "node-5", name: "Completed Task", isCompleted: true }
  ]
})
```

**Benefits:**
- Single API call for multiple updates
- Atomic operation - all nodes updated in one save
- Efficient for bulk edits
- Supports all writable fields: name, note, isCompleted
- Partial success handling - reports which nodes were not found

**Response:**
- `nodesUpdated`: Count of successfully updated nodes
- `nodes`: Array of updated nodes with their IDs
- `notFound`: Array of node IDs that were not found (if any)
- `timing`: Operation execution time

### 7. toggle_complete - Toggle completion status

**Parameters:**
- `id` (required): Node ID to toggle completion
- `completed` (required): Completion status (true = mark completed, false = mark active)

### 8. delete_node - Delete a node

**Parameters:**
- `id` (required): Node ID to delete

### 9. move_node - Move a node to different parent with priority control

**Parameters:**
- `id` (required): Node ID to move
- `newParentId` (required): New parent node ID
- `priority` (optional): Position within parent siblings (0 = first, omit for last)

### 10. get_node_by_id - Get single node by ID with full details and filtering

**Parameters:**
- `id` (required): Node ID to retrieve
- `maxDepth` (optional): How many levels deep to include children (0=none, 1=direct children, 2=grandchildren, etc. default: 0)
- `includeFields` (optional): Fields to include in response. Basic: id, name, note, isCompleted. Metadata: parentId, parentName, priority, lastModifiedAt, completedAt, isMirror, originalId, isSharedViaUrl, sharedUrl, hierarchy, siblings, siblingCount, s3File (default: all basic fields)
- `preview` (optional): Truncate content fields (name, note) to specified number of characters

### 11. get_file_url - Get signed URL for file attachment

Get a temporary signed URL to download a file attachment from a Workflowy node. The URL expires after a short time and can be used to fetch the actual file content.

**Parameters:**
- `nodeId` (required): Node ID that contains the file attachment
- `userId` (optional): User ID (will be fetched automatically if not provided)
- `maxWidth` (optional): Maximum width for image preview (default: 800)
- `maxHeight` (optional): Maximum height for image preview (default: 800)

**Example:**
```javascript
// Get file URL for a node with attachment
get_file_url({
  nodeId: "abc-123-def-456",
  maxWidth: 1024,
  maxHeight: 1024
})
```

**Response:**
```
Signed URL for file attachment:
https://workflowy.com/file-proxy/file/...

Note: This URL is temporary and will expire. Use it to download the file content.
```

### 12. download_file - Download file attachment to local path

Download a file attachment from a Workflowy node directly to a local file path. This tool combines getting the signed URL and downloading the file in one operation.

**Features:**
- **Automatic Retry**: Retries up to 3 times if the download fails (e.g., URL expired)
- **URL Refresh**: Gets a fresh signed URL on each retry attempt
- **Exponential Backoff**: Waits longer between retries for network errors
- **Directory Creation**: Automatically creates directories if they don't exist

**Parameters:**
- `nodeId` (required): Node ID that contains the file attachment
- `filePath` (required): Absolute local file path where the file should be saved
- `userId` (optional): User ID (will be fetched automatically if not provided)
- `maxWidth` (optional): Maximum width for image preview (default: 800)
- `maxHeight` (optional): Maximum height for image preview (default: 800)

**Example:**
```javascript
// Download a file attachment
download_file({
  nodeId: "abc-123-def-456",
  filePath: "C:\\Users\\user\\Downloads\\workflowy-attachment.png",
  maxWidth: 1024,
  maxHeight: 1024
})
```

**Response:**
```
File downloaded successfully:
Path: C:\Users\user\Downloads\workflowy-attachment.png
Size: 84.21 KB
URL: https://workflowy.com/file-proxy/file/...
```

**Retry Behavior:**
- If the URL expires (HTTP 403), automatically gets a fresh URL and retries
- If network errors occur, waits 500ms, 1000ms, 1500ms between retries
- Reports number of retries in the response if multiple attempts were needed

### 13. export_to_file - Export Workflowy data to file

Export Workflowy data directly to a file on disk. Supports exporting by search query, specific node ID, or root nodes. For markdown/txt exports, can optionally download file attachments to a subfolder and update links.

**Parameters:**
- `filePath` (required): Absolute file path where data will be written
- `query` (optional): Search query to find nodes to export
- `nodeId` (optional): Specific node ID to export
- `format` (optional): Output format - 'json', 'markdown', or 'txt' (default: 'json')
- `maxDepth` (optional): How many levels deep to include children
- `includeFields` (optional): Fields to include in JSON export
- `includeIds` (optional): Include node IDs in markdown/txt exports
- `downloadAttachments` (optional): Download file attachments and save them next to the exported file (only for markdown/txt formats). Creates a subfolder with the attachments.

**Examples:**

Basic export:
```javascript
export_to_file({
  filePath: "/home/user/workflowy-backup.md",
  query: "project",
  format: "markdown",
  maxDepth: 2,
  includeIds: true
})
```

Export with attachments:
```javascript
export_to_file({
  filePath: "C:\\Users\\user\\Documents\\workflowy-export.md",
  query: "project",
  format: "markdown",
  downloadAttachments: true
})
// Creates:
// - workflowy-export.md
// - workflowy-export_attachments/
//   - nodeid_image1.png
//   - nodeid_document.pdf
```

**Attachment Download Behavior:**
- Only works with `markdown` and `txt` formats (ignored for `json`)
- Creates a subfolder named `{filename}_attachments/`
- Downloads all file attachments found in the exported nodes
- Updates markdown links to point to local files:
  - Images: `![filename](relative/path/to/file)`
  - Files: `[File: filename - relative/path/to/file]`
- Files are named with node ID prefix to avoid conflicts: `{nodeId}_{safeFileName}`
})
```

## MCP Protocol Endpoints

- **POST /mcp** - MCP JSON-RPC endpoint
  - `initialize` - Initialize MCP session
  - `tools/list` - List available tools  
  - `tools/call` - Execute a tool

## Legacy REST Endpoints

- **GET /health** - Health check (no auth required)
- **GET /tools** - List tools in REST format
- **GET /** - Server information

## Performance Benefits

Both `list_nodes` and `search_nodes` offer these optimization features:
- **Token Limit Protection**: Field filtering and depth control prevent large responses that could exceed Claude Code's 25k token limit
- **Faster Processing**: Smaller responses load faster and use less bandwidth
- **Content Preview**: Truncate long content to reduce response size while maintaining readability
- **Precise Control**: Get exactly the data structure you need for your use case
- **Smart Defaults**: `list_nodes` uses minimal fields by default for maximum efficiency

## Example Usage with Preview

```javascript
// Quick overview with truncated content
list_nodes({ 
  maxDepth: 1, 
  preview: 80, 
  includeFields: ["id", "name", "note"] 
})

// Result: Immediate children with content truncated to 80 chars
[
  {
    "id": "node-1",
    "name": "Long project name gets truncated at 80 characters and shows ellipsis...",
    "note": "Detailed description also gets truncated to 80 characters for preview...",
    "items": [
      {
        "id": "child-1", 
        "name": "Child node also truncated...",
        "items": []
      }
    ]
  }
]
```

## Debug Commands

**Test MCP Protocol:**
```bash
# Test initialize
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR-KEY" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}' \
  https://your-worker.workers.dev/mcp

# List available tools
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR-KEY" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}' \
  https://your-worker.workers.dev/mcp

# Test tool execution (replace with valid parentId)
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR-KEY" \
  -d '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "list_nodes", "arguments": {}}}' \
  https://your-worker.workers.dev/mcp
```