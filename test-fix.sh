#!/bin/bash

echo "🔧 TESTING DISPATCHER TRIP ACTIONS FIX"
echo "======================================"
echo ""

echo "1️⃣ Checking if dispatcher app is accessible..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404\|401"; then
    echo "✅ Dispatcher app is running on localhost:3000"
else
    echo "❌ Dispatcher app is not running"
    echo "💡 Start it with: cd dispatcher_app && npm run dev"
    exit 1
fi

echo ""
echo "2️⃣ Testing trip actions API endpoint..."

# Test with a mock request to see if it returns proper error handling
response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
    -X POST http://localhost:3000/api/trips/actions \
    -H "Content-Type: application/json" \
    -d '{"tripId":"test-trip-id","action":"approve"}')

http_status=$(echo $response | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo $response | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Response Status: $http_status"
echo "Response Body: $response_body"

if [ "$http_status" = "401" ] || [ "$http_status" = "403" ]; then
    echo "✅ API is working (authentication required, which is expected)"
elif [ "$http_status" = "400" ]; then
    echo "✅ API is working (bad request for test data, which is expected)"
elif [ "$http_status" = "500" ]; then
    echo "❌ API is returning internal server error - check logs"
    echo "💡 Check the terminal where you ran 'npm run dev' for error details"
else
    echo "ℹ️  API returned status $http_status"
fi

echo ""
echo "3️⃣ Environment check..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    if grep -q "BOOKING_APP_URL" .env.local; then
        echo "✅ BOOKING_APP_URL is configured"
    else
        echo "❌ BOOKING_APP_URL is missing from .env.local"
    fi
else
    echo "❌ .env.local file is missing"
fi

echo ""
echo "🎯 TESTING COMPLETE"
echo ""
echo "To test the actual fix:"
echo "1. Start the dispatcher app: npm run dev"
echo "2. Login as a dispatcher user"
echo "3. Navigate to: http://localhost:3000/trips/individual"
echo "4. Try approving or completing a trip"
echo "5. Check for improved error messages and fallback behavior"
