# Troubleshooting Guide

This guide covers common issues and their solutions when working with the Workflowy MCP server.

## Common Issues and Solutions

### 1. "Failed to connect" Error

**Problem:** MCP server shows as disconnected in `claude mcp list`

**Solutions:**
- Verify your worker URL includes `/mcp` endpoint: `https://your-worker.workers.dev/mcp`
- Check API key is correctly set in authorization header
- Test health endpoint first: `curl https://your-worker.workers.dev/health`
- Ensure GitHub Action deployment completed successfully

### 2. "Unauthorized" Error

**Problem:** API requests return 401 Unauthorized

**Solutions:**
- Verify `ALLOWED_API_KEYS` secret is set in GitHub repository
- Ensure API key matches exactly (no extra spaces/characters)
- Check that GitHub Action deployment uploaded secrets successfully
- Generate a new API key: `openssl rand -base64 32`

### 3. "Tools not found" Error

**Problem:** MCP server connects but no tools are available

**Solutions:**
- Test MCP protocol directly: use curl commands from verification section
- Check worker logs in Cloudflare dashboard for errors
- Verify Workflowy credentials are set (either in environment or client)
- Test legacy REST endpoint: `https://your-worker.workers.dev/tools`

### 4. GitHub Action Deployment Fails

**Problem:** Deployment workflow fails or times out

**Solutions:**
- Check all required secrets are set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ALLOWED_API_KEYS`
- Verify Cloudflare API token has correct permissions (Workers:Edit, Zone:Read)
- Ensure repository has Actions enabled
- Check workflow logs for specific error messages

### 5. Workflowy Authentication Issues

**Problem:** "Invalid credentials" or authentication failures

**Solutions:**
- Verify Workflowy username/password are correct
- Try logging into Workflowy web interface to confirm credentials
- Check if Workflowy account requires 2FA (not currently supported)
- Set credentials in client configuration rather than server fallback

### 6. Semantic Versioning Confusion

**Problem:** Local package.json version doesn't match deployed version

**Solutions:**
- **This is normal!** Semantic-release creates a commit with updated package.json on the remote
- Run `git pull origin main` to get the semantic-release commit locally
- Check `git log --oneline origin/main -5` to see if there's a `chore(release): X.X.X [skip ci]` commit
- Semantic-release uses git tags (not package.json) to track what's been released
- The deployment version always reflects the actual released version

### 7. Bun Installation and Build Issues on Windows

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

## Debug Commands

**Check Claude Code Connection:**
```bash
# List all MCP servers
claude mcp list

# Remove server if needed
claude mcp remove workflowy-remote -s local

# Re-add server
claude mcp add --transport http workflowy-remote https://your-worker.workers.dev/mcp --header "Authorization: Bearer YOUR-KEY"
```

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

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/dseeker/mcp-workflowy-remote/issues) page
2. Review the [Architecture Documentation](docs/ARCHITECTURE.md) for system details
3. Test with the debug commands above to isolate the issue
4. Create a new issue with:
   - Your operating system
   - Node.js version
   - Exact error messages
   - Steps to reproduce the issue