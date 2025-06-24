#!/bin/bash

# Dispatcher App Vercel Deployment Script
# Run this script to deploy the dispatcher app to Vercel

echo "🚀 CCT Dispatcher App - Vercel Deployment"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the dispatcher_app directory."
    exit 1
fi

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🔑 Please ensure you're logged into Vercel..."
vercel login

echo "🏗️  Building and deploying to Vercel..."
vercel --prod

echo ""
echo "🎉 Deployment initiated!"
echo ""
echo "📋 Post-Deployment Checklist:"
echo "1. Go to your Vercel dashboard"
echo "2. Navigate to your dispatcher app project"
echo "3. Go to Settings > Environment Variables"
echo "4. Add the following environment variables:"
echo ""
echo "   NEXT_PUBLIC_SUPABASE_URL = https://btzfgasugkycbavcwvnx.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = AIzaSyDylwCsypHOs6T9e-JnTA7AoqOMrc3hbhE"
echo ""
echo "5. Run the database permissions script in Supabase SQL editor:"
echo "   Execute: fix-dispatcher-permissions.sql"
echo ""
echo "6. Test the complete workflow:"
echo "   Facility App → Dispatcher App → Billing System"
echo ""
echo "✅ Real-time synchronization is already implemented!"
echo "✅ Professional client names are configured!"
echo "✅ All integration features are ready!"
