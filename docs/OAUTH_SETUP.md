# OAuth Setup Guide for Claude Web Custom Connectors

This guide explains how to set up the OAuth-enabled version of the Workflowy MCP server for use with Claude Web Custom Connectors.

## Overview

The OAuth implementation provides a secure authentication flow that allows Claude Web to access your Workflowy account without storing your credentials permanently. The system maintains full backward compatibility with existing token-based authentication methods.

## Architecture

### Dual Authentication Support

The OAuth-enabled server supports multiple authentication methods:

1. **OAuth 2.0 Flow** (Claude Web Custom Connectors)
   - Authorization Code Grant with PKCE
   - Secure credential collection during authorization
   - Encrypted token storage in Cloudflare KV

2. **Token-based Authentication** (Claude Code CLI, Claude Desktop)
   - Bearer tokens from `/connector/setup` endpoint
   - Direct API key authentication
   - Header-based credential injection

3. **Environment Fallback** (Development)
   - Environment variable credentials
   - Test key authentication

### OAuth Flow for Claude Web

```mermaid
sequenceDiagram
    participant CW as Claude Web
    participant OS as OAuth Server
    participant WF as Workflowy API
    participant User

    CW->>OS: Authorization Request
    OS->>User: Show Credential Form
    User->>OS: Submit Workflowy Credentials
    OS->>WF: Validate Credentials
    WF->>OS: Validation Result
    OS->>CW: Authorization Code
    CW->>OS: Token Exchange Request
    OS->>CW: Access Token
    CW->>OS: MCP Requests with Token
    OS->>WF: API Calls with User Credentials
```

## Deployment Guide

### Prerequisites

- Cloudflare Workers account
- Wrangler CLI installed and configured
- Existing Workflowy MCP server deployment

### Automated Setup

1. **Run the OAuth setup script:**
   ```bash
   cd /path/to/mcp-workflowy-remote
   ./scripts/setup-oauth.sh
   ```

   This script will:
   - Create required KV namespaces
   - Update configuration with KV namespace IDs
   - Build the OAuth-enabled worker
   - Provide deployment instructions

### Manual Setup

1. **Create KV Namespaces:**
   ```bash
   # Production namespace
   wrangler kv:namespace create "OAUTH_KV" --preview false
   
   # Preview namespace  
   wrangler kv:namespace create "OAUTH_KV" --preview true
   ```

2. **Update wrangler.toml:**
   ```toml
   name = "mcp-workflowy-remote-oauth"
   compatibility_date = "2024-12-01"
   compatibility_flags = ["nodejs_compat", "nodejs_als"]
   
   main = "dist/oauth-wrapper.js"
   
   kv_namespaces = [
     { binding = "OAUTH_KV", id = "your-production-kv-id", preview_id = "your-preview-kv-id" }
   ]
   
   vars = { ENVIRONMENT = "production", DEBUG = "false", OAUTH_ENABLED = "true" }
   ```

3. **Build and Deploy:**
   ```bash
   # Build OAuth wrapper
   bun build ./src/oauth-wrapper.ts --outdir dist --target browser --format esm
   
   # Deploy OAuth-enabled version
   wrangler deploy --name mcp-workflowy-remote-oauth
   ```

4. **Configure Secrets:**
   ```bash
   wrangler secret put ALLOWED_API_KEYS
   wrangler secret put WORKFLOWY_USERNAME  # Optional fallback
   wrangler secret put WORKFLOWY_PASSWORD  # Optional fallback
   ```

## Claude Web Configuration

### Custom Connector Setup

1. **Open Claude Web Settings:**
   - Go to [Claude](https://claude.ai)
   - Navigate to Settings → Connectors

2. **Add Custom Connector:**
   - Click "Add Connector" → "Custom Connector"

3. **Configure Connection:**
   - **Name**: `Workflowy MCP`
   - **Remote MCP server URL**: `https://mcp-workflowy-remote-oauth.{subdomain}.workers.dev/mcp`
   - **OAuth Client ID**: *(leave empty for auto-registration)*
   - **OAuth Client Secret**: *(leave empty for auto-registration)*

4. **Test & Authorize:**
   - Click "Test Connection"
   - You'll be redirected to authorization page
   - Enter your Workflowy credentials
   - Grant permission for access
   - Return to Claude Web with successful connection

### Authorization Process

When you test the connection, Claude Web will:

1. **Redirect to Authorization Page**: Shows a secure form for Workflowy credentials
2. **Credential Validation**: Verifies credentials with Workflowy API
3. **Authorization Grant**: Returns authorization code to Claude Web
4. **Token Exchange**: Claude Web exchanges code for access token
5. **MCP Access**: Uses access token for all subsequent MCP requests

## OAuth Endpoints

The OAuth-enabled server provides these endpoints:

### Authorization Server Metadata
```
GET /.well-known/oauth-authorization-server
```

Returns OAuth server configuration:
```json
{
  "issuer": "https://your-worker.workers.dev",
  "authorization_endpoint": "https://your-worker.workers.dev/oauth/authorize",
  "token_endpoint": "https://your-worker.workers.dev/oauth/token",
  "scopes_supported": ["workflowy:read", "workflowy:write"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"]
}
```

### Authorization Endpoint
```
GET /oauth/authorize?response_type=code&client_id=...&redirect_uri=...&scope=...
```

Shows authorization form for credential collection.

### Token Endpoint
```
POST /oauth/token
```

Exchanges authorization code for access token:
```json
{
  "grant_type": "authorization_code",
  "code": "authorization_code",
  "redirect_uri": "callback_url",
  "client_id": "client_identifier"
}
```

## Security Features

### Credential Protection

1. **No Permanent Storage**: Workflowy credentials are encrypted and stored temporarily in KV
2. **Token Expiration**: Access tokens expire after 1 hour
3. **Secure Transit**: All communications use HTTPS
4. **PKCE Support**: Proof Key for Code Exchange prevents authorization code interception

### Token Management

- **Access Tokens**: 1-hour expiration, encrypted storage
- **Refresh Tokens**: 30-day expiration for token renewal
- **Authorization Codes**: 10-minute expiration, single-use
- **Automatic Cleanup**: Expired tokens are automatically removed

### Permission Scopes

- `workflowy:read`: Read access to lists, nodes, and search
- `workflowy:write`: Create, update, delete, and move operations

## Backward Compatibility

The OAuth-enabled server maintains full compatibility with existing authentication methods:

### Claude Code CLI
```bash
# Continue using token-based authentication
claude mcp add-json workflowy-remote '{
  "type": "http",
  "url": "https://mcp-workflowy-remote-oauth.{subdomain}.workers.dev/mcp",
  "headers": {
    "Authorization": "Bearer your-token-from-connector-setup"
  }
}' -s local
```

### Claude Desktop
```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://mcp-workflowy-remote-oauth.{subdomain}.workers.dev/mcp"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-token\"}"
      }
    }
  }
}
```

### Legacy Token Generation
```bash
# Generate token for CLI/Desktop use
curl -X POST https://mcp-workflowy-remote-oauth.{subdomain}.workers.dev/connector/setup \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'
```

## Troubleshooting

### Common Issues

**Authorization Failed**
- Verify Workflowy credentials are correct
- Check if Workflowy account has 2FA enabled (may require app password)
- Ensure network connectivity to Workflowy API

**Token Exchange Failed**
- Verify KV namespaces are correctly configured
- Check authorization code hasn't expired (10-minute limit)
- Confirm redirect URI matches exactly

**MCP Requests Failing**
- Check access token hasn't expired (1-hour limit)
- Verify OAuth token format (should start with `oauth_access_`)
- Confirm MCP server URL is correct

### Debug Endpoints

**Health Check with OAuth Info**
```bash
curl https://mcp-workflowy-remote-oauth.{subdomain}.workers.dev/health
```

**OAuth Metadata**
```bash
curl https://mcp-workflowy-remote-oauth.{subdomain}.workers.dev/.well-known/oauth-authorization-server
```

### Logs and Monitoring

Check Cloudflare Workers logs:
```bash
wrangler tail --name mcp-workflowy-remote-oauth
```

## Migration Guide

### From Token-based to OAuth

Existing Claude Code CLI and Desktop configurations continue to work unchanged. To migrate to OAuth:

1. Deploy OAuth-enabled version alongside existing server
2. Update Claude Web Custom Connectors to use OAuth endpoint
3. Existing CLI/Desktop can continue using token-based authentication
4. Gradually migrate clients to OAuth as needed

### Configuration Comparison

| Method | Endpoint | Authentication | Use Case |
|--------|----------|----------------|----------|
| OAuth | `/mcp` | OAuth 2.0 tokens | Claude Web Custom Connectors |
| Token | `/mcp` | Bearer tokens | Claude Code CLI, Desktop |
| Legacy | `/tools` | API keys | Backward compatibility |

## Best Practices

### Security
- Use OAuth for web-based Claude interfaces
- Use token-based auth for CLI/Desktop applications
- Regularly rotate API keys and secrets
- Monitor access patterns in Cloudflare analytics

### Performance
- OAuth tokens are cached for 1 hour to minimize KV reads
- Authorization codes have short lifetimes to reduce storage
- Failed authorization attempts are rate-limited

### Maintenance
- Monitor KV storage usage for OAuth data
- Set up alerts for authentication failures
- Keep wrangler and dependencies updated
- Regular backup of worker configuration

## Support

For issues with OAuth setup:
- Check [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- Review [OAuth 2.0 specification](https://tools.ietf.org/html/rfc6749)
- Submit issues to [project repository](https://github.com/dseeker/mcp-workflowy-remote/issues)

The OAuth implementation provides enterprise-grade security while maintaining the simplicity and performance of the original MCP server.