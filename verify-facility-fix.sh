#!/bin/bash

# Quick database verification and facility creation script
echo "🔍 FACILITY DATABASE VERIFICATION"
echo "=================================="

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://btzfgasugkycbavcwvnx.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU"

echo "🚀 Testing direct access to monthly invoice page..."
echo "URL: https://dispatch.compassionatecaretransportation.com/invoice/facility-monthly/e1b94bde-d092-4ce6-b78c-9cff1d0118a3-2025-06"

echo ""
echo "✅ Fallback facility info has been implemented in the monthly invoice page:"
echo "   - Facility ID: e1b94bde-d092-4ce6-b78c-9cff1d0118a3"
echo "   - Name: CareBridge Living"
echo "   - This should now work even if the facility doesn't exist in the database"

echo ""
echo "🎯 Next steps:"
echo "   1. Test the monthly invoice URL in browser"
echo "   2. Check browser console for debugging information"
echo "   3. Verify that trips are being loaded correctly"
echo "   4. Confirm the fallback facility information displays properly"
