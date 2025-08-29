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
- **Multiple Communication Protocols**: 
  - **MCP HTTP Transport**: Full support for MCP HTTP transport protocol (2024-11-05 spec)
  - **Server-Sent Events (SSE)**: Real-time bidirectional communication for improved performance
  - **Legacy REST**: Backward compatibility support
- **Environment-Aware Configuration**: Automatic environment detection (development/staging/production)
- **Advanced Security**:
  - API key authentication with environment-specific validation
  - CORS policies based on deployment environment
  - Rate limiting in staging/production environments
- **Remote Deployment**: Secure Cloudflare Workers deployment with comprehensive testing
- **Tool Operations**: Search, create, update, and mark nodes as complete/incomplete in your Workflowy
- **Semantic Versioning**: Automatic version management and changelog generation

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
claude mcp add --transport http workflowy-remote https://mcp-workflowy-remote.daniel-bca.workers.dev/mcp --header "Authorization: Bearer ********="

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
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer ******=\"}",
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

### Communication Protocols

This MCP server supports multiple communication methods for maximum compatibility:

#### MCP JSON-RPC over HTTP (`/mcp`)
Standard MCP protocol implementation for maximum compatibility:
```bash
curl -X POST https://your-worker-url.workers.dev/mcp \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
```

#### Server-Sent Events (`/sse`)
Real-time bidirectional communication for improved performance:
```bash
curl -N https://your-worker-url.workers.dev/sse \
  -H "Authorization: Bearer your-api-key" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json"
```

#### Legacy REST (`/tools`)
Simple REST endpoints for backward compatibility (staging/development only):
```bash
curl https://your-worker-url.workers.dev/tools \
  -H "Authorization: Bearer your-api-key"
```

### Deployment Environments

The server supports two deployment environments with automatic branch-based deployment:

#### **Production Environment**
- **URL**: `https://mcp-workflowy-remote.<subdomain>.workers.dev`
- **Trigger**: Push to `main` branch or manual deployment
- **Configuration**: Maximum security, optimized performance, production rate limits
- **API Keys**: Use production `ALLOWED_API_KEYS`

#### **Preview Environment**  
- **URL**: `https://mcp-workflowy-remote-preview.<subdomain>.workers.dev`
- **Trigger**: Push to `preview` branch or pull requests to `main`
- **Configuration**: Debug enabled, relaxed CORS, higher rate limits for testing
- **API Keys**: Use preview `ALLOWED_API_KEYS_PREVIEW`

#### **Branch-based Deployment**
```bash
# Automatic deployments
git push origin main      # → Production deployment
git push origin preview   # → Preview deployment

# Pull request previews
# Create PR to main        # → Automatic preview deployment

# Manual deployments
npm run deploy            # → Production
npm run deploy:preview    # → Preview
```

### Environment-Specific Behavior

The server automatically adapts its behavior based on the detected environment:

- **Preview**: Debug enabled, permissive CORS, higher rate limits (100/min), legacy REST enabled
- **Production**: Maximum security, strict CORS, production rate limits (60/min), legacy REST disabled

### Available Tools

This MCP server provides the following tools to interact with your Workflowy:

1. **list_nodes** - Get a list of nodes from your Workflowy (root nodes or children of a specified node) with filtering and preview options
2. **search_nodes** - Search for nodes by query text with advanced filtering and preview options
3. **create_node** - Create a new node in your Workflowy
4. **update_node** - Modify an existing node's text or description
5. **toggle_complete** - Mark a node as complete or incomplete
6. **delete_node** - Delete a node from your Workflowy
7. **move_node** - Move a node to a different parent with optional priority control
8. **get_node_by_id** - Get a single node by its ID with full details and filtering options

### Enhanced List & Search Features

Both **list_nodes** and **search_nodes** tools include powerful parameters for optimized performance and precise results.

#### **list_nodes - Smart Node Listing**

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

#### **Advanced Search Features**

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

#### **Performance Benefits**
Both `list_nodes` and `search_nodes` offer these optimization features:
- **Token Limit Protection**: Field filtering and depth control prevent large responses that could exceed Claude Code's 25k token limit
- **Faster Processing**: Smaller responses load faster and use less bandwidth
- **Content Preview**: Truncate long content to reduce response size while maintaining readability
- **Precise Control**: Get exactly the data structure you need for your use case
- **Smart Defaults**: `list_nodes` uses minimal fields by default for maximum efficiency

#### **Example Usage with Preview**
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

#### Step 3: Deploy with Automatic Versioning
Push to main/master branch. The GitHub Action automatically:
- **Semantic Versioning**: Analyzes commit messages and creates new versions
- **Version Management**: Updates package.json and creates GitHub releases  
- **Changelog Generation**: Creates and updates CHANGELOG.md
- **Builds and Deployment**: Builds and deploys the versioned worker
- **Security Validation**: Runs comprehensive security and functionality tests
- **Release Notifications**: Shows deployment success with version and worker URL

**How Semantic Versioning Works:**
1. **Push commits** to main/master branch
2. **Semantic-release analyzes** commit messages since last release
3. **Version calculation** based on conventional commit types
4. **Release commit created** with updated package.json, package-lock.json, and CHANGELOG.md
5. **Git tag created** (e.g., `v0.1.5`) to mark the release
6. **Worker deployed** with new version
7. **Pull the release commit** locally to sync package.json version

**Semantic Versioning Rules:**
- `feat:` commits trigger **minor** version bumps (0.1.0 → 0.2.0)
- `fix:` commits trigger **patch** version bumps (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` triggers **major** version bumps (0.1.0 → 1.0.0)
- Other commits (`docs:`, `chore:`, etc.) trigger **patch** version bumps

**Important:** After deployment, run `git pull origin main` to sync the version update commit created by semantic-release.

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

**Option 1: Using HTTP Transport with Headers (Recommended)**
```json
{
  "mcpServers": {
    "workflowy-remote": {
      "type": "http",
      "url": "https://your-worker-url.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer your-api-key-here",
        "X-Workflowy-Username": "your-workflowy-username",
        "X-Workflowy-Password": "your-workflowy-password"
      }
    }
  }
}
```

**Option 2: Using Fetch Server with Environment Variables**
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
  "version": "0.1.5",
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

#### 6. Semantic Versioning Confusion
**Problem:** Local package.json version doesn't match deployed version
**Solutions:**
- **This is normal!** Semantic-release creates a commit with updated package.json on the remote
- Run `git pull origin main` to get the semantic-release commit locally
- Check `git log --oneline origin/main -5` to see if there's a `chore(release): X.X.X [skip ci]` commit
- Semantic-release uses git tags (not package.json) to track what's been released
- The deployment version always reflects the actual released version

#### 7. Bun Installation and Build Issues on Windows
**Problem:** `bun: command not found` or build failures when setting up local development
**Symptoms:**
- Error: `/usr/bin/bash: line 1: bun: command not found`
- Error: `Bun failed to remap this bin to its proper location within node_modules`
- Error: `EINVAL: Failed to replace old lockfile with new lockfile on disk`
- Build process fails with corrupted node_modules

**What we tried and what didn't work:**
1. ❌ **PowerShell installation script failed**: `powershell -c "irm bun.com/install.ps1 | iex"`
   - Returned error: "The remote server returned an error: (308) Permanent Redirect"
   - This is the official method but can fail due to network/redirect issues

2. ❌ **Bun lockfile issues**: `bun install` after npm-based global installation
   - Error: "EINVAL: Failed to replace old lockfile with new lockfile on disk" 
   - This occurs when there are permission issues or conflicting lockfiles

3. ❌ **Forcing bun install**: `bun install --force`
   - Still failed with lockfile replacement errors on Windows
   - Indicates fundamental bun/Windows filesystem compatibility issues

**What ultimately worked:**
1. ✅ **Install Bun via npm globally**: 
   ```bash
   cd "D:\Dados\Code\mcp-workflowy-remote"
   npm install -g bun
   ```
   - This installs Bun as a Node.js package rather than native binary
   - Avoids Windows-specific installation script issues
   - Version installed: `1.2.21`

2. ✅ **Use npm for dependency installation**:
   ```bash
   npm install  # Use npm instead of bun for dependencies
   ```
   - Avoids bun lockfile issues on Windows
   - Still allows using bun for build process
   - Resolved dependency conflicts and warnings successfully

3. ✅ **Build with npm script (which uses bun internally)**:
   ```bash
   npm run build  # This runs: bun build ./src/index.ts --outdir dist --target node
   ```
   - Once bun is globally available, npm scripts can use it
   - Build completed successfully: "Bundled 1099 modules in 740ms"

**Why this approach works:**
- **Bun vs npm**: Bun is a faster JavaScript runtime/toolkit, but npm can install dependencies just as well
- **Compatibility**: npm has better Windows compatibility for dependency installation
- **Hybrid approach**: Use npm for setup, bun for performance-critical build operations
- **Path issues avoided**: Global npm installation of bun ensures it's in PATH correctly

**Complete working setup sequence:**
```bash
# 1. Navigate to project directory
cd "D:\Dados\Code\mcp-workflowy-remote"

# 2. Install Bun via npm (avoids Windows installation issues)
npm install -g bun

# 3. Verify Bun installation
bun --version  # Should show: 1.2.21

# 4. Install project dependencies with npm (avoids lockfile issues)
npm install

# 5. Build project (uses bun internally via npm script)
npm run build

# 6. Add to Claude Code MCP configuration
claude mcp add workflowy --scope user --env WORKFLOWY_USERNAME=your_username --env WORKFLOWY_PASSWORD=your_password -- node "D:\Dados\Code\mcp-workflowy-remote\dist\index.js" server start

# 7. Verify connection
claude mcp list  # Should show: workflowy: ... - ✓ Connected
```

**Alternative solutions if npm method fails:**
- **Use WSL2**: Install Windows Subsystem for Linux and run bun natively there
- **Use Docker**: Run the entire development environment in a Docker container
- **Use pure npm**: Modify package.json scripts to use standard Node.js tools instead of bun

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

1. **list_nodes** - List Workflowy nodes with filtering and preview options
   - `parentId` (optional): Parent node ID
   - `maxDepth` (optional): Maximum depth of children to include (0=no children, 1=first level, etc. default: 0)
   - `includeFields` (optional): Fields to include in response. Available: id, name, note, isCompleted (default: id, name)
   - `preview` (optional): Truncate content fields (name, note) to specified number of characters
   
2. **search_nodes** - Search nodes by text with advanced filtering
   - `query` (required): Search query
   - `limit` (optional): Maximum number of results to return
   - `maxDepth` (optional): Maximum depth of children to include (default: 0)
   - `includeFields` (optional): Fields to include in response. Available: id, name, note, isCompleted (default: all)
   - `preview` (optional): Truncate content fields (name, note) to specified number of characters
   
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

6. **delete_node** - Delete a node
   - `nodeId` (required): Node ID to delete

7. **move_node** - Move a node to different parent with priority control
   - `nodeId` (required): Node ID to move
   - `newParentId` (required): New parent node ID
   - `priority` (optional): Priority/position within the new parent (0 = first position)

8. **get_node_by_id** - Get single node by ID with full details and filtering
   - `nodeId` (required): Node ID to retrieve
   - `maxDepth` (optional): Maximum depth of children to include (0=no children, 1=first level, etc. default: 0)
   - `includeFields` (optional): Fields to include in response. Available: id, name, note, isCompleted (default: all)
   - `preview` (optional): Truncate content fields (name, note) to specified number of characters

## 🧪 Testing

The project includes a comprehensive test suite ensuring reliability and full coverage of advanced search parameters.

**Quick Stats:**
- ✅ **55 unit tests** with **223+ assertions**
- ✅ **100% parameter coverage** for advanced search features (`limit`, `maxDepth`, `includeFields`, `preview`)
- ✅ **4-level deep hierarchy testing** with realistic mock data
- ✅ **Complete error scenario coverage** for all 8 operations including new critical operations (delete_node, move_node, get_node_by_id)

**Run Tests:**
```bash
npm test                    # All tests
npm run test:unit           # Unit tests only
npm run test:coverage       # Coverage report
```

For detailed testing documentation, test patterns, mock data structure, and how to write new tests, see **[README-TESTING.md](README-TESTING.md)**.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Commit Message Format

This project uses [Conventional Commits](https://conventionalcommits.org/) for automatic semantic versioning:

**Format:** `<type>(<scope>): <description>`

**Types:**
- `feat:` - New features (triggers minor version bump)
- `fix:` - Bug fixes (triggers patch version bump)
- `docs:` - Documentation changes (triggers patch version bump)
- `style:` - Code style changes (triggers patch version bump)
- `refactor:` - Code refactoring (triggers patch version bump)
- `test:` - Adding or fixing tests (triggers patch version bump)
- `chore:` - Maintenance tasks (triggers patch version bump)
- `ci:` - CI/CD changes (triggers patch version bump)

**Breaking Changes:** Add `BREAKING CHANGE:` in commit body or `!` after type (triggers major version bump)

**Examples:**
```
feat: add search functionality to Workflowy nodes
fix: resolve authentication issue with HTTP headers
docs: update installation instructions for Claude Code
feat!: change MCP protocol to version 2.0

BREAKING CHANGE: MCP protocol updated to v2.0, requires client updates
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.