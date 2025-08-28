[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_mcp_workflowy_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=Workflowy%20MCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-workflowy%40latest%22%2C%22server%22%2C%22start%22%5D%2C%20%22env%22%3A%20%7B%22WORKFLOWY_USERNAME%22%3A%22%22%2C%20%22WORKFLOWY_PASSWORD%22%3A%20%22%22%7D%7D)
# Workflowy MCP

A Model Context Protocol (MCP) server for interacting with Workflowy. This server provides an MCP-compatible interface to Workflowy, allowing AI assistants to interact with your Workflowy lists programmatically.

<a href="https://glama.ai/mcp/servers/@danield137/mcp-workflowy">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@danield137/mcp-workflowy/badge" alt="mcp-workflowy MCP server" />
</a>

## What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI models to interact with external tools and APIs. This server implements MCP to allow AI assistants (like ChatGPT) to read and manipulate your Workflowy lists through a set of defined tools.

## Features

- **Workflowy Integration**: Connect to your Workflowy account using username/password authentication
- **MCP Compatibility**: Full support for the Model Context Protocol
- **Tool Operations**: Search, create, update, and mark nodes as complete/incomplete in your Workflowy

## Example Usage:
Personally, I use workflowy as my project management tool.
Giving my agent access to my notes, and my code base, the following are useful prompts:

- "Show my all my notes on project XYZ in workflowy"
- "Review the codebase, mark all completed notes as completed"
- "Given my milestones on workflowy for this project, suggest what my next task should be"

## Installation

### Prerequisites
- Node.js v18 or higher
- A Workflowy account

### Quick Install

![NPM Version](https://img.shields.io/npm/v/mcp-workflowy)
![NPM Downloads](https://img.shields.io/npm/dm/mcp-workflowy)

```bash
# Install the package globally
npm install -g mcp-workflowy

# Or use npx to run it directly
npx mcp-workflowy server start
```

## Configuration

Create a `.env` file in your project directory with the following content:

```
WORKFLOWY_USERNAME=your_username_here
WORKFLOWY_PASSWORD=your_password_here
```

Alternatively, you can provide these credentials as environment variables when running the server.

## Usage

### Starting the Server
```bash
# If installed globally
mcp-workflowy server start

# Using npx
npx mcp-workflowy server start
```

### Available Tools

This MCP server provides the following tools to interact with your Workflowy:

1. **list_nodes** - Get a list of nodes from your Workflowy (root nodes or children of a specified node)
2. **search_nodes** - Search for nodes by query text
3. **create_node** - Create a new node in your Workflowy
4. **update_node** - Modify an existing node's text or description
5. **toggle_complete** - Mark a node as complete or incomplete

## Integrating with AI Assistants

To use this MCP server with AI assistants (like ChatGPT):

1. Start the MCP server as described above
2. Connect your AI assistant to the MCP server (refer to your AI assistant's documentation)
3. The AI assistant will now be able to read and manipulate your Workflowy lists

## One-Click
[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_mcp_workflowy_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=Workflowy%20MCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-workflowy%40latest%22%2C%22server%22%2C%22start%22%5D%2C%20%22env%22%3A%20%7B%22WORKFLOWY_USERNAME%22%3A%22%22%2C%20%22WORKFLOWY_PASSWORD%22%3A%20%22%22%7D%7D)

## 🚀 Remote MCP Server (Cloudflare Workers)

Deploy this MCP server to Cloudflare Workers for secure remote access from Claude Desktop or Claude Code.

### 🔐 Secure Remote Deployment

**Security Features:**
- API key authentication prevents unauthorized access
- Client-provided credentials (your Workflowy data never stored on server)
- HTTPS encryption for all communication
- Environment variable fallbacks for convenience

### 📋 Setup Instructions

#### Step 1: Generate API Key
```bash
# Generate a secure API key
openssl rand -base64 32
```

#### Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository:

**Required Secrets:**
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID  
- `ALLOWED_API_KEYS` - Comma-separated API keys (e.g., "key1,key2,key3")

**Optional Secrets (convenience):**
- `WORKFLOWY_USERNAME` - Your Workflowy username (fallback)
- `WORKFLOWY_PASSWORD` - Your Workflowy password (fallback)

#### Step 3: Deploy
Push to main/master branch. The GitHub Action automatically:
- Builds and deploys the worker
- Configures authentication
- Runs security validation tests

#### Step 4: Configure Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Most Secure (Client Credentials):**
```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://mcp-workflowy-remote.{account-id}.workers.dev"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-api-key-here\"}",
        "WORKFLOWY_USERNAME": "your-workflowy-username",
        "WORKFLOWY_PASSWORD": "your-workflowy-password"
      }
    }
  }
}
```

**Convenience (Server Fallback):**
```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://mcp-workflowy-remote.{account-id}.workers.dev"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-api-key-here\"}"
      }
    }
  }
}
```

#### Step 5: Configure Claude Code

Add to your MCP settings:

```json
{
  "servers": {
    "workflowy-remote": {
      "url": "https://mcp-workflowy-remote.{account-id}.workers.dev",
      "headers": {
        "Authorization": "Bearer your-api-key-here"
      },
      "env": {
        "WORKFLOWY_USERNAME": "your-workflowy-username",
        "WORKFLOWY_PASSWORD": "your-workflowy-password"
      }
    }
  }
}
```

### 🛡️ Security Notes

- **API Keys:** Only you control who can access your deployment
- **Credentials:** Your Workflowy credentials can be provided by client (most secure) or stored as server fallbacks
- **HTTPS:** All communication is encrypted in transit
- **No Public Access:** Without a valid API key, the server returns "Unauthorized"

### 📡 Your Deployed URL

After deployment: `https://mcp-workflowy-remote.{your-account-id}.workers.dev`

Find your account ID in the Cloudflare dashboard or GitHub Action logs.

### 🔧 Manual Deployment

```bash
# Install dependencies and build
npm install
npm run build:worker

# Deploy with Wrangler (requires login)
npm run deploy

# Test deployment locally
npm run dry-run
```

See [SECURITY.md](SECURITY.md) for detailed security configuration and best practices.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.