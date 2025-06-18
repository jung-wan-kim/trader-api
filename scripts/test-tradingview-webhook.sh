#!/bin/bash

# TradingView Webhook Test Script
# Usage: ./test-tradingview-webhook.sh [local|production] [secret]

ENV=${1:-local}
SECRET=${2:-test-secret-123}

if [ "$ENV" = "local" ]; then
    URL="http://localhost:54321/functions/v1/tradingview-webhook?secret=$SECRET"
else
    # Replace with your actual Supabase project URL
    PROJECT_REF="your-project-ref"
    URL="https://$PROJECT_REF.supabase.co/functions/v1/tradingview-webhook?secret=$SECRET"
fi

echo "Testing TradingView webhook at: $URL"
echo "================================"

# Test data
PAYLOAD='{
  "symbol": "AAPL",
  "action": "buy",
  "price": 150.25,
  "volume": 1000000,
  "text": "Test buy signal from script",
  "time": "'$(date -u +"%Y-%m-%d %H:%M:%S")'",
  "strategy": "jesse_livermore",
  "timeframe": "1h",
  "indicators": {
    "macd": 0.5,
    "wr": -20,
    "rsi": 65
  }
}'

echo "Sending test webhook..."
echo "Payload:"
echo "$PAYLOAD" | jq .
echo ""

# Send request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

# Check if successful
if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✅ Webhook test successful!"
else
    echo ""
    echo "❌ Webhook test failed!"
    echo "Please check:"
    echo "1. Secret token matches TRADINGVIEW_WEBHOOK_SECRET"
    echo "2. Edge Function is deployed"
    echo "3. Database table 'tradingview_webhooks' exists"
fi