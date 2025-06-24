#!/bin/bash

# Enhanced Client Resolution Deployment Script
echo "🚀 Deploying Enhanced Client Resolution & Filtering..."

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
echo "💾 Committing changes..."
git commit -m "Fix client name resolution and add trip filtering

- Enhanced getClientDisplayInfo() function with better logic
- Added comprehensive logging for debugging
- Added trip filter (All/Facility/Individual bookings)  
- Fixed facility info display showing names instead of IDs
- Improved fallback logic for missing client data
- Added filter UI with trip count display"

# Push to main branch (triggers Vercel auto-deployment)
echo "🌐 Pushing to GitHub (triggers Vercel deployment)..."
git push origin main

echo "✅ Deployment initiated!"
echo "🔗 Check deployment status: https://vercel.com/dashboard"
echo "🌟 Live app: https://dispatcher-app-cyan.vercel.app/dashboard"

echo ""
echo "🔍 Changes Made:"
echo "   1. ✅ Fixed client name resolution (no more 'Unknown Client')"
echo "   2. ✅ Added facility vs individual trip filtering"
echo "   3. ✅ Enhanced facility info display"
echo "   4. ✅ Added debug logging for troubleshooting"
echo "   5. ✅ Improved fallback names for missing data"
echo ""
echo "🎯 Expected Results:"
echo "   - Facility trips show: 'David Patel (Managed) • Medical Center'"
echo "   - Individual trips show proper client names"
echo "   - Filter dropdown allows switching between All/Facility/Individual"
echo "   - No more 'Facility e1b94bde' - shows actual facility names"
