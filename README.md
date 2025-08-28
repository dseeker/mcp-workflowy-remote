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
- **MCP HTTP Transport**: Full support for MCP HTTP transport protocol (2024-11-05 spec)
- **Remote Deployment**: Secure Cloudflare Workers deployment with API key authentication
- **Tool Operations**: Search, create, update, and mark nodes as complete/incomplete in your Workflowy
- **Dual Protocol Support**: Both MCP JSON-RPC and legacy REST endpoints

## Example Usage:
Personally, I use workflowy as my project management tool.
Giving my agent access to my notes, and my code base, the following are useful prompts:

- "Show my all my notes on project XYZ in workflowy"
- "Review the codebase, mark all completed notes as completed"
- "Given my milestones on workflowy for this project, suggest what my next task should be"

## Installation & Setup

Choose between **Local Server** (runs on your machine) or **Remote Server** (hosted on Cloudflare Workers).

### Option 1: 🚀 Remote MCP Server (Recommended)

**Benefits:** No local setup required, works from anywhere, secure cloud deployment

**Prerequisites:**
- A Workflowy account
- Claude Code or Claude Desktop

**Quick Setup:**
```bash
# Add the remote MCP server using Claude Code CLI
claude mcp add --transport http workflowy-remote https://mcp-workflowy-remote.daniel-bca.workers.dev/mcp --header "Authorization: Bearer YQGhAojAvvtGwenXL4GYl/zJHiNg+nvUcEqQ0egTImo="

# Verify connection
claude mcp list
```

**Alternative Setup (using .mcp.json):**
```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://mcp-workflowy-remote.daniel-bca.workers.dev/mcp"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer YQGhAojAvvtGwenXL4GYl/zJHiNg+nvUcEqQ0egTImo=\"}",
        "WORKFLOWY_USERNAME": "your-workflowy-username",
        "WORKFLOWY_PASSWORD": "your-workflowy-password"
      }
    }
  }
}
```

### Option 2: 🏠 Local MCP Server

**Benefits:** Full control, runs locally, no external dependencies

**Prerequisites:**
- Node.js v18 or higher
- A Workflowy account

**Quick Install:**

![NPM Version](https://img.shields.io/npm/v/mcp-workflowy)
![NPM Downloads](https://img.shields.io/npm/dm/mcp-workflowy)

```bash
# Install the package globally
npm install -g mcp-workflowy

# Or use npx to run it directly
npx mcp-workflowy server start
```

**Configuration:**

Create a `.env` file in your project directory:

```
WORKFLOWY_USERNAME=your_username_here
WORKFLOWY_PASSWORD=your_password_here
```

**Starting the Server:**
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

## Quick Start Examples

**For Remote Server Users:**
```bash
# After adding the remote server, you can immediately use it
claude mcp list  # Should show: workflowy-remote: ... - ✓ Connected
```

**For Local Server Users:**
1. Start the local MCP server: `npx mcp-workflowy server start`
2. Configure your AI assistant to connect to `localhost:3000` (or your configured port)
3. The AI assistant will now be able to read and manipulate your Workflowy lists

## Integrating with AI Assistants

### Claude Code / Claude Desktop
- **Remote**: Use the installation steps above
- **Local**: Configure your `claude_desktop_config.json` to point to your local server

### Other AI Assistants
For other AI assistants (like ChatGPT with MCP support):
1. **Remote**: Provide the MCP endpoint URL with authentication
2. **Local**: Start the local server and connect to the local endpoint

## One-Click Local Install
[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_mcp_workflowy_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=Workflowy%20MCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-workflowy%40latest%22%2C%22server%22%2C%22start%22%5D%2C%20%22env%22%3A%20%7B%22WORKFLOWY_USERNAME%22%3A%22%22%2C%20%22WORKFLOWY_PASSWORD%22%3A%20%22%22%7D%7D)

## 🏗️ Deploy Your Own Remote Server

Want to deploy your own instance? Follow these steps to deploy this MCP server to Cloudflare Workers for secure remote access.

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
- Extracts and displays your worker URL
- Configures authentication 
- Runs comprehensive security validation tests
- Shows deployment success with worker URL

Look for this output in your GitHub Action logs:
```
🧪 Verifying deployment at: https://mcp-workflowy-remote-abc123.workers.dev
✅ All deployment verification tests passed!
🚀 Your secure remote MCP server is ready at: https://mcp-workflowy-remote-abc123.workers.dev
```

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
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://your-worker-url.workers.dev/mcp"],
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
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://your-worker-url.workers.dev/mcp"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-api-key-here\"}"
      }
    }
  }
}
```

#### Step 5: Configure Claude Code

**Option 1: Using HTTP Transport (Recommended)**
```bash
# Add remote MCP server using Claude Code CLI
claude mcp add --transport http workflowy-remote https://your-worker-url.workers.dev/mcp --header "Authorization: Bearer your-api-key-here"
```

**Option 2: Using .mcp.json Configuration**
```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://your-worker-url.workers.dev/mcp"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-api-key-here\"}",
        "WORKFLOWY_USERNAME": "your-workflowy-username",
        "WORKFLOWY_PASSWORD": "your-workflowy-password"
      }
    }
  }
}
```

**Verify Connection:**
```bash
claude mcp list
```

### 🛡️ Security Notes

- **API Keys:** Only you control who can access your deployment
- **Credentials:** Your Workflowy credentials can be provided by client (most secure) or stored as server fallbacks
- **HTTPS:** All communication is encrypted in transit
- **No Public Access:** Without a valid API key, the server returns "Unauthorized"

### 📡 Your Deployed URL

Your worker URL is automatically extracted and displayed in the GitHub Action logs after deployment. Copy this URL from the deployment verification output:

```
🚀 Your secure remote MCP server is ready at: https://mcp-workflowy-remote-abc123.workers.dev
```

Use this exact URL in your MCP client configuration.

### ✅ Deployment Verification

After deployment, verify your MCP server is working:

**1. Test Health Endpoint:**
```bash
curl https://your-worker-url.workers.dev/health
```
Expected response:
```json
{
  "status": "ok",
  "server": "workflowy-remote",
  "version": "0.1.3",
  "protocol": "2024-11-05"
}
```

**2. Test MCP Protocol:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}' \
  https://your-worker-url.workers.dev/mcp
```

**3. Test Tools List:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}' \
  https://your-worker-url.workers.dev/mcp
```

**4. Verify Claude Code Connection:**
```bash
claude mcp list
# Should show: workflowy-remote: ... - ✓ Connected
```

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

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. "Failed to connect" Error
**Problem:** MCP server shows as disconnected in `claude mcp list`
**Solutions:**
- Verify your worker URL includes `/mcp` endpoint: `https://your-worker.workers.dev/mcp`
- Check API key is correctly set in authorization header
- Test health endpoint first: `curl https://your-worker.workers.dev/health`
- Ensure GitHub Action deployment completed successfully

#### 2. "Unauthorized" Error
**Problem:** API requests return 401 Unauthorized
**Solutions:**
- Verify `ALLOWED_API_KEYS` secret is set in GitHub repository
- Ensure API key matches exactly (no extra spaces/characters)
- Check that GitHub Action deployment uploaded secrets successfully
- Generate a new API key: `openssl rand -base64 32`

#### 3. "Tools not found" Error
**Problem:** MCP server connects but no tools are available
**Solutions:**
- Test MCP protocol directly: use curl commands from verification section
- Check worker logs in Cloudflare dashboard for errors
- Verify Workflowy credentials are set (either in environment or client)
- Test legacy REST endpoint: `https://your-worker.workers.dev/tools`

#### 4. GitHub Action Deployment Fails
**Problem:** Deployment workflow fails or times out
**Solutions:**
- Check all required secrets are set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ALLOWED_API_KEYS`
- Verify Cloudflare API token has correct permissions (Workers:Edit, Zone:Read)
- Ensure repository has Actions enabled
- Check workflow logs for specific error messages

#### 5. Workflowy Authentication Issues
**Problem:** "Invalid credentials" or authentication failures
**Solutions:**
- Verify Workflowy username/password are correct
- Try logging into Workflowy web interface to confirm credentials
- Check if Workflowy account requires 2FA (not currently supported)
- Set credentials in client configuration rather than server fallback

### Debug Commands

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

**Check Claude Code Connection:**
```bash
# List all MCP servers
claude mcp list

# Remove server if needed
claude mcp remove workflowy-remote -s local

# Re-add server
claude mcp add --transport http workflowy-remote https://your-worker.workers.dev/mcp --header "Authorization: Bearer YOUR-KEY"
```

## API Reference

### MCP Protocol Endpoints

- **POST /mcp** - MCP JSON-RPC endpoint
  - `initialize` - Initialize MCP session
  - `tools/list` - List available tools  
  - `tools/call` - Execute a tool

### Legacy REST Endpoints

- **GET /health** - Health check (no auth required)
- **GET /tools** - List tools in REST format
- **GET /** - Server information

### Available Tools

1. **list_nodes** - List Workflowy nodes
   - `parentId` (optional): Parent node ID
   
2. **search_nodes** - Search nodes by text
   - `query` (required): Search query
   
3. **create_node** - Create new node
   - `parentId` (required): Parent node ID
   - `name` (required): Node title
   - `description` (optional): Node content
   
4. **update_node** - Update existing node
   - `nodeId` (required): Node ID to update
   - `name` (optional): New title
   - `description` (optional): New content
   
5. **toggle_complete** - Toggle completion status
   - `nodeId` (required): Node ID
   - `completed` (required): "true" or "false"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.