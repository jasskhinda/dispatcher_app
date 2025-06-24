#!/bin/bash

# Auto-setup Git and Vercel Deployment for Dispatcher App

echo "🚀 Setting up Auto-Deployment for Dispatcher App"
echo "==============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in dispatcher app directory. Please run from /Volumes/C/CCT APPS/dispatcher_app"
    exit 1
fi

# Step 1: Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Step 2: Add gitignore if not exists
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore file..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
/.pnp
.pnp.js
.yarn/install-state.gz

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.tgz
*.tar.gz

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode/
.idea/

# OS
Thumbs.db
EOF
    echo "✅ .gitignore created"
fi

# Step 3: Stage all files
echo "📦 Staging files for commit..."
git add .

# Step 4: Initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Dispatcher app with enhanced rejection workflow

Features:
- Complete approval/rejection/completion workflow
- Real-time sync with facility app
- Professional client name resolution
- Enhanced error handling and debugging
- Vercel deployment configuration
- Auto-deployment setup"

echo "✅ Initial commit created"

# Step 5: Instructions for GitHub setup
echo ""
echo "🔗 Next Steps - GitHub Repository Setup:"
echo "========================================"
echo ""
echo "1. Go to https://github.com/new"
echo "2. Create a new repository named: cct-dispatcher-app"
echo "3. Make it public or private (your choice)"
echo "4. Do NOT initialize with README, .gitignore, or license"
echo "5. Click 'Create repository'"
echo ""
echo "6. Then run these commands:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/cct-dispatcher-app.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🔧 Vercel Integration Setup:"
echo "============================"
echo ""
echo "1. Go to https://vercel.com/dashboard"
echo "2. Click 'New Project'"
echo "3. Import from Git"
echo "4. Select your GitHub account"
echo "5. Choose 'cct-dispatcher-app' repository"
echo "6. Configure project settings:"
echo "   - Framework: Next.js"
echo "   - Root Directory: ./"
echo "   - Build Command: npm run build"
echo "   - Output Directory: .next"
echo ""
echo "7. Add Environment Variables:"
echo "   NEXT_PUBLIC_SUPABASE_URL=https://btzfgasugkycbavcwvnx.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBIQi8XIDFturI5zX1tNGxoQ4gvbk4G4iQ"
echo ""
echo "8. Click 'Deploy'"
echo ""
echo "🎉 After Setup Complete:"
echo "========================"
echo "Every git push to main branch will automatically deploy to Vercel!"
echo ""
echo "Test with:"
echo "   git add ."
echo "   git commit -m 'Test auto-deployment'"
echo "   git push origin main"
echo ""
echo "✅ Git setup completed! Follow the GitHub and Vercel steps above."
