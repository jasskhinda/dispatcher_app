# Vercel Auto-Deployment Setup for Dispatcher App

## Current Issue: Manual deployment required, no auto-deployment on GitHub push

## Solution: Set up GitHub integration with Vercel

### Step 1: Initialize Git Repository (if not already done)
```bash
cd "/Volumes/C/CCT APPS/dispatcher_app"
git init
git add .
git commit -m "Initial commit - Dispatcher app with rejection fixes"
```

### Step 2: Create GitHub Repository
1. Go to GitHub.com
2. Create new repository: `cct-dispatcher-app`
3. Don't initialize with README (we already have code)

### Step 3: Connect Local Repository to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/cct-dispatcher-app.git
git branch -M main
git push -u origin main
```

### Step 4: Connect Vercel to GitHub Repository
1. Go to vercel.com/dashboard
2. Click "New Project"
3. Import Git Repository
4. Select your GitHub account
5. Choose `cct-dispatcher-app` repository
6. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next
   - Install Command: `npm install`

### Step 5: Set Environment Variables in Vercel
In the Vercel project dashboard, go to Settings > Environment Variables:

**Required Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL = https://btzfgasugkycbavcwvnx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = AIzaSyDylwCsypHOs6T9e-JnTA7AoqOMrc3hbhE
```

### Step 6: Enable Auto-Deployment
1. In Vercel project settings, go to Git
2. Enable "Auto-Deploy" for main branch
3. Optionally enable preview deployments for pull requests

### Step 7: Test Auto-Deployment
```bash
# Make a small change to test auto-deployment
echo "// Auto-deployment test" >> README.md
git add .
git commit -m "Test auto-deployment"
git push origin main
```

### Step 8: Verify Deployment
1. Watch the deployment in Vercel dashboard
2. Should automatically trigger when you push to GitHub
3. New URL will be generated: `https://cct-dispatcher-app.vercel.app`

## Expected Workflow After Setup:
1. Make changes to dispatcher app code
2. Commit and push to GitHub: `git push origin main`
3. Vercel automatically detects the push
4. Builds and deploys the new version
5. New version is live within 1-2 minutes

## Troubleshooting Auto-Deployment:
- Check Vercel project settings > Git
- Ensure repository permissions are correct
- Check build logs for any errors
- Verify environment variables are set correctly

## Current Status:
- ✅ Code ready for deployment
- ✅ Environment variables configured
- ✅ Build configuration (next.config.mjs) fixed
- ⏳ Need to set up GitHub repository
- ⏳ Need to connect Vercel to GitHub

Once this setup is complete, every push to the main branch will automatically deploy to Vercel!
