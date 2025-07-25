# Test info

- Name: Login Functionality >> should show error with invalid credentials
- Location: /Users/marcoschwartz/Documents/Software/compassionate_rides/dispatcher_app/tests/e2e/auth/login.spec.js:82:7

# Error details

```
Error: expect.toContainText: Error: strict mode violation: locator('[role="alert"]') resolved to 2 elements:
    1) <div role="alert" class="bg-brand-cancelled/10 border border-brand-cancelled/30 text-brand-cancelled px-4 py-3 rounded relative">…</div> aka getByRole('alert').filter({ hasText: 'Invalid login credentials' })
    2) <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div> aka locator('[id="__next-route-announcer__"]')

Call log:
  - expect.toContainText with timeout 5000ms
  - waiting for locator('[role="alert"]')
    3 × locator resolved to <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div>
      - unexpected value ""

    at /Users/marcoschwartz/Documents/Software/compassionate_rides/dispatcher_app/tests/e2e/auth/login.spec.js:92:50
```

# Page snapshot

```yaml
- heading "Compassionate Transportation" [level=1]
- heading "Dispatcher Login" [level=2]
- alert: Invalid login credentials
- text: Email
- textbox "Email": nonexistent@example.com
- text: Password
- textbox "Password": wrongpassword
- button "Sign in"
- alert
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- button "Collapse issues badge":
  - img
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import { testUsers } from '../../fixtures/test-users.js';
   3 |
   4 | // Add debug info
   5 | const DEBUG_MODE = true;
   6 | const TEST_URL = 'http://localhost:3015';
   7 |
   8 | test.describe('Login Functionality', () => {
   9 |   test.beforeEach(async ({ page, baseURL }) => {
   10 |     // Use a hardcoded URL if baseURL is undefined
   11 |     const appBaseURL = baseURL || TEST_URL;
   12 |     
   13 |     // Log navigation information for debugging
   14 |     if (DEBUG_MODE) {
   15 |       console.log(`--------------------------------------------`);
   16 |       console.log(`Hardcoded Test URL: ${TEST_URL}`);
   17 |       console.log(`Received baseURL: ${baseURL || 'undefined'}`);
   18 |       console.log(`Using baseURL: ${appBaseURL}`);
   19 |       console.log(`Test user: ${testUsers.dispatcher.email}`);
   20 |       console.log(`--------------------------------------------`);
   21 |     }
   22 |
   23 |     // Go to login page before each test
   24 |     try {
   25 |       // Always use the full hardcoded URL first for reliability
   26 |       const loginUrl = `${TEST_URL}/login`;
   27 |       console.log(`Navigating to login URL: ${loginUrl}`);
   28 |       
   29 |       // First attempt with absolute URL
   30 |       await page.goto(loginUrl, { 
   31 |         timeout: 30000,
   32 |         waitUntil: 'networkidle'  // Wait until network is idle
   33 |       });
   34 |       
   35 |       if (DEBUG_MODE) console.log('✅ Navigation succeeded');
   36 |     } catch (error) {
   37 |       console.error(`❌ Navigation error: ${error.message}`);
   38 |       
   39 |       // Try relative URL as fallback
   40 |       console.log('Attempting fallback navigation with relative URL...');
   41 |       try {
   42 |         await page.goto('/login', { timeout: 30000 });
   43 |         console.log('✅ Fallback navigation succeeded');
   44 |       } catch (retryError) {
   45 |         console.error(`❌ Fallback navigation also failed: ${retryError.message}`);
   46 |         throw error;
   47 |       }
   48 |     }
   49 |   });
   50 |
   51 |   test('should show login form with correct elements', async ({ page, baseURL }) => {
   52 |     console.log(`Running test with baseURL: ${baseURL}`);
   53 |     // Verify login page elements are visible
   54 |     await expect(page.getByRole('heading', { name: 'Compassionate Transportation' })).toBeVisible();
   55 |     await expect(page.getByRole('heading', { name: 'Dispatcher Login' })).toBeVisible();
   56 |     await expect(page.getByLabel('Email')).toBeVisible();
   57 |     await expect(page.getByLabel('Password')).toBeVisible();
   58 |     await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
   59 |     
   60 |     // Verify form has the correct structure
   61 |     await expect(page.locator('form')).toBeVisible();
   62 |   });
   63 |
   64 |   test('should login with valid dispatcher credentials', async ({ page }) => {
   65 |     // Fill login form with real dispatcher credentials
   66 |     await page.getByLabel('Email').fill(testUsers.dispatcher.email);
   67 |     await page.getByLabel('Password').fill(testUsers.dispatcher.password);
   68 |     
   69 |     // Submit form and wait for navigation
   70 |     const navigationPromise = page.waitForURL('/dashboard');
   71 |     await page.getByRole('button', { name: 'Sign in' }).click();
   72 |     
   73 |     // Verify redirect to dashboard after successful login
   74 |     await navigationPromise;
   75 |     await expect(page).toHaveURL('/dashboard');
   76 |     
   77 |     // Verify dispatcher UI elements are visible on dashboard
   78 |     // Adjust these selectors based on your actual dashboard elements
   79 |     await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
   80 |   });
   81 |
   82 |   test('should show error with invalid credentials', async ({ page }) => {
   83 |     // Fill login form with invalid credentials
   84 |     await page.getByLabel('Email').fill(testUsers.invalid.email);
   85 |     await page.getByLabel('Password').fill(testUsers.invalid.password);
   86 |     
   87 |     // Submit form
   88 |     await page.getByRole('button', { name: 'Sign in' }).click();
   89 |     
   90 |     // Verify error message appears
   91 |     await expect(page.locator('[role="alert"]')).toBeVisible();
>  92 |     await expect(page.locator('[role="alert"]')).toContainText(/invalid|incorrect/i);
      |                                                  ^ Error: expect.toContainText: Error: strict mode violation: locator('[role="alert"]') resolved to 2 elements:
   93 |     
   94 |     // Still on login page
   95 |     await expect(page).toHaveURL('/login');
   96 |   });
   97 |
   98 |   test('should show loading state during login attempt', async ({ page }) => {
   99 |     // Fill login form
  100 |     await page.getByLabel('Email').fill(testUsers.dispatcher.email);
  101 |     await page.getByLabel('Password').fill(testUsers.dispatcher.password);
  102 |     
  103 |     // Click login and observe loading state
  104 |     await page.getByRole('button', { name: 'Sign in' }).click();
  105 |     
  106 |     // Verify button changes to loading state
  107 |     await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible();
  108 |   });
  109 |
  110 |   test('should redirect non-dispatcher users with access denied', async ({ page }) => {
  111 |     // Login with non-dispatcher user
  112 |     await page.getByLabel('Email').fill(testUsers.nonDispatcher.email);
  113 |     await page.getByLabel('Password').fill(testUsers.nonDispatcher.password);
  114 |     
  115 |     // Submit form and wait for redirect with error parameter
  116 |     const navigationPromise = page.waitForURL(url => 
  117 |       url.pathname === '/login' && url.searchParams.has('error')
  118 |     );
  119 |     
  120 |     await page.getByRole('button', { name: 'Sign in' }).click();
  121 |     await navigationPromise;
  122 |     
  123 |     // Verify access denied message
  124 |     await expect(page.locator('[role="alert"]')).toBeVisible();
  125 |     await expect(page.locator('[role="alert"]')).toContainText('Access denied');
  126 |     await expect(page.locator('[role="alert"]')).toContainText('This app is for dispatchers only');
  127 |   });
  128 |
  129 |   test('should maintain form values after failed login', async ({ page }) => {
  130 |     // Fill login form with invalid credentials
  131 |     await page.getByLabel('Email').fill(testUsers.invalid.email);
  132 |     await page.getByLabel('Password').fill(testUsers.invalid.password);
  133 |     
  134 |     // Submit form
  135 |     await page.getByRole('button', { name: 'Sign in' }).click();
  136 |     
  137 |     // Wait for error message 
  138 |     await expect(page.locator('[role="alert"]')).toBeVisible();
  139 |     
  140 |     // Verify email field still has value (password might be cleared for security)
  141 |     await expect(page.getByLabel('Email')).toHaveValue(testUsers.invalid.email);
  142 |   });
  143 | });
```