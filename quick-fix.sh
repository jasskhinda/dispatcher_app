#!/bin/bash

# Quick Fix Script for Dispatcher Trip Approval Issue
echo "🔧 DISPATCHER TRIP APPROVAL QUICK FIX"
echo "====================================="

cd "/Volumes/C/CCT APPS/dispatcher_app"

echo ""
echo "1️⃣ Checking environment variables..."

# Check if .env.local exists and has required variables
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found"
    echo "Creating .env.local with required variables..."
    
    cat > .env.local << 'EOF'
# Dispatcher App Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://btzfgasugkycbavcwvnx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBIQi8XIDFturI5zX1tNGxoQ4gvbk4G4iQ
BOOKING_APP_URL=https://booking.compassionatecaretransportation.com
EOF
    echo "✅ Created .env.local with required variables"
else
    echo "✅ .env.local exists"
    
    # Check for BOOKING_APP_URL specifically
    if ! grep -q "BOOKING_APP_URL" .env.local; then
        echo "❌ BOOKING_APP_URL missing - adding it..."
        echo "BOOKING_APP_URL=https://booking.compassionatecaretransportation.com" >> .env.local
        echo "✅ Added BOOKING_APP_URL"
    else
        echo "✅ BOOKING_APP_URL exists"
    fi
fi

echo ""
echo "2️⃣ Checking for syntax errors..."
if node -c app/api/trips/actions/route.js; then
    echo "✅ No syntax errors in route.js"
else
    echo "❌ Syntax errors found in route.js - please check the file"
fi

echo ""
echo "3️⃣ Testing API endpoint..."
echo "Testing trip actions API..."

# Test the API endpoint
curl -X POST "http://localhost:3000/api/trips/actions" \
  -H "Content-Type: application/json" \
  -d '{"tripId":"test","action":"approve"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s --max-time 5 || echo "❌ Local API endpoint not accessible (server might not be running)"

echo ""
echo "4️⃣ Recommendations:"
echo ""
echo "If the issue persists:"
echo "1. 🌐 Open: https://dispatch.compassionatecaretransportation.com/trips/individual"
echo "2. 🔧 Open browser console (F12)"
echo "3. 📋 Copy and paste the contents of: browser-debug-trip-approval.js"
echo "4. ▶️  Run: debugTripApproval()"
echo "5. 📤 Share the console output for specific troubleshooting"
echo ""
echo "Quick workarounds:"
echo "- Try approving a facility trip instead of individual trip (no payment processing)"
echo "- Check if the BookingCCT app is running and accessible"
echo "- Restart the dispatcher app server"
echo ""
echo "✅ Quick fix complete!"
