# Workflowy MCP Server - Security Guide

## 🔒 Security Architecture

This remote MCP server implements multiple layers of security to protect your Workflowy data from unauthorized access.

### Security Features

1. **API Key Authentication**: Prevents unauthorized access to your deployed worker
2. **Client-Provided Credentials**: Your Workflowy credentials are never stored on the server
3. **Environment Variable Fallbacks**: Optional server-side credential storage for convenience
4. **HTTPS Encryption**: All data in transit is encrypted

## 🛡️ Deployment Security Setup

### Step 1: Generate API Keys

Create secure API keys that will authenticate MCP clients:

```bash
# Generate random API keys (recommended)
openssl rand -base64 32  # For your personal use
openssl rand -base64 32  # For additional users (if needed)
```

#### How API Key Validation Works

The worker validates API keys through the `ALLOWED_API_KEYS` environment variable:

```typescript
private validateApiKey(apiKey: string | null, env: any): boolean {
  if (!apiKey) return false;
  
  // Check against environment allowlist (comma-separated API keys)
  const allowedKeys = env.ALLOWED_API_KEYS?.split(',') || [];
  return allowedKeys.includes(apiKey);
}
```

#### API Key Configuration Examples

**Single User:**
```
ALLOWED_API_KEYS=X****N0x=
```

**Multiple Users/Clients:**
```
ALLOWED_API_KEYS=personal-key-here,work-laptop-key,mobile-client-key,team-member-key
```

**Environment-Specific Keys:**
```
# Production
ALLOWED_API_KEYS=prod-key-1,prod-key-2

# Staging  
ALLOWED_API_KEYS=staging-key-1,test-key-1,dev-key-1
```

### Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository:

**Required Secrets:**
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `ALLOWED_API_KEYS` - Comma-separated list of valid API keys

#### Setting ALLOWED_API_KEYS

In your GitHub repository, go to **Settings > Secrets and variables > Actions**, and add:

**Secret Name:** `ALLOWED_API_KEYS`  
**Secret Value:** Your comma-separated keys (no spaces):
```
key1,key2,key3
```

**Optional Secrets (fallback credentials):**
- `WORKFLOWY_USERNAME` - Your Workflowy username (optional)
- `WORKFLOWY_PASSWORD` - Your Workflowy password (optional)

### Step 2.5: Automated Deployment Testing

The GitHub Action automatically tests your deployment with comprehensive security validation:

#### What Gets Tested Automatically

1. **Health Check**: Verifies the worker is responding
2. **Root Endpoint**: Confirms server identity and version
3. **Tools Listing**: Validates available MCP tools
4. **Authentication Blocking**: Ensures unauthorized requests are rejected
5. **API Key Authentication**: Tests Bearer token authentication works

#### Deployment Output

After successful deployment, you'll see:

```
🧪 Verifying deployment at: https://your-worker-url.workers.dev
🔑 Using first API key for testing: XrZ8k3Nm9Q...
✅ Health check passed: {"status":"ok","server":"workflowy-remote","version":"0.1.3"}
✅ Root endpoint passed: workflowy-remote
✅ Tools endpoint passed - 5 tools available
✅ Authentication requirement working - unauthorized requests properly blocked
✅ API key authentication working - request processed
🎉 All deployment verification tests passed!
🚀 Your secure remote MCP server is ready at: https://your-worker-url.workers.dev
🔑 Use your API keys to authenticate MCP client requests
```

The GitHub Action automatically uses the first API key from your `ALLOWED_API_KEYS` secret for testing.

### Step 3: Configure MCP Client in Claude Desktop/Code

After deployment, configure your MCP client to connect to the remote server.

#### Find Your Worker URL

The GitHub Action automatically extracts and displays your worker URL after deployment. Look for this in the deployment logs:

```
✅ Captured worker URL: https://mcp-workflowy-remote-abc123.workers.dev
🚀 Your secure remote MCP server is ready at: https://mcp-workflowy-remote-abc123.workers.dev
```

Your worker URL will be displayed in the deployment verification step output.

#### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

**Option A: Client-Provided Credentials (Most Secure)**

```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://your-worker-url.workers.dev"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-api-key-here\"}"
      }
    }
  }
}
```

Then pass Workflowy credentials with each request by configuring tool parameters:

```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://your-worker-url.workers.dev"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-api-key-here\"}",
        "WORKFLOWY_USERNAME": "your-workflowy-username",
        "WORKFLOWY_PASSWORD": "your-workflowy-password"
      }
    }
  }
}
```

**Option B: Server-Side Fallback (Convenience)**

If you configured `WORKFLOWY_USERNAME` and `WORKFLOWY_PASSWORD` secrets during deployment:

```json
{
  "mcpServers": {
    "workflowy-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://your-worker-url.workers.dev"],
      "env": {
        "MCP_FETCH_HEADERS": "{\"Authorization\": \"Bearer your-api-key-here\"}"
      }
    }
  }
}
```

#### Claude Code Configuration

For Claude Code, add to your MCP settings:

**Option A: With Client Credentials**

```json
{
  "servers": {
    "workflowy-remote": {
      "url": "https://your-worker-url.workers.dev",
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

**Option B: Server-Side Fallback Only**

```json
{
  "servers": {
    "workflowy-remote": {
      "url": "https://your-worker-url.workers.dev",
      "headers": {
        "Authorization": "Bearer your-api-key-here"
      }
    }
  }
}
```

#### Configuration File Locations

**Claude Desktop:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Claude Code:**
- Add to your project's MCP configuration or global settings

## 🔐 Authentication Flow

### Request Authentication

1. **API Key Validation**: Server checks `Authorization: Bearer {api-key}` header
2. **Credential Priority**: Client credentials override server fallbacks
3. **Tool Execution**: Only authenticated requests can execute Workflowy operations

### Security Layers

```
┌─────────────────────────┐
│   MCP Client Request    │
└─────────────┬───────────┘
              │
              ▼
┌─────────────────────────┐
│  API Key Authentication │  ← First security layer
└─────────────┬───────────┘
              │
              ▼
┌─────────────────────────┐
│  Credential Extraction  │  ← Workflowy credentials
└─────────────┬───────────┘
              │
              ▼
┌─────────────────────────┐
│   Workflowy API Call    │  ← Actual operation
└─────────────────────────┘
```

## ⚡ Usage Examples

### List Nodes (with client credentials)

```bash
curl -X POST https://your-worker-url.workers.dev/tools/list_nodes \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowy_username": "your-username",
    "workflowy_password": "your-password"
  }'
```

### Create Node (using server fallback)

```bash  
curl -X POST https://your-worker-url.workers.dev/tools/create_node \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": "parent-node-id",
    "name": "New Task",
    "description": "Task description"
  }'
```

## 🚨 Security Considerations

### ✅ Secure Practices

- **Use strong API keys**: Generate cryptographically secure random keys
- **Rotate API keys regularly**: Update keys periodically 
- **Limit API key distribution**: Only share with trusted users
- **Use client credentials**: Most secure option for sensitive environments
- **Monitor access logs**: Check Cloudflare analytics for unusual activity

### ❌ Security Anti-Patterns

- **Never hardcode credentials**: Don't put credentials in client configuration files
- **Don't share API keys publicly**: Keep API keys secret and secure
- **Avoid logging sensitive data**: Ensure credentials aren't logged anywhere
- **Don't disable authentication**: Always require API keys for production

## 🔑 API Key Management

### Testing Your API Keys

#### Test Valid Key (Should Work)
```bash
curl -X POST https://your-worker-url.workers.dev/tools/list_nodes \
  -H "Authorization: Bearer your-valid-api-key" \
  -H "Content-Type: application/json" \
  -d '{"workflowy_username":"user","workflowy_password":"pass"}'
# Expected: 200 OK with Workflowy data
```

#### Test Invalid Key (Should Fail)
```bash
curl -X POST https://your-worker-url.workers.dev/tools/list_nodes \
  -H "Authorization: Bearer invalid-key" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: Error message with "Unauthorized - Invalid or missing API key"
```

#### Test No Key (Should Fail)
```bash
curl -X POST https://your-worker-url.workers.dev/tools/list_nodes \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: Error message with "Unauthorized - Invalid or missing API key"
```

### API Key Rotation

To rotate/update your API keys:

1. **Generate new keys:** `openssl rand -base64 32`
2. **Update GitHub secret:** Add new keys to `ALLOWED_API_KEYS` (keep old ones temporarily)
3. **Deploy:** Push to trigger deployment
4. **Update clients:** Configure Claude Desktop/Code with new keys
5. **Remove old keys:** Update `ALLOWED_API_KEYS` to remove old keys
6. **Deploy again:** Final deployment with only new keys

### Manual Configuration (Alternative)

If you prefer to set secrets manually with Wrangler:

```bash
# Set the allowed API keys directly
wrangler secret put ALLOWED_API_KEYS
# Prompt: Enter the value for ALLOWED_API_KEYS:
# Enter: your-key-1,your-key-2,your-key-3

# Verify it's set
wrangler secret list
```

## 🔍 Security Testing

### Automated Testing (Recommended)

The GitHub Action automatically performs comprehensive security testing during deployment. No manual testing required!

### Manual Testing (Optional)

If you want to manually verify your deployment security:

```bash
# Replace with your actual worker URL from deployment logs
WORKER_URL="https://your-actual-worker-url.workers.dev"
API_KEY="your-actual-api-key"

# Test 1: Unauthorized access should fail
curl -X POST "$WORKER_URL/tools/list_nodes" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: {"error":"Error executing tool: Unauthorized - Invalid or missing API key"}

# Test 2: Valid API key should work  
curl -X POST "$WORKER_URL/tools/list_nodes" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workflowy_username": "test", "workflowy_password": "test"}'
# Expected: Either success response or Workflowy credential error (both mean auth worked)
```

## 📋 Security Checklist

Before deploying to production:

- [ ] API keys generated and stored securely in GitHub secrets
- [ ] Cloudflare secrets configured (`ALLOWED_API_KEYS`)
- [ ] GitHub Action deployment completed with all tests passing
- [ ] Worker URL captured from deployment logs
- [ ] MCP client configured with proper headers and worker URL
- [ ] Access logging and monitoring enabled in Cloudflare dashboard
- [ ] API key rotation schedule established
- [ ] Team members trained on security practices

## 🆘 Security Incident Response

If you suspect unauthorized access:

1. **Immediately rotate API keys**: Update `ALLOWED_API_KEYS` secret
2. **Check access logs**: Review Cloudflare analytics for suspicious activity
3. **Verify Workflowy activity**: Check your Workflowy account for unauthorized changes
4. **Update client configurations**: Deploy new API keys to all authorized clients
5. **Consider temporary shutdown**: Disable worker if needed during investigation

## 📞 Support

For security questions or concerns:
- Check [Cloudflare Workers Security Documentation](https://developers.cloudflare.com/workers/platform/security/)
- Review [MCP Security Guidelines](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- Create an issue in this repository for implementation questions