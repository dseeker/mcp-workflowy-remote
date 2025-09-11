[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_mcp_workflowy_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=Workflowy%20MCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-workflowy%40latest%22%2C%22server%22%2C%22start%22%5D%2C%20%22env%22%3A%20%7B%22WORKFLOWY_USERNAME%22%3A%22%22%2C%20%22WORKFLOWY_PASSWORD%22%3A%20%22%22%7D%7D)

# Workflowy MCP

A Model Context Protocol (MCP) server for interacting with Workflowy. This server provides an MCP-compatible interface to Workflowy, allowing AI assistants to interact with your Workflowy lists programmatically.

<a href="https://glama.ai/mcp/servers/@danield137/mcp-workflowy">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@danield137/mcp-workflowy/badge" alt="mcp-workflowy MCP server" />
</a>

## What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI models to interact with external tools and APIs. This server implements MCP to allow AI assistants (like ChatGPT) to read and manipulate your Workflowy lists through a set of defined tools.

## 🚀 Quick Start

### Option 1: Anthropic Custom Connector (Recommended) 🎯

**For Claude Pro, Max, Team, or Enterprise users** - Connect your Workflowy account directly to Claude:

#### Step 1: Generate Your Authentication Token
```bash
curl -X POST https://mcp-workflowy-remote.daniel-bca.workers.dev/connector/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "your_workflowy_username", "password": "your_workflowy_password"}'
```

#### Step 2: Configure in Claude
1. Go to **Claude Settings** → **Connectors** → **Add Connector**
2. **Server URL**: `https://mcp-workflowy-remote.daniel-bca.workers.dev/mcp`
3. **Authentication**: Bearer Token
4. **API Key**: Use the token from Step 1
5. **Test & Grant Permissions**

#### Step 3: Start Using
Ask Claude natural language questions like:
- *"Show me all my project notes in Workflowy"*
- *"Create a new task under my Work list"*
- *"Search for meeting notes from last week"*

📖 **[Complete Setup Guide →](docs/ANTHROPIC_CONNECTOR_SETUP.md)**

### Option 2: Remote Server (Claude Code CLI)

Use our hosted server with Claude Code CLI:

```bash
# Add the remote MCP server using Claude Code CLI
claude mcp add --transport http workflowy-remote https://mcp-workflowy-remote.daniel-bca.workers.dev/mcp --header "Authorization: Bearer ********="

# Verify connection
claude mcp list
```

### Option 3: Local Server

![NPM Version](https://img.shields.io/npm/v/mcp-workflowy) ![NPM Downloads](https://img.shields.io/npm/dm/mcp-workflowy)

```bash
# Install and run locally
npm install -g mcp-workflowy
mcp-workflowy server start

# Or use npx
npx mcp-workflowy server start
```

## ✨ Features

- **🎯 Anthropic Custom Connector**: Native integration with Claude Pro/Max/Team/Enterprise
- **🔗 Workflowy Integration**: Connect to your Workflowy account with username/password
- **🌐 Multiple Deployment Options**: Anthropic connector, local server, or remote Cloudflare Workers
- **🔒 Secure Authentication**: Token-based authentication with client-provided credentials
- **⚡ Intelligent Metadata Hydration**: Enriched responses with context like parentName, hierarchy, siblings
- **🎯 Workflowy-Focused Operations**: Operations designed for real Workflowy usage patterns
- **🛠️ Complete CRUD Operations**: Create, read, update, delete, and move nodes
- **📊 Smart Defaults**: Optimized for performance with minimal token usage
- **🔍 Advanced Search**: Filter by depth, fields, preview length, and result limits

## 🛠️ Available Operations

### Core Operations
1. **list_nodes** - List nodes with intelligent metadata hydration
2. **search_nodes** - Search with advanced filtering and context enrichment
3. **get_node_by_id** - Get single node with full relationship details
4. **create_node** - Create new nodes with smart positioning
5. **update_node** - Modify existing nodes with validation
6. **delete_node** - Remove nodes safely
7. **move_node** - Reorganize nodes with priority control
8. **toggle_complete** - Mark completion with timestamp tracking

### Enhanced Capabilities
- **Smart Field Selection**: Use `includeFields` to request specific metadata
- **Context-Aware Responses**: Automatic hydration of parentName, hierarchy, siblings
- **Performance Optimization**: Only fetches requested metadata to minimize API calls
- **Workflowy-Native Patterns**: Operations aligned with real Workflowy workflows

## 💡 Example Usage

The MCP server enables natural AI interactions with your Workflowy data:

### Basic Operations
- *"Show all my notes on project XYZ in Workflowy"*
- *"Review the codebase, mark all completed notes as completed"*
- *"Given my milestones on Workflowy for this project, suggest what my next task should be"*

### Enhanced with Metadata
- *"Search for 'meeting' and show me the parent context for each result"*
- *"Find all incomplete items and tell me their hierarchy path"*
- *"List my grocery list with completion status and priority order"*

### Real-World Workflows
- **Project Management**: *"Show me all incomplete tasks under 'Q1 Goals' and suggest priorities based on deadlines"*
- **Content Planning**: *"Find all blog post ideas and organize them by topic and urgency"*
- **Daily Planning**: *"Create a daily agenda from my 'Today' list and move completed items to 'Done'"*
- **Research Organization**: *"Search for all research notes on AI and create a summary with source links"*
- **Meeting Prep**: *"List all action items from last week's meetings and their current status"*

### Smart Field Selection
```javascript
// Request only basic fields for performance
{ "includeFields": ["id", "name", "isCompleted"] }

// Request enhanced context for analysis
{ "includeFields": ["name", "parentName", "hierarchy", "siblings", "priority"] }
```

### Authentication Examples
```bash
# Generate secure token for Claude connector
curl -X POST https://mcp-workflowy-remote.daniel-bca.workers.dev/connector/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Use token in Claude custom connector configuration
# Server URL: https://mcp-workflowy-remote.daniel-bca.workers.dev/mcp
# Authentication: Bearer Token
# API Key: [token from response above]
```

## 🧪 Testing

![Tests](https://img.shields.io/badge/tests-66_passing-brightgreen) ![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

- ✅ **66+ unit tests** with **300+ assertions**
- ✅ **Complete authentication flow testing** including token generation, validation, and security
- ✅ **Anthropic connector integration testing** with production workflow validation
- ✅ **100% parameter coverage** for advanced search features
- ✅ **4-level deep hierarchy testing** with realistic mock data
- ✅ **Complete error scenario coverage** for all operations

```bash
npm test                    # All tests
npm run test:coverage       # Coverage report
npm test src/test/connector-authentication.test.ts  # Authentication tests only
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Installation Guide](docs/INSTALLATION.md)** | Detailed setup instructions for local and remote servers |
| **[Deployment Guide](docs/DEPLOYMENT.md)** | Deploy your own instance to Cloudflare Workers |
| **[API Reference](docs/API.md)** | Complete tool documentation and examples |
| **[Architecture](docs/ARCHITECTURE.md)** | System architecture and flow diagrams |
| **[Performance & Resilience](docs/PERFORMANCE.md)** | Caching, retry logic, error handling, and optimization features |
| **[Troubleshooting](docs/TROUBLESHOOTING.md)** | Common issues and solutions |
| **[Testing Guide](README-TESTING.md)** | Test patterns and mock data structure |
| **[ADR Documentation](adr/)** | Architecture Decision Records with compound operations design |

## 🔧 Development Commands

```bash
# Building
npm run build              # Build local server (Node.js)
npm run build:worker       # Build Cloudflare Worker

# Testing  
npm test                   # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only

# Development
npm start                  # Start local MCP server
npm run dev:worker         # Start Cloudflare Worker in dev mode

# Deployment
npm run deploy             # Deploy to production
npm run dry-run            # Test deployment

# Log Collection & Monitoring
./scripts/collect-logs.sh   # Collect worker logs (Linux/Mac)
./scripts/collect-logs.bat  # Collect worker logs (Windows)
```

## 🏗️ Deploy Your Own

Want to deploy your own instance? See the [Deployment Guide](docs/DEPLOYMENT.md) for:

- 🔐 Secure API key setup
- ⚡ GitHub Actions with automatic semantic versioning
- 🌍 Global Cloudflare Workers deployment
- ✅ Comprehensive deployment verification

## Contributing

Contributions are welcome! Please use [Conventional Commits](https://conventionalcommits.org/) for automatic semantic versioning:

```bash
feat: add new search functionality     # Minor version bump
fix: resolve authentication issue      # Patch version bump  
feat!: change MCP protocol to v2.0     # Major version bump
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.