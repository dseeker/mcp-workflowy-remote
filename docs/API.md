# API Reference

This document provides detailed API documentation for all available tools and endpoints.

## Available Tools

This MCP server provides the following tools to interact with your Workflowy:

1. **list_nodes** - Get a list of nodes from your Workflowy (root nodes or children of a specified node) with filtering and preview options
2. **search_nodes** - Search for nodes by query text with advanced filtering and preview options
3. **create_node** - Create a new node in your Workflowy
4. **update_node** - Modify an existing node's text or description
5. **toggle_complete** - Mark a node as complete or incomplete
6. **delete_node** - Delete a node from your Workflowy
7. **move_node** - Move a node to a different parent with optional priority control
8. **get_node_by_id** - Get a single node by its ID with full details and filtering options

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
- `includeFields: ["id", "name"]` - Only include ID and name fields
- `includeFields: ["id", "name", "note"]` - Include ID, name, and note fields
- `includeFields: undefined` (default) - Include all fields (`id`, `name`, `note`, `isCompleted`)

**Important:** The `items` array is always included for structural integrity, regardless of field selection.

**Field filtering applies recursively** to all children at all levels.

**Example Usage:**
```javascript
// Get compact results with only essential fields
search_nodes({ 
  query: "project", 
  includeFields: ["id", "name"],
  maxDepth: 2 
})

// Result structure:
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

### 1. list_nodes - List Workflowy nodes with filtering and preview options

**Parameters:**
- `parentId` (optional): Parent node ID
- `maxDepth` (optional): Maximum depth of children to include (0=no children, 1=first level, etc. default: 0)
- `includeFields` (optional): Fields to include in response. Available: id, name, note, isCompleted (default: id, name)
- `preview` (optional): Truncate content fields (name, note) to specified number of characters

### 2. search_nodes - Search nodes by text with advanced filtering

**Parameters:**
- `query` (required): Search query
- `limit` (optional): Maximum number of results to return
- `maxDepth` (optional): Maximum depth of children to include (default: 0)
- `includeFields` (optional): Fields to include in response. Available: id, name, note, isCompleted (default: all)
- `preview` (optional): Truncate content fields (name, note) to specified number of characters

### 3. create_node - Create new node

**Parameters:**
- `parentId` (required): Parent node ID
- `name` (required): Node title
- `description` (optional): Node content

### 4. update_node - Update existing node

**Parameters:**
- `nodeId` (required): Node ID to update
- `name` (optional): New title
- `description` (optional): New content

### 5. toggle_complete - Toggle completion status

**Parameters:**
- `nodeId` (required): Node ID
- `completed` (required): "true" or "false"

### 6. delete_node - Delete a node

**Parameters:**
- `nodeId` (required): Node ID to delete

### 7. move_node - Move a node to different parent with priority control

**Parameters:**
- `nodeId` (required): Node ID to move
- `newParentId` (required): New parent node ID
- `priority` (optional): Priority/position within the new parent (0 = first position)

### 8. get_node_by_id - Get single node by ID with full details and filtering

**Parameters:**
- `nodeId` (required): Node ID to retrieve
- `maxDepth` (optional): Maximum depth of children to include (0=no children, 1=first level, etc. default: 0)
- `includeFields` (optional): Fields to include in response. Available: id, name, note, isCompleted (default: all)
- `preview` (optional): Truncate content fields (name, note) to specified number of characters

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