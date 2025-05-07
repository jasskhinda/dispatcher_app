# End-to-End Tests for Compassionate Rides Dispatcher App

This directory contains end-to-end tests for the Compassionate Rides Dispatcher App using Playwright.

## Setup

1. Install dependencies:
   ```bash
   npm install --save-dev @playwright/test dotenv
   npx playwright install
   ```

   Alternatively, use the provided setup script:
   ```bash
   ./tests/setup.sh
   ```

2. Configure test environment:
   - Copy `.env.test.example` to `.env.test` in the project root
   - Update the values in `.env.test` with your test Supabase credentials
   - Set test user credentials in `.env.test` (extremely important)

3. Create test users in your Supabase instance:
   - Create a dispatcher user with email matching `TEST_DISPATCHER_EMAIL` in your `.env.test`
   - Create a client user with email matching `TEST_CLIENT_EMAIL` in your `.env.test`
   - Ensure proper roles are set in the profiles table

## Troubleshooting

If you encounter "Cannot navigate to invalid URL" errors, try the following steps:

1. Start the server in one terminal:
   ```bash
   npm run test:start
   ```

2. Check if the server is accessible:
   ```bash
   npm run test:url
   ```

3. Run the tests in a separate terminal:
   ```bash
   npm run test
   ```

## Environment Variables

Your `.env.test` file should include:

```
# Supabase test environment
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Test configuration
TEST_PORT=3015

# Test user credentials - IMPORTANT: must match users in your Supabase instance
TEST_DISPATCHER_EMAIL=test-dispatcher@example.com
TEST_DISPATCHER_PASSWORD=test-dispatcher-password
TEST_CLIENT_EMAIL=test-client@example.com
TEST_CLIENT_PASSWORD=test-client-password
TEST_INVALID_EMAIL=nonexistent@example.com
TEST_INVALID_PASSWORD=wrongpassword
```

## Running Tests

```bash
# Run all tests (this will start the app automatically)
npm run test

# Run login tests only
npm run test -- tests/e2e/auth/login.spec.js

# Run with UI mode
npm run test:ui

# Run with debug mode
npm run test:debug

# Run only auth tests
npm run test:auth

# Run only client access tests
npm run test:clients

# Run only trip creation tests
npm run test:trips

# Run only driver management tests
npm run test:drivers

# Run only trip status workflow tests
npm run test:trip-status

# Check server connection
npm run test:url

# Start server separately for testing
npm run test:start
```

The tests will automatically:
1. Check if the app is already running on the specified port
2. Start the app if it's not running
3. Wait for the app to be ready before running tests
4. Clean up after tests are complete

## Test Structure

- `/tests/fixtures` - Test data and fixed values
- `/tests/e2e` - End-to-end test files
  - `/auth` - Authentication related tests
- `playwright.config.js` - Playwright configuration

## Adding New Tests

When adding new tests:

1. Create test files in the appropriate directory under `/tests/e2e`
2. Import the necessary fixtures and utilities
3. Follow the existing patterns for page interactions

## Test Users

The tests use environment-configured test users defined in `fixtures/test-users.js`. These users should be manually created in your Supabase test environment:

- Dispatcher user: A user with the "dispatcher" role for successful login
- Non-dispatcher user: A user without the "dispatcher" role for testing access restrictions
- Invalid user: Not required in Supabase (used for testing error handling)

## Best Practices

- Keep tests independent and isolated
- Use descriptive test names
- Follow the page object model when possible
- Use proper assertions for validating behavior
- Never hardcode credentials - always use environment variables