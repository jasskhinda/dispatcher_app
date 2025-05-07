#!/bin/bash

# Setup script for E2E tests
echo "Setting up E2E tests for Compassionate Rides Dispatcher App..."

# Install Playwright and its dependencies
echo "Installing Playwright and dependencies..."
npm install --save-dev @playwright/test dotenv
npx playwright install

# Create example environment file if it doesn't exist
if [ ! -f .env.test ]; then
  echo "Creating .env.test file from example..."
  cp .env.test.example .env.test
  echo "Please update .env.test with your Supabase test credentials"
fi

# Create directory structure
echo "Creating test directory structure..."
mkdir -p tests/e2e/auth
mkdir -p tests/fixtures

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.test with your Supabase test credentials"
echo "2. Create test users in your Supabase instance as described in tests/README.md"
echo "3. Run tests with 'npm run test'"
echo ""