# Anthropic Custom Connector Setup Guide

This guide explains how to configure the Workflowy MCP server as a custom connector in Anthropic's Claude interface.

## Overview

Anthropic's custom connectors allow Claude to interact with external services through MCP (Model Context Protocol) servers. This guide shows how to set up our Workflowy MCP server as a custom connector.

## Prerequisites

- Anthropic Claude Pro, Max, Team, or Enterprise plan
- Valid Workflowy account with username and password
- Access to our deployed Workflowy MCP server

## Setup Process

### Step 1: Obtain Your Authentication Token

Before configuring the connector in Claude, you need to create an authentication token:

1. **Visit the connector setup endpoint** (replace with your server URL):
   ```
   GET https://your-mcp-server.workers.dev/connector/setup
   ```

2. **Exchange your credentials for a token**:
   ```bash
   curl -X POST https://your-mcp-server.workers.dev/connector/setup \
     -H "Content-Type: application/json" \
     -d '{
       "username": "your_workflowy_username",
       "password": "your_workflowy_password"
     }'
   ```

3. **Save the returned token**:
   ```json
   {
     "success": true,
     "token": "eXVyX3VzZXJuYW1lOnlvdXJfcGFzc3dvcmQ6MTY5NDM3MjgwMDAwMA==",
     "message": "Credentials validated successfully",
     "instructions": "Use this token as your API key when configuring the Anthropic connector"
   }
   ```

### Step 2: Configure the Connector in Claude

1. **Access Claude Settings**:
   - Go to [Claude](https://claude.ai)
   - Navigate to Settings → Connectors

2. **Add New Connector**:
   - Click "Add Connector"
   - Choose "Custom Connector"

3. **Configure Connection Details**:
   - **Server URL**: `https://your-mcp-server.workers.dev/mcp`
   - **Authentication**: Bearer Token
   - **API Key**: Use the token from Step 1
   - **Name**: "Workflowy" (or your preferred name)

4. **Test Connection**:
   - Claude will test the connection
   - You should see available tools like `list_nodes`, `search_nodes`, etc.

5. **Grant Permissions**:
   - Review the requested permissions
   - Grant access to read and modify your Workflowy data

## Available Operations

Once configured, Claude can perform these operations on your Workflowy account:

### Core Operations
- **`list_nodes`** - List root or child nodes with filtering and preview
- **`search_nodes`** - Search with advanced filtering and context enrichment
- **`get_node_by_id`** - Get single node with full relationship details
- **`create_node`** - Create new nodes with smart positioning
- **`update_node`** - Modify existing nodes with validation
- **`delete_node`** - Remove nodes safely
- **`move_node`** - Reorganize nodes with priority control
- **`toggle_complete`** - Mark completion with timestamp tracking

### Example Usage

Once set up, you can use natural language with Claude:

- *"Show all my notes on project XYZ in Workflowy"*
- *"Create a new task under my 'Work' list"*
- *"Mark all completed items in my grocery list as done"*
- *"Search for meeting notes from last week"*

## Security Considerations

### Token Security
- Tokens are valid for 30 days from creation
- Tokens contain encoded credentials - treat them as sensitive
- You can revoke access anytime through Claude's connector settings

### Data Access
- The connector can read and modify any data in your Workflowy account
- Only connect to trusted MCP server instances
- Monitor for unexpected changes in your Workflowy data

### Best Practices
- Use dedicated Workflowy accounts for testing
- Regularly review connector permissions in Claude settings
- Be aware of potential prompt injection attacks

## Troubleshooting

### Connection Issues

**"Authentication Failed"**
- Verify your Workflowy credentials are correct
- Check if your token has expired (30-day limit)
- Generate a new token using the setup endpoint

**"Server Unreachable"**
- Verify the MCP server URL is correct
- Check if the server is running and accessible
- Test the health endpoint: `GET /health`

**"Invalid Token Format"**
- Ensure you're using the complete token from the setup response
- Verify the token hasn't been truncated or modified

### Permission Issues

**"Tool Not Found"**
- Verify the MCP server is running the latest version
- Check the tools list endpoint: `GET /tools`
- Restart the connector configuration if needed

**"Access Denied"**
- Check your Workflowy account permissions
- Verify the token hasn't expired
- Try generating a new token

## Server Deployment URLs

### Production
- **Main Server**: `https://mcp-workflowy-remote.daniel-bca.workers.dev`
- **Setup Endpoint**: `https://mcp-workflowy-remote.daniel-bca.workers.dev/connector/setup`
- **MCP Endpoint**: `https://mcp-workflowy-remote.daniel-bca.workers.dev/mcp`

### Development/Testing
- **Preview Server**: `https://preview-mcp-workflowy-remote.daniel-bca.workers.dev`
- Replace with your actual deployment URLs

## API Reference

### Authentication Token Generation

```http
POST /connector/setup
Content-Type: application/json

{
  "username": "your_workflowy_username",
  "password": "your_workflowy_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "base64_encoded_token",
  "message": "Credentials validated successfully",
  "instructions": "Use this token as your API key when configuring the Anthropic connector"
}
```

### Setup Instructions Endpoint

```http
GET /connector/setup
```

**Response:**
```json
{
  "name": "Workflowy MCP Connector Setup",
  "description": "Setup endpoint for Anthropic custom connector integration",
  "instructions": {
    "step1": "POST your Workflowy credentials to this endpoint",
    "step2": "Receive a secure token in response", 
    "step3": "Use the token as API key when configuring the Anthropic connector",
    "step4": "Configure connector URL: /mcp"
  },
  "schema": {
    "method": "POST",
    "body": {
      "username": "your_workflowy_username",
      "password": "your_workflowy_password"
    }
  }
}
```

## Advanced Configuration

### Custom Headers (Optional)
If you prefer to use headers instead of tokens, you can still use:
- `X-Workflowy-Username`: Your Workflowy username
- `X-Workflowy-Password`: Your Workflowy password

### Environment Variables (Server-side)
For fallback authentication, the server supports:
- `WORKFLOWY_USERNAME`: Default username
- `WORKFLOWY_PASSWORD`: Default password
- `ALLOWED_API_KEYS`: Comma-separated list of allowed API keys

## Support

For issues with:
- **Connector Setup**: Check this documentation and troubleshooting section
- **MCP Server**: See [main documentation](../README.md) and [troubleshooting guide](./TROUBLESHOOTING.md)
- **Workflowy API**: Consult [Workflowy's support resources](https://workflowy.com/help/)
- **Anthropic Connectors**: Check [Anthropic's connector documentation](https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)