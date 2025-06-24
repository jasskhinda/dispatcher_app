#!/bin/bash

# Professional Facility & Client Display Deployment
echo "🎯 Deploying Professional Facility & Client Display Enhancement..."

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
git commit -m "Professional Facility & Client Display Enhancement

✨ MAJOR ENHANCEMENT: Professional trip details display

🔧 Enhanced Features:
- Complete facility information (name, contact, type)
- Professional client display with contact details
- Visual distinction between facility vs individual bookings
- Enhanced database queries with full facility data
- Professional UI layout with proper spacing and icons

🎨 UI Improvements:
- Facility bookings: Blue highlighted section with facility name & contact
- Individual bookings: Clean minimal display
- Client phones with phone icon
- Facility contact emails with email icon
- Professional color coding and typography

📊 Database Enhancements:
- Enhanced facility query (name, email, contact_email, phone_number, address, facility_type)
- Improved client resolution with multiple fallbacks
- Smart facility name resolution (name → contact_email → email → ID)

🎯 Results:
- BEFORE: 'Unknown Client' + 'Facility e1b94bde'
- AFTER: 'David Patel (Managed)' + 'Medical Center Healthcare' with contact info

Professional, business-ready dispatcher dashboard! 🚀"

# Push to main branch (triggers Vercel auto-deployment)
echo "🌐 Pushing to GitHub (triggers Vercel deployment)..."
git push origin main

echo "✅ Professional Enhancement Deployed!"
echo "🔗 Check deployment: https://vercel.com/dashboard"
echo "🌟 Live app: https://dispatcher-app-cyan.vercel.app/dashboard"

echo ""
echo "🎯 ENHANCEMENT SUMMARY:"
echo "   ✨ Professional facility & client display"
echo "   🏥 Complete facility information (name, contact, type)"
echo "   👤 Enhanced client resolution with contact details"
echo "   🎨 Visual distinction: facility vs individual bookings"
echo "   📱 Professional UI with proper spacing & icons"
echo "   🔧 Enhanced database queries for complete data"
echo ""
echo "🎉 Expected Results:"
echo "   - Facility trips: 'David Patel (Managed)' + 'Medical Center Healthcare'"
echo "   - Individual trips: Clean professional client display"
echo "   - Filter: Easy switching between All/Facility/Individual"
echo "   - Contact info: Phone numbers and emails when available"
echo ""
echo "🚀 Professional dispatcher dashboard ready for business use!"
