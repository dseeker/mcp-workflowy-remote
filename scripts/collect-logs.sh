#!/bin/bash
# Worker Log Collection Script
# Collects and analyzes Cloudflare Worker logs for debugging and monitoring

set -e

# Configuration
DURATION=${1:-30}  # Default 30 seconds
OUTPUT_FILE=${2:-worker_logs_$(date +%Y%m%d_%H%M%S).json}
WORKER_URL=${3:-"https://mcp-workflowy-remote.daniel-bca.workers.dev"}
API_KEY=${4:-$ALLOWED_API_KEYS}

echo "🚀 Cloudflare Worker Log Collection Tool"
echo "======================================="
echo "Duration: ${DURATION} seconds"
echo "Output: ${OUTPUT_FILE}"
echo "Worker URL: ${WORKER_URL}"
echo ""

# Check dependencies
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI not found"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq not found - log analysis will be limited"
    echo "Install jq for better log formatting"
fi

# Start log collection
echo "📡 Starting log collection..."
wrangler tail --format json > "$OUTPUT_FILE" &
TAIL_PID=$!

echo "🔄 Log collection started (PID: $TAIL_PID)"
echo "⏱️  Collecting logs for ${DURATION} seconds..."

# Wait a moment for wrangler tail to initialize
sleep 2

# Generate test requests if API key is provided
if [ -n "$API_KEY" ]; then
    echo "🧪 Generating test requests to create logs..."
    
    # Extract first API key if comma-separated
    FIRST_KEY=$(echo "$API_KEY" | cut -d',' -f1)
    
    # Test requests in background to generate logs
    (
        sleep 1
        echo "  • Testing health endpoint..."
        curl -s "$WORKER_URL/health" > /dev/null 2>&1 || true
        
        sleep 2
        echo "  • Testing authenticated endpoint..."
        curl -s "$WORKER_URL/tools" -H "Authorization: Bearer $FIRST_KEY" > /dev/null 2>&1 || true
        
        sleep 2
        echo "  • Testing MCP endpoint..."
        curl -s -X POST "$WORKER_URL/mcp" \
            -H "Authorization: Bearer $FIRST_KEY" \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc": "2.0", "id": "test", "method": "tools/list", "params": {}}' > /dev/null 2>&1 || true
            
        sleep 2
        echo "  • Testing error handling..."
        curl -s "$WORKER_URL/nonexistent" > /dev/null 2>&1 || true
        
        sleep 1
        echo "  • Testing unauthorized request..."
        curl -s "$WORKER_URL/tools" > /dev/null 2>&1 || true
        
    ) &
    TEST_PID=$!
else
    echo "⚠️  No API key provided - only passive log collection"
    TEST_PID=""
fi

# Wait for specified duration
sleep "$DURATION"

# Stop log collection
echo "🛑 Stopping log collection..."
kill $TAIL_PID 2>/dev/null || true
wait $TAIL_PID 2>/dev/null || true

# Stop test requests if running
if [ -n "$TEST_PID" ]; then
    kill $TEST_PID 2>/dev/null || true
    wait $TEST_PID 2>/dev/null || true
fi

echo "✅ Log collection completed"

# Analyze collected logs
echo ""
echo "📊 Log Analysis"
echo "==============="

if [ -f "$OUTPUT_FILE" ] && [ -s "$OUTPUT_FILE" ]; then
    LOG_COUNT=$(wc -l < "$OUTPUT_FILE" 2>/dev/null || echo "0")
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    
    echo "📁 File: $OUTPUT_FILE ($FILE_SIZE)"
    echo "📈 Total entries: $LOG_COUNT"
    
    if [ "$LOG_COUNT" -gt 0 ]; then
        echo ""
        echo "📋 Log Level Distribution:"
        
        ERROR_COUNT=$(grep -c '"level":"ERROR"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        WARN_COUNT=$(grep -c '"level":"WARN"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        INFO_COUNT=$(grep -c '"level":"INFO"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        DEBUG_COUNT=$(grep -c '"level":"DEBUG"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        
        echo "  🔴 ERROR:  $ERROR_COUNT"
        echo "  🟡 WARN:   $WARN_COUNT"
        echo "  🔵 INFO:   $INFO_COUNT"
        echo "  ⚪ DEBUG:  $DEBUG_COUNT"
        
        echo ""
        echo "🔍 Performance Features:"
        
        CACHE_HITS=$(grep -c '"cacheOperation":"hit"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        CACHE_MISSES=$(grep -c '"cacheOperation":"miss"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        CACHE_SETS=$(grep -c '"cacheOperation":"set"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        
        echo "  💾 Cache hits:   $CACHE_HITS"
        echo "  💾 Cache misses: $CACHE_MISSES"
        echo "  💾 Cache sets:   $CACHE_SETS"
        
        DEDUP_COUNT=$(grep -c 'Deduplicating request' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        RETRY_COUNT=$(grep -c 'Retry attempt' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        
        echo "  🔄 Deduplications: $DEDUP_COUNT"
        echo "  ↩️  Retry attempts: $RETRY_COUNT"
        
        # Performance metrics
        PERF_COUNT=$(grep -c '"performanceMetric":true' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        echo "  ⚡ Performance logs: $PERF_COUNT"
        
        # Request tracking
        REQUEST_IDS=$(grep -o '"requestId":"[^"]*"' "$OUTPUT_FILE" 2>/dev/null | sort | uniq | wc -l || echo "0")
        echo "  🏷️  Unique requests: $REQUEST_IDS"
        
        # Show recent logs
        if command -v jq &> /dev/null; then
            echo ""
            echo "📝 Recent Log Entries (last 5):"
            echo "================================"
            tail -5 "$OUTPUT_FILE" | while read -r line; do
                TIMESTAMP=$(echo "$line" | jq -r '.timestamp // "N/A"' 2>/dev/null)
                LEVEL=$(echo "$line" | jq -r '.level // "N/A"' 2>/dev/null)
                MESSAGE=$(echo "$line" | jq -r '.message // "N/A"' 2>/dev/null)
                echo "[$TIMESTAMP] $LEVEL: $MESSAGE"
            done
        else
            echo ""
            echo "📝 Recent Log Entries (raw JSON):"
            echo "================================="
            tail -3 "$OUTPUT_FILE" | head -3
        fi
        
        # Show errors if any
        if [ "$ERROR_COUNT" -gt 0 ]; then
            echo ""
            echo "🚨 Error Messages:"
            echo "=================="
            if command -v jq &> /dev/null; then
                grep '"level":"ERROR"' "$OUTPUT_FILE" | head -3 | while read -r line; do
                    MESSAGE=$(echo "$line" | jq -r '.message // "N/A"' 2>/dev/null)
                    CONTEXT=$(echo "$line" | jq -r '.context.error // "N/A"' 2>/dev/null)
                    echo "• $MESSAGE"
                    if [ "$CONTEXT" != "N/A" ]; then
                        echo "  Context: $CONTEXT"
                    fi
                done
            else
                grep '"level":"ERROR"' "$OUTPUT_FILE" | head -3
            fi
        fi
        
    else
        echo "⚠️  No log entries found"
    fi
    
else
    echo "❌ No logs collected or file is empty"
    echo ""
    echo "Possible reasons:"
    echo "• Worker is not receiving requests"
    echo "• wrangler tail failed to connect"
    echo "• Insufficient permissions"
    echo "• Worker is not deployed"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check worker deployment: wrangler deployments list"
    echo "2. Verify authentication: wrangler whoami"
    echo "3. Test worker directly: curl $WORKER_URL/health"
fi

echo ""
echo "🏁 Log collection complete!"
echo "📁 Logs saved to: $OUTPUT_FILE"

# Provide usage suggestions
echo ""
echo "💡 Usage Tips:"
echo "============="
echo "• View logs: cat '$OUTPUT_FILE'"
if command -v jq &> /dev/null; then
    echo "• Pretty print: jq . '$OUTPUT_FILE'"
    echo "• Filter errors: jq 'select(.level==\"ERROR\")' '$OUTPUT_FILE'"
    echo "• Performance logs: jq 'select(.context.performanceMetric==true)' '$OUTPUT_FILE'"
fi
echo "• Upload for analysis: Use as GitHub Actions artifact"
echo "• Monitor real-time: wrangler tail --format pretty"