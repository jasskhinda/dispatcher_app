#!/bin/bash

# Test Dispatcher API Endpoints
echo "🧪 Testing Dispatcher API Endpoints"
echo "===================================="

# Set the base URL
BASE_URL="https://dispatch.compassionatecaretransportation.com"

echo ""
echo "1. Testing API Health Check..."
echo "GET $BASE_URL/api/health"
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/health" || echo "❌ Health check failed"

echo ""
echo "2. Testing Trip Actions API..."
echo "POST $BASE_URL/api/trips/actions"

# Test with invalid data to see if endpoint exists
curl -X POST "$BASE_URL/api/trips/actions" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -w "Status: %{http_code}\n" \
  -s

echo ""
echo "3. Testing Send Reminder API..."
echo "POST $BASE_URL/api/trips/send-reminder"

curl -X POST "$BASE_URL/api/trips/send-reminder" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -w "Status: %{http_code}\n" \
  -s

echo ""
echo "📋 NOTES:"
echo "- Status 401/403: Authentication/Authorization issues"
echo "- Status 404: Endpoint not found"
echo "- Status 400: Bad request (expected for test data)"
echo "- Status 500: Internal server error"

echo ""
echo "🔧 NEXT STEPS:"
echo "1. Check server logs for detailed error messages"
echo "2. Verify environment variables are set correctly"
echo "3. Test with actual authentication headers"
