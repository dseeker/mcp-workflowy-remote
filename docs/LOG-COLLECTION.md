# Log Collection Guide

This guide explains how to collect and analyze logs from your Cloudflare Workers deployment, both locally and through GitHub Actions.

## Overview

The project provides multiple ways to collect logs:

1. **GitHub Actions** - Automatic log collection during deployments
2. **Local Scripts** - Manual log collection with real-time and historical options
3. **Wrangler CLI** - Direct access to real-time logs

## Worker Logging Configuration

The worker is configured in `wrangler.toml` to enable comprehensive logging:

```toml
# Observability configuration for comprehensive logging
# Note: logpush requires Enterprise plan, using basic observability instead
[observability]
enabled = true

[observability.logs]
enabled = true
invocation_logs = true
head_sampling_rate = 1.0  # Log 100% of requests
```

### Configuration Options

- **`observability.enabled = true`**: Enables the Workers Observability feature
- **`observability.logs.enabled = true`**: Enables log persistence and collection
- **`invocation_logs = true`**: Includes request/response metadata in logs
- **`head_sampling_rate = 1.0`**: Logs 100% of requests (adjust for high-traffic scenarios)

### Plan Requirements

- **Basic Observability**: Available on Free and Paid Workers plans
- **Logpush (`logpush = true`)**: Requires Enterprise plan (disabled in this configuration)
- **Real-time Logs**: Available via `wrangler tail` on all plans

### Important Notes

- **Billing**: Workers Logs billing begins April 21, 2025
- **Included**: Basic Workers Logs is included in both Free and Paid Workers plans
- **Minimum Wrangler**: Requires Wrangler 3.78.6+ for Workers Logs
- **Sampling**: For high-traffic applications, reduce `head_sampling_rate` (e.g., 0.1 for 10%)
- **Enterprise Features**: Logpush and advanced analytics require Enterprise plan

## GitHub Actions Log Collection

### Automatic Collection

The `.github/workflows/cloudflare-publish.yml` workflow automatically collects logs during deployments:

- **When**: After every production and preview deployment
- **Duration**: 35 seconds of real-time logs with test requests
- **Artifacts**: Logs are uploaded as GitHub artifacts with 7-day retention
- **Location**: Check the "Artifacts" section of completed workflow runs

### What's Collected

The GitHub Actions workflow collects:

- **Raw worker logs** (`worker_logs.json`) - Complete JSON log entries from `wrangler tail`
- **Request logs** (`workflow_logs.txt`) - Summary of test requests made during collection
- **Structured parsing** - Real-time parsing and display of application logs
- **Performance metrics** - Response times, cache operations, error rates

### Test Requests Made

During deployment verification, the workflow makes these test requests:

1. `GET /health` - Health check (no authentication)
2. `GET /` - Root endpoint information
3. `GET /tools` - Tools endpoint with valid API key
4. `GET /tools` - Tools endpoint without API key (should fail)
5. `POST /mcp` - MCP tools/list request with authentication
6. `POST /mcp` - Second MCP request (tests caching)
7. `GET /nonexistent-endpoint` - Invalid endpoint (error handling test)

## Local Log Collection

### Prerequisites

Add these variables to your `.env` file:

```env
# Required for all log collection
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Required for historical logs
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# Optional - for test requests
ALLOWED_API_KEYS=your_api_keys
WORKER_URL=https://your-worker.workers.dev
```

### Simple Real-time Collection

```bash
# Collect real-time logs for 30 seconds (default)
npm run logs

# Collect for specific duration
npm run logs -- --duration 60

# Use custom worker URL
npm run logs -- --worker-url https://custom-worker.workers.dev
```

### Advanced Collection Options

```bash
# Real-time logs only (30 seconds)
npm run logs:realtime

# Historical logs only (last 24 hours)
npm run logs:historical

# Both historical and real-time
npm run logs:both

# Custom time ranges
npm run logs:advanced -- --mode historical --hours 6
npm run logs:advanced -- --mode realtime --duration 120

# Custom worker
npm run logs:advanced -- --worker-name your-worker-name
```

### Historical Log Collection

Historical logs use the Cloudflare API to fetch past log entries:

```bash
# Last 24 hours (default)
npm run logs:historical

# Last 6 hours
npm run logs:advanced -- --mode historical --hours 6

# Specific worker
npm run logs:advanced -- --mode historical --worker-name custom-worker
```

**Note**: Historical log collection requires:
- `CLOUDFLARE_ACCOUNT_ID` in your `.env` file
- API token with Workers:Read permissions
- Worker name matching your deployment

### Output Files

Log collection creates files in the `logs/` directory:

- `historical-logs-{timestamp}.json` - Raw historical logs from Cloudflare API
- `realtime-logs-{timestamp}.json` - Real-time logs from `wrangler tail`
- `requests-{timestamp}.txt` - Log of test requests made during collection
- `summary-{timestamp}.json` - Analysis summary with metrics

## Understanding Log Output

### Real-time Log Format

```
📊 WORKER: GET /health | 200 | 45ms wall, 12ms cpu | ok
⚡ PERF [14:30:15] INFO: Request completed (/health) 45ms
📝 LOG  [14:30:15] INFO: Health check successful (/health)
```

- **📊 WORKER**: Request summary with method, endpoint, status, timing, outcome
- **⚡ PERF**: Performance metrics (when `performanceMetric: true`)
- **📝 LOG**: Application logs from your worker code
- **📜 TEXT**: Plain text logs
- **⚠️ RAW**: Unparsed log entries

### Historical Log Analysis

The historical log collection provides automatic analysis:

```
📊 Historical Log Summary:
   • Total requests: 1,247
   • Unique endpoints: 8
   • Errors: 3
   • Average response time: 89ms
   • Most active endpoint: /mcp
```

### Log Levels and Context

Worker logs include structured context:

```json
{
  "timestamp": "2025-01-15T14:30:15.123Z",
  "level": "INFO",
  "message": "Request completed",
  "context": {
    "endpoint": "/mcp",
    "duration": 45,
    "performanceMetric": true,
    "method": "POST",
    "status": 200
  }
}
```

## Direct Wrangler Access

For immediate log access without scripts:

```bash
# Real-time logs (prettified)
npx wrangler tail

# Raw JSON format
npx wrangler tail --format json

# Filter by status
npx wrangler tail --status error
npx wrangler tail --status ok

# Since specific time
npx wrangler tail --since 1642261200
```

## Troubleshooting

### Common Issues

**"CLOUDFLARE_API_TOKEN is required"**
- Add your Cloudflare API token to `.env`
- Get token from: Cloudflare Dashboard → My Profile → API Tokens

**"CLOUDFLARE_ACCOUNT_ID is required for historical logs"**
- Add your account ID to `.env`
- Find in: Cloudflare Dashboard → Right sidebar → Account ID

**"Failed to start wrangler tail"**
- Verify `wrangler` is installed: `npm list wrangler`
- Check authentication: `npx wrangler whoami`
- Ensure worker exists: `npx wrangler list`

**No logs appearing**
- Worker might not be receiving requests
- Try making test requests to generate logs
- Check if worker is deployed: `npx wrangler list`

### Log Collection Best Practices

1. **Use historical logs** for analyzing patterns and debugging past issues
2. **Use real-time logs** for monitoring active deployments and debugging current issues
3. **Set appropriate durations** - longer for troubleshooting, shorter for quick checks
4. **Save logs** for important debugging sessions
5. **Monitor performance metrics** to identify slow endpoints

### Integration with Monitoring

For production monitoring, consider:

- Setting up log forwarding to external services
- Creating alerts based on error rates
- Monitoring performance metrics over time
- Using the logs to optimize worker performance

## GitHub Actions Integration

The workflow logs are automatically available as artifacts after deployment. To download:

1. Go to your repository's Actions tab
2. Click on the latest workflow run
3. Scroll to "Artifacts" section
4. Download `worker-logs-production-{run_number}` or `worker-logs-preview-{run_number}`

These artifacts contain the same structured logs as local collection, helping you analyze deployment issues and verify functionality.