#!/bin/bash

# Debug mode
set -x

# Step 1: Initialize a session
echo "Step 1: Initializing session..."

# Add the required Accept headers
RESPONSE=$(curl -s -i -X POST http://localhost:3000/mcp \
-H "Content-Type: application/json" \
-H "Accept: application/json, text/event-stream" \
-d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "test-client",
      "version": "1.0.0"
    }
  }
}')

echo "Full response:"
echo "$RESPONSE"

# Extract response type
CONTENT_TYPE=$(echo "$RESPONSE" | grep -i "Content-Type:" | cut -d' ' -f2 | tr -d '\r')
echo "Content-Type: $CONTENT_TYPE"

# Extract session ID
SESSION_ID=$(echo "$RESPONSE" | grep -i "mcp-session-id:" | cut -d' ' -f2 | tr -d '\r')
echo "Session ID: $SESSION_ID"

# Extract JSON from SSE response
if [[ $CONTENT_TYPE == *"text/event-stream"* ]]; then
    echo "Parsing SSE response..."
    # Extract JSON data from SSE format
    JSON_DATA=$(echo "$RESPONSE" | grep "^data:" | sed 's/^data: //' | head -1)
    echo "JSON data:"
    echo "$JSON_DATA" | jq .
fi

# Step 2: Send initialized notification
echo -e "\nStep 2: Sending initialized notification..."
curl -s -X POST http://localhost:3000/mcp \
-H "Content-Type: application/json" \
-H "Accept: application/json, text/event-stream" \
-H "mcp-session-id: $SESSION_ID" \
-d '{"jsonrpc":"2.0","method":"notifications/initialized"}'

# Wait a moment for the notification to be processed
sleep 1

# Step 3: List available tools
echo -e "\nStep 3: Listing available tools..."
TOOLS_RESPONSE=$(curl -s -i -X POST http://localhost:3000/mcp \
-H "Content-Type: application/json" \
-H "Accept: application/json, text/event-stream" \
-H "mcp-session-id: $SESSION_ID" \
-d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')

echo "Tools response:"
echo "$TOOLS_RESPONSE"

# Extract and parse JSON from tools response
if echo "$TOOLS_RESPONSE" | grep -q "text/event-stream"; then
    echo "Parsing SSE tools response..."
    TOOLS_JSON=$(echo "$TOOLS_RESPONSE" | grep "^data:" | sed 's/^data: //' | head -1)
    echo "Tools JSON:"
    echo "$TOOLS_JSON" | jq .
else
    echo "Direct JSON response:"
    echo "$TOOLS_RESPONSE" | tail -n 1 | jq .
fi