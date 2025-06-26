#!/bin/bash

# Dispatcher App Trip Actions Debug and Fix Script
echo "🔧 DISPATCHER APP TRIP ACTIONS DEBUG & FIX"
echo "============================================"

cd "/Volumes/C/CCT APPS/dispatcher_app"

echo ""
echo "1️⃣ Checking for compilation errors..."
npm run build 2>&1 | grep -E "(error|Error|ERROR)" || echo "✅ No compilation errors found"

echo ""
echo "2️⃣ Checking environment variables..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
    grep -q "BOOKING_APP_URL" .env.local && echo "✅ BOOKING_APP_URL is set" || echo "❌ BOOKING_APP_URL missing"
    grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && echo "✅ NEXT_PUBLIC_SUPABASE_URL is set" || echo "❌ NEXT_PUBLIC_SUPABASE_URL missing"
    grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local && echo "✅ SUPABASE_SERVICE_ROLE_KEY is set" || echo "❌ SUPABASE_SERVICE_ROLE_KEY missing"
else
    echo "❌ .env.local file not found"
fi

echo ""
echo "3️⃣ Testing API endpoint accessibility..."
curl -X POST "https://dispatch.compassionatecaretransportation.com/api/trips/actions" \
  -H "Content-Type: application/json" \
  -d '{"tripId":"test","action":"approve"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s --max-time 10 || echo "❌ API endpoint not accessible"

echo ""
echo "4️⃣ Checking for any syntax errors in route file..."
node -c app/api/trips/actions/route.js && echo "✅ No syntax errors in route.js" || echo "❌ Syntax errors found in route.js"

echo ""
echo "5️⃣ Starting development server to check for runtime errors..."
echo "📝 You should now:"
echo "   1. Open https://dispatch.compassionatecaretransportation.com/trips/individual"
echo "   2. Login as a dispatcher"
echo "   3. Try to approve a trip"
echo "   4. Check browser console and network tab for specific error details"
echo ""
echo "🔍 If you see errors, check:"
echo "   - Browser console (F12)"
echo "   - Network tab for failed requests"
echo "   - Server logs if running locally"
