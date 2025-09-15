# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server for Workflowy integration, providing both local server and Cloudflare Workers remote deployment capabilities. The server allows AI assistants to interact with Workflowy accounts programmatically.

## Documentation Structure

The project documentation is organized as follows:
- **README.md** - Overview, quick start, and feature highlights
- **docs/INSTALLATION.md** - Detailed setup instructions for local and remote servers
- **docs/DEPLOYMENT.md** - Deploy your own instance to Cloudflare Workers  
- **docs/API.md** - Complete tool documentation and examples
- **docs/ARCHITECTURE.md** - System architecture and flow diagrams
- **docs/TROUBLESHOOTING.md** - Common issues and solutions
- **README-TESTING.md** - Test patterns and mock data structure
- **adr/** - Architecture Decision Records for feature development and design decisions

## Claude Code CLI Setup

### Quick Setup for Remote Server

If you're using Claude Code CLI and want to connect to the remote Workflowy MCP server:

```bash
# Step 1: Generate authentication token
curl -X POST https://{worker-name}.{cloudflare-account}.workers.dev/connector/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "your_workflowy_username", "password": "your_workflowy_password"}'

# Step 2: Add the MCP server (replace YOUR_TOKEN_HERE with token from step 1)
claude mcp add-json workflowy-remote '{
  "type": "http",
  "url": "https://{worker-name}.{cloudflare-account}.workers.dev/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN_HERE"
  }
}' -s local

# Step 3: Verify connection
claude mcp list
```

**Expected output:** `workflowy-remote: https://{worker-name}.{cloudflare-account}.workers.dev/mcp (HTTP) - ✓ Connected`

### Troubleshooting Claude Code CLI Connection

If the connection fails:

1. **Check token validity:**
   ```bash
   curl -X POST https://{worker-name}.{cloudflare-account}.workers.dev/mcp \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
   ```

2. **Remove and re-add if needed:**
   ```bash
   claude mcp remove workflowy-remote -s local
   # Then repeat setup with fresh token
   ```

3. **Check server health:**
   ```bash
   curl https://{worker-name}.{cloudflare-account}.workers.dev/health
   ```

## Common Development Commands

### Building
```bash
# Build local server (Node.js target)
npm run build
# or 
bun run build

# Build Cloudflare Worker (browser target)
npm run build:worker
# or
bun run build:worker
```

### Testing
```bash
# Run all tests
npm test
# or
bun test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# Watch mode
npm run test:watch
```

### Development Server
```bash
# Start local MCP server
npm start
# or
node dist/index.js

# Start Cloudflare Worker in dev mode (production environment)
npm run dev:worker
# or
wrangler dev

# Start Cloudflare Worker in development mode
npm run dev:worker
# or
wrangler dev
```

### Deployment

#### **Version-Based Deployment**
The project uses Cloudflare Workers versions for preview testing:

```bash
# Production deployment
npm run deploy                    # Manual production deployment
git push origin main             # Automatic production deployment

# Preview versions (same worker, different version)
git push origin preview          # Creates preview version with unique URL
# Create PR to main               # Creates preview version for testing

# Manual version creation with persistent alias
wrangler versions upload --tag preview --preview-alias preview

# Dry run deployment (testing)
npm run dry-run
```

#### **Deployment URLs**
- **Production**: `https://mcp-workflowy-remote.<subdomain>.workers.dev`
- **Persistent Preview**: `https://preview-mcp-workflowy-remote.<subdomain>.workers.dev` (always latest)
- **Version-specific**: `https://<version-id>-mcp-workflowy-remote.<subdomain>.workers.dev`
- **Pull Requests**: `https://pr<number>-mcp-workflowy-remote.<subdomain>.workers.dev`

#### **Configuration**
- **Single Worker**: All versions use same `wrangler.toml` configuration
- **API Keys**: All versions use same `ALLOWED_API_KEYS` (same worker)

## Architecture

### Dual Runtime Architecture
The project supports two distinct runtime environments:

1. **Local Server** (`src/index.ts`) - Node.js MCP server using FastMCP framework
2. **Remote Worker** (`src/worker.ts`) - Cloudflare Workers implementation with custom MCP JSON-RPC handling

### Core Components

**MCP Tools** (`src/tools/workflowy.ts`):
- `list_nodes` - List root or child nodes with filtering and preview (maxDepth, includeFields, preview)
- `search_nodes` - Search with advanced filtering (limit, maxDepth, includeFields, preview)
- `create_node` - Create new nodes
- `update_node` - Modify existing nodes  
- `toggle_complete` - Mark nodes complete/incomplete

**Workflowy Client** (`src/workflowy/client.ts`):
- Handles Workflowy API authentication and operations
- Shared between both local and remote implementations

**Configuration** (`src/config.ts`):
- Environment-aware configuration (development/staging/production)
- CORS, authentication, and feature flags management
- Used exclusively by Cloudflowy Workers implementation

### Key Dependencies

**Runtime & Framework**:
- `bun` - Primary build tool and test runner (use `npm install -g bun` on Windows for compatibility)
- `fastmcp` - MCP server framework for local implementation
- `@modelcontextprotocol/sdk` - Official MCP protocol SDK

**Workflowy Integration**:
- `workflowy` - Third-party Workflowy API client library

**Schema & Validation**:
- `zod` - Schema validation for tool parameters
- `@valibot/to-json-schema` - Convert Zod schemas to JSON Schema for MCP

**Worker Environment**:
- `wrangler` - Cloudflare Workers CLI for deployment
- `effect` - Functional programming utilities

## Environment Configuration

### Local Development
Create `.env` file:
```
WORKFLOWY_USERNAME=your_username
WORKFLOWY_PASSWORD=your_password
ALLOWED_API_KEYS=local-key-1,local-key-2
```

### Cloudflare Workers - Versioned Deployment

#### **Worker Secrets Configuration**
```bash
# Set secrets for the worker (used by all versions)
wrangler secret put ALLOWED_API_KEYS
wrangler secret put WORKFLOWY_USERNAME  # Optional fallback
wrangler secret put WORKFLOWY_PASSWORD  # Optional fallback
```

#### **GitHub Secrets Configuration**
For automatic deployments, set these repository secrets:
- `ALLOWED_API_KEYS` - API keys (used by both production and preview versions)
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

## Testing Architecture

The project uses Bun as the test runner with comprehensive test coverage:

- **Unit Tests** (`src/test/workflowy-tools-simple.test.ts`) - Tool functionality with mocked responses
- **Integration Tests** (`src/test/integration-basic.test.ts`) - End-to-end MCP protocol testing
- **Mock Data** (`src/test/mocks/workflowy-responses.ts`) - Realistic Workflowy API response fixtures

Tests cover advanced search parameters extensively with 4-level deep hierarchy validation.

## Protocol Support

### MCP HTTP Transport (Remote)
- JSON-RPC over HTTP at `/mcp` endpoint
- Server-Sent Events at `/sse` endpoint for real-time communication
- Legacy REST endpoints for backward compatibility (non-production only)

### MCP Stdio Transport (Local)
- Standard stdin/stdout MCP communication for local server

## Security & Authentication

**Multi-tier credential handling**:
1. Client-provided credentials (most secure)
2. HTTP headers (`X-Workflowy-Username`, `X-Workflowy-Password`)
3. Environment variable fallbacks

**API Key Authentication** (Workers only):
- Bearer token authentication required for all endpoints except `/health`
- Environment-specific validation and CORS policies

## Semantic Versioning

The project uses automated semantic versioning:
- Conventional commit messages determine version bumps
- GitHub Actions handle automatic releases and deployment
- After deployment, run `git pull origin main` to sync version updates
- Before commiting to git, fetch if there are any updates in the branch