# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server for Workflowy integration, providing both local server and Cloudflare Workers remote deployment capabilities. The server allows AI assistants to interact with Workflowy accounts programmatically.

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

# Start Cloudflare Worker in preview environment
npm run dev:preview
# or
wrangler dev --env preview
```

### Deployment

#### **Two-Environment Setup**
The project supports automatic branch-based deployment:

```bash
# Production deployment
npm run deploy                    # Manual production deployment
git push origin main             # Automatic production deployment

# Preview deployment  
npm run deploy:preview           # Manual preview deployment
git push origin preview          # Automatic preview deployment

# Pull request previews
# Create PR to main               # Automatic preview deployment for testing

# Dry run deployment (testing)
npm run dry-run
```

#### **Environment URLs**
- **Production**: `mcp-workflowy-remote.<subdomain>.workers.dev`
- **Preview**: `mcp-workflowy-remote-preview.<subdomain>.workers.dev`

#### **Environment Configuration**
- **Production**: Default environment in `wrangler.toml`, uses `ALLOWED_API_KEYS`
- **Preview**: `[env.preview]` in `wrangler.toml`, uses `ALLOWED_API_KEYS_PREVIEW`

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

### Cloudflare Workers - Two Environments

#### **Production Environment (Default)**
```bash
# Set production secrets (no --env flag)
wrangler secret put ALLOWED_API_KEYS
wrangler secret put WORKFLOWY_USERNAME  
wrangler secret put WORKFLOWY_PASSWORD
```

#### **Preview Environment** 
```bash
# Set preview secrets (with --env preview flag)
wrangler secret put ALLOWED_API_KEYS --env preview
wrangler secret put WORKFLOWY_USERNAME --env preview
wrangler secret put WORKFLOWY_PASSWORD --env preview
```

#### **GitHub Secrets Configuration**
For automatic deployments, set these repository secrets:
- `ALLOWED_API_KEYS` - Production API keys
- `ALLOWED_API_KEYS_PREVIEW` - Preview environment API keys  
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