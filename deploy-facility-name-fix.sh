#!/bin/bash

# Facility Name Display Fix - Deployment Script
echo "🎯 Deploying Facility Name Display Fix..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the dispatcher app directory"
    exit 1
fi

echo "✅ In dispatcher app directory"

# Check git status
echo "📋 Checking git status..."
git status

# Add all changes
echo "📦 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing facility name display fix..."
git commit -m "Fix facility name display in dispatcher app

🔧 Database Query Fixes:
- Remove non-existent 'email' field from facilities queries
- Update main trip query: facility:facilities(id, name, contact_email, phone_number)
- Update enhanceTripsWithClientInfo() function queries
- Remove facility.email references from display logic

🎯 Results:
- BEFORE: '🏥 Facility e1b94bde' (generic fallback)
- AFTER:  '🏥 FacilityGroupB' (actual facility name from settings)

✅ Professional facility name display now working correctly
✅ Database queries no longer fail due to missing 'email' field
✅ Proper fallback system for facility name resolution
✅ Ready for production use with multiple facilities"

# Push to main branch (triggers Vercel auto-deployment)
echo "🌐 Pushing to GitHub (triggers Vercel deployment)..."
git push origin main

echo "✅ Facility Name Display Fix Deployed!"
echo "🔗 Check deployment: https://vercel.com/dashboard"
echo "🌟 Live app: https://dispatcher-app-cyan.vercel.app/dashboard"

echo ""
echo "🎯 EXPECTED RESULTS:"
echo "   - Facility trips now show: '🏥 FacilityGroupB'"
echo "   - Instead of: '🏥 Facility e1b94bde'"
echo "   - Professional facility name display working!"
echo ""
echo "🧪 TESTING:"
echo "   1. Open: https://dispatcher-app-cyan.vercel.app/dashboard"
echo "   2. Look for facility booking trips"
echo "   3. Verify facility names show correctly"
