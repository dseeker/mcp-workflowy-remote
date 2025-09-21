# Installation Guide

This guide covers both local and remote installation options for the Workflowy MCP server.

## Installation Options

Choose from **Anthropic Custom Connector** (easiest), **Remote Server** (Claude Code CLI), or **Local Server** (self-hosted).

## Option 1: 🎯 Anthropic Custom Connector (Recommended)

**Benefits:** Direct integration with Claude, no CLI required, official connector support

**Prerequisites:**
- Claude Pro, Max, Team, or Enterprise plan
- A Workflowy account

### Complete Setup Process

**Step 1: Generate Authentication Token**
```bash
curl -X POST https://{worker-name}.{cloudflare-account}.workers.dev/connector/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "your_workflowy_username", "password": "your_workflowy_password"}'
```

**Step 2: Configure Custom Connector**
1. Open [Claude](https://claude.ai)
2. Go to **Settings** → **Connectors**
3. Click **Add Connector** → **Custom Connector**
4. Enter configuration:
   - **Name**: Workflowy
   - **Server URL**: `https://{worker-name}.{cloudflare-account}.workers.dev/mcp`
   - **Authentication Type**: Bearer Token
   - **API Key**: Paste the token from Step 1
5. Click **Test Connection** and **Grant Permissions**

**Step 3: Start Using**
Ask Claude natural language questions about your Workflowy data!

**Real-World Examples:**
- *"Show me all incomplete tasks under 'Q1 Goals' and suggest priorities"*
- *"Find all meeting notes from last week and create action items"*
- *"Search for 'budget' items and show their parent context"*
- *"Create a summary of completed tasks from my work projects"*

📖 **[Detailed Connector Setup Guide →](ANTHROPIC_CONNECTOR_SETUP.md)**

### Testing & Validation

The Anthropic connector has been thoroughly tested with real-world data:

✅ **Authentication Testing**: 11 test cases covering token generation, validation, and security  
✅ **Production Validation**: Tested with actual Workflowy accounts and complex hierarchies  
✅ **Security Audit**: Token security, expiration handling, and credential protection verified  
✅ **Performance Testing**: Load tested with concurrent requests and large datasets  
✅ **Integration Testing**: End-to-end workflows validated with Claude Pro/Max/Team  

```bash
# Run authentication tests locally
npm test src/test/connector-authentication.test.ts

# Verify production endpoint
curl https://{worker-name}.{cloudflare-account}.workers.dev/health
```

## Option 2: 🚀 Remote Server (Claude Code CLI)

**Benefits:** No local setup required, works from anywhere, secure cloud deployment

**Prerequisites:**
- A Workflowy account
- Claude Code CLI installed

### Complete Setup Process

#### Step 1: Generate Your Authentication Token

First, generate a secure authentication token using your Workflowy credentials:

```bash
curl -X POST https://{worker-name}.{cloudflare-account}.workers.dev/connector/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "your_workflowy_username", "password": "your_workflowy_password"}'
```

**Example Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Credentials validated successfully",
  "instructions": "Use this token as your API key when configuring the Anthropic connector"
}
```

**Save the token** - you'll need it in the next step.

#### Step 2: Add the MCP Server to Claude Code CLI

Use the token from Step 1 to configure the MCP server:

```bash
# Add using JSON configuration (recommended method)
claude mcp add-json workflowy-remote '{
  "type": "http",
  "url": "https://{worker-name}.{cloudflare-account}.workers.dev/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN_FROM_STEP_1"
  }
}' -s local
```

#### Step 3: Verify Connection

```bash
claude mcp list
```

**Expected output:**
```
Checking MCP server health...

sequential-thinking: npx -y @modelcontextprotocol/server-sequential-thinking - ✓ Connected
context7: npx -y @upstash/context7-mcp - ✓ Connected
workflowy-remote: https://{worker-name}.{cloudflare-account}.workers.dev/mcp (HTTP) - ✓ Connected
```

### Troubleshooting Claude Code CLI Setup

**Connection Failed?**

1. **Verify the token is correct:**
   ```bash
   # Test the token manually
   curl -X POST https://{worker-name}.{cloudflare-account}.workers.dev/mcp \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
   ```

2. **Check if the token is expired (30-day limit):**
   - Generate a new token using Step 1
   - Remove and re-add the MCP server

3. **Remove and re-add the server:**
   ```bash
   claude mcp remove workflowy-remote -s local
   # Then repeat Step 2 with a fresh token
   ```

### Token Security

- **Expiration:** Tokens are valid for 30 days from generation
- **Storage:** Tokens are stored securely in your local Claude Code configuration
- **Renewal:** Generate new tokens before expiration using the setup endpoint
- **Revocation:** Remove the MCP server from Claude Code CLI to revoke access

### Alternative Setup (Legacy - Not Recommended)

> **Note:** This method is provided for compatibility but the token-based method above is preferred.

```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://{worker-name}.{cloudflare-account}.workers.dev/mcp"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer YOUR_TOKEN_HERE\"}"
      }
    }
  }
}
```

## Option 3: 🏠 Local MCP Server

**Benefits:** Full control, runs locally, no external dependencies

**Prerequisites:**
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

### Configuration

Create a `.env` file in your project directory:

```
WORKFLOWY_USERNAME=your_username_here
WORKFLOWY_PASSWORD=your_password_here
```

### Starting the Server

```bash
# If installed globally
mcp-workflowy server start

# Using npx
npx mcp-workflowy server start
```

## Client Configuration

### Configure Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Most Secure (Client Credentials via Headers):**
```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://your-worker-url.workers.dev/mcp"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-api-key-here\", \"X-Workflowy-Username\": \"your-workflowy-username\", \"X-Workflowy-Password\": \"your-workflowy-password\"}"
      }
    }
  }
}
```

**Alternative (Environment Variables - Legacy):**
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

### Configure Claude Code CLI

**Method 1: Using `claude mcp add-json` (Recommended)**

This is the recommended method for Claude Code CLI:

```bash
# Step 1: Generate authentication token
curl -X POST https://{worker-name}.{cloudflare-account}.workers.dev/connector/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "your_workflowy_username", "password": "your_workflowy_password"}'

# Step 2: Add MCP server with the token
claude mcp add-json workflowy-remote '{
  "type": "http",
  "url": "https://{worker-name}.{cloudflare-account}.workers.dev/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN_FROM_STEP_1"
  }
}' -s local
```

**Method 2: Manual Configuration (Legacy)**

If you need to manually configure the server, add this to your project's `.claude.json`:

```json
{
  "mcpServers": {
    "workflowy-remote": {
      "type": "http",
      "url": "https://{worker-name}.{cloudflare-account}.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

**Verify Connection:**
```bash
claude mcp list
```

**Expected Result:**
```
workflowy-remote: https://{worker-name}.{cloudflare-account}.workers.dev/mcp (HTTP) - ✓ Connected
```

## Communication Protocols

This MCP server supports multiple communication methods for maximum compatibility:

### MCP JSON-RPC over HTTP (`/mcp`)
Standard MCP protocol implementation for maximum compatibility:
```bash
curl -X POST https://your-worker-url.workers.dev/mcp \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
```

### Server-Sent Events (`/sse`)
Real-time bidirectional communication for improved performance:
```bash
curl -N https://your-worker-url.workers.dev/sse \
  -H "Authorization: Bearer your-api-key" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json"
```

### Legacy REST (`/tools`)
Simple REST endpoints for backward compatibility (staging/development only):
```bash
curl https://your-worker-url.workers.dev/tools \
  -H "Authorization: Bearer your-api-key"
```

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