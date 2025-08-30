# Deployment Guide

This guide covers deploying your own instance of the Workflowy MCP server to Cloudflare Workers.

## 🔐 Secure Remote Deployment

### Security Features

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

### Deployment Environments

The server supports production deployment with preview versions for testing:

#### **Production Deployment**
- **URL**: `https://mcp-workflowy-remote.<subdomain>.workers.dev`
- **Trigger**: Push to `main` branch or manual deployment
- **Configuration**: Maximum security, optimized performance, production rate limits
- **API Keys**: Use production `ALLOWED_API_KEYS`

#### **Preview Versions**  
- **Persistent URL**: `https://preview-mcp-workflowy-remote.<subdomain>.workers.dev` (always latest preview)
- **Version-specific URL**: `https://<version-id>-mcp-workflowy-remote.<subdomain>.workers.dev`
- **Pull Request URLs**: `https://pr<number>-mcp-workflowy-remote.<subdomain>.workers.dev`
- **Trigger**: Push to `preview` branch or pull requests to `main`
- **Configuration**: Same worker, different version for testing new features  
- **API Keys**: Uses same production `ALLOWED_API_KEYS` (same worker, just different version)

#### **Version-based Workflow**
```bash
# Production deployment
git push origin main      # → Updates production worker

# Preview versions (doesn't affect production)
git push origin preview   # → Creates new preview version
# Create PR to main        # → Creates preview version for PR

# Manual deployments  
npm run deploy            # → Production
wrangler versions upload --tag preview --preview-alias preview  # → Create preview version with persistent alias
```

### Preview vs Production

- **Preview Versions**: Test new features without affecting production users
- **Production**: Live worker serving real users
- **No Separate Workers**: Uses Cloudflare's versioned preview URLs on the same worker

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