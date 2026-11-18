# CLAUDE.md

Docs live in `docs/` (DEPLOYMENT, ARCHITECTURE, TESTING, TROUBLESHOOTING, ...) and design decisions in `adr/`; read the relevant one before changing behaviour.

## Dual runtime
- Two entry points that must both keep working: `src/index.ts` (local Node MCP server, FastMCP, stdio) and `src/worker.ts` (Cloudflare Worker, custom JSON-RPC at `/mcp`). Shared code (e.g. `src/tools/`, `src/workflowy/`) must not use Node-only APIs.
- Bun is the build tool and test runner (`bun build`, `bun test`), not Jest or tsc.

## Credentials
- The Worker has no `WORKFLOWY_USERNAME`/`WORKFLOWY_PASSWORD` secrets: Workflowy credentials come per client (OAuth-stored or request headers). The only Worker secret is `ALLOWED_API_KEYS`.
- Never commit `.env` or print its values.

## Deploy model
- One Worker, one `wrangler.toml`. Push to `main` deploys production via `.github/workflows/cloudflare-publish.yml`; the `preview` branch and PRs to `main` create preview *versions* of the same Worker, not a separate environment.
- semantic-release creates a version commit on deploy: after a deploy, `git pull origin main`. Fetch before committing. Use conventional commit messages; they drive the version bump.
