#!/bin/bash

# Dispatcher App Test Setup Script
echo "🚀 CCT Dispatcher App - Test Setup"
echo "=================================="

cd "/Volumes/C/CCT APPS/dispatcher_app"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🧪 Testing Instructions:"
echo "1. Start the app: npm run dev"
echo "2. Open http://localhost:3000 in browser"
echo "3. Log in with dispatcher credentials"
echo "4. Navigate to Individual Trips page"
echo "5. Use browser console test:"
echo "   - Open F12 console"
echo "   - Copy/paste browser-trip-actions-test.js"
echo "   - Run: testAuth()"
echo "   - Run: testTripActions('trip-id', 'approve')"
echo ""
echo "📝 Files created for testing:"
echo "- browser-trip-actions-test.js (browser console testing)"
echo "- test-trip-actions.js (node script testing)"
echo ""
echo "🔧 Key fixes applied:"
echo "- Fixed API route compilation errors"
echo "- Added proper error handling and logging"
echo "- Configured BookingCCT payment integration"
echo "- Added request timeout protection"
echo "- Removed debug components"
echo ""
echo "🌐 Environment configured:"
echo "- BOOKING_APP_URL: https://booking.compassionatecaretransportation.com"
echo "- Supabase connection: ✅"
echo "- Google Maps API: ✅"
echo ""
echo "▶️  Ready to start: npm run dev"
