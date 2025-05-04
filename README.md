# Workflowy MCP

A Model Context Protocol (MCP) server for interacting with Workflowy. This server provides an MCP-compatible interface to Workflowy, allowing AI assistants to interact with your Workflowy lists programmatically.

## What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI models to interact with external tools and APIs. This server implements MCP to allow AI assistants (like ChatGPT) to read and manipulate your Workflowy lists through a set of defined tools.

## Features

- **Workflowy Integration**: Connect to your Workflowy account using username/password authentication
- **MCP Compatibility**: Full support for the Model Context Protocol
- **Tool Operations**: Search, create, update, and mark nodes as complete/incomplete in your Workflowy
- **RESTful API**: Standard HTTP interface for MCP operations

## Getting Started

### Prerequisites

- Node.js (v16+)
- A Workflowy account

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/danield137/mcp-workflowy.git
   cd mcp-workflowy
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up authentication:

   Create a `.env` file in the project root with your Workflowy credentials:
   ```
   WORKFLOWY_USERNAME=your_username_here
   WORKFLOWY_PASSWORD=your_password_here
   PORT=3000  # Optional, default is 3000
   ```

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

## How it Works

This server connects to your Workflowy account and exposes specific operations through the MCP interface. AI assistants that support MCP can then use these tools to interact with your Workflowy lists.

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

### toggle_complete

Mark a node as complete/incomplete.

**Parameters:**
- `nodeId`: ID of the node to toggle completion status
- `completed`: Whether the node should be marked as complete (true) or incomplete (false)

## Testing

You can run end-to-end tests using:
```
./run-e2e-tests.sh
```

This script will prompt you for your Workflowy credentials and then run tests that interact with your actual Workflowy account.

## VS Code Integration

You can use this MCP server with Visual Studio Code to enable AI assistants like GitHub Copilot to interact with your Workflowy account.

### Setup

1. Make sure your MCP server is running locally:
   ```
   npm start
   ```

2. Configure VS Code to use your local MCP server:

   - Open VS Code settings (`Cmd+,` on MacOS)
   - Search for "MCP"
   - In the "Model Context Protocol: Servers" section, click "Edit in settings.json"
   - Add the following configuration:

   ```json
   "modelContextProtocol.servers": [
     {
       "name": "Workflowy",
       "url": "http://localhost:3000/sse",
       "enabled": true,
       "transport": "sse"
     }
   ]
   ```

3. Restart VS Code or reload the window (Command Palette → "Developer: Reload Window")

### Usage

Once configured, AI assistants in VS Code can interact with your Workflowy:

1. Open a chat with your AI assistant
2. Ask it to perform Workflowy tasks like:
   - "List my top-level Workflowy items"
   - "Create a new node with title 'Meeting Notes'"
   - "How many ideas I have under 'project X'"
   - "Given the codebase, which bullets in "project X" are still not done? mark the rest completed"

The assistant will use the MCP tools to interact with your Workflowy through the local server.

### Troubleshooting

- If you get connection errors, ensure the server is running and check the port matches (default is 3000)
- Check your `.env` file to make sure your Workflowy credentials are correct
- Look at the server logs in your terminal for any authentication or connection issues

## License

MIT Licensed. See the [LICENSE](LICENSE) file for details.
