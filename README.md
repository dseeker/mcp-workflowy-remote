# Workflowy MCP

A Model Context Protocol (MCP) server for interacting with Workflowy. This server provides an MCP-compatible interface to Workflowy, allowing AI assistants to interact with your Workflowy lists programmatically.

## Features

- **Workflowy Integration**: Connect to your Workflowy account using session ID or username/password
- **MCP Compatibility**: Full support for the Model Context Protocol
- **Tool Operations**: Search, create, update, and delete Workflowy nodes
- **RESTful API**: Standard HTTP interface for MCP operations

## Getting Started

### Prerequisites

- Node.js (v16+)
- A Workflowy account

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/workflowy-mcp.git
   cd workflowy-mcp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up authentication:

   Create a `.env` file in the project root with your Workflowy credentials:
   ```
   WORKFLOWY_SESSIONID=your_session_id
   # Or use username/password (if session ID is not provided)
   WORKFLOWY_USERNAME=your_username
   WORKFLOWY_PASSWORD=your_password
   PORT=3000  # Optional, default is 3000
   ```

   To get your Workflowy session ID:
   1. Log in to Workflowy in your browser
   2. Open browser developer tools (F12)
   3. Go to Application tab > Cookies > www.workflowy.com
   4. Copy the value of the cookie named "sessionid"

### Build and Run

1. Build the TypeScript code:
   ```
   npm run build
   ```

2. Start the server:
   ```
   npm start
   ```

   Or for development with auto-reloading:
   ```
   npm run dev
   ```

3. The server will be available at:
   - MCP endpoint: http://localhost:3000/mcp
   - Health check: http://localhost:3000/health

## Available Tools

The following tools are available through the MCP interface:

### list_nodes

List nodes in Workflowy, optionally filtering by parent node.

**Parameters:**
- `parentId` (optional): ID of the parent node. If omitted, returns root nodes.

### search_nodes

Search for nodes in Workflowy by query string.

**Parameters:**
- `query`: Search query to find matching nodes

### create_node

Create a new node in Workflowy.

**Parameters:**
- `parentId`: ID of the parent node where the new node will be created
- `name`: Name/title of the new node
- `description` (optional): Description/note for the new node

### update_node

Update an existing node in Workflowy.

**Parameters:**
- `nodeId`: ID of the node to update
- `name` (optional): New name/title for the node
- `description` (optional): New description/note for the node

### delete_node

Delete a node from Workflowy.

**Parameters:**
- `nodeId`: ID of the node to delete

### toggle_complete

Mark a node as complete/incomplete.

**Parameters:**
- `nodeId`: ID of the node to toggle completion status
- `completed`: Whether the node should be marked as complete (true) or incomplete (false)

## License

ISC Licensed. See the [LICENSE](LICENSE) file for details.
