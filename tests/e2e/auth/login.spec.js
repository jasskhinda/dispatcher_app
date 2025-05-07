import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/test-users.js';

// Add debug info
const DEBUG_MODE = true;
const TEST_URL = 'http://localhost:3015';

test.describe('Login Functionality', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Use a hardcoded URL if baseURL is undefined
    const appBaseURL = baseURL || TEST_URL;
    
    // Log navigation information for debugging
    if (DEBUG_MODE) {
      console.log(`--------------------------------------------`);
      console.log(`Hardcoded Test URL: ${TEST_URL}`);
      console.log(`Received baseURL: ${baseURL || 'undefined'}`);
      console.log(`Using baseURL: ${appBaseURL}`);
      console.log(`Test user: ${testUsers.dispatcher.email}`);
      console.log(`--------------------------------------------`);
    }

    // Go to login page before each test
    try {
      // Always use the full hardcoded URL first for reliability
      const loginUrl = `${TEST_URL}/login`;
      console.log(`Navigating to login URL: ${loginUrl}`);
      
      // First attempt with absolute URL
      await page.goto(loginUrl, { 
        timeout: 30000,
        waitUntil: 'networkidle'  // Wait until network is idle
      });
      
      if (DEBUG_MODE) console.log('✅ Navigation succeeded');
    } catch (error) {
      console.error(`❌ Navigation error: ${error.message}`);
      
      // Try relative URL as fallback
      console.log('Attempting fallback navigation with relative URL...');
      try {
        await page.goto('/login', { timeout: 30000 });
        console.log('✅ Fallback navigation succeeded');
      } catch (retryError) {
        console.error(`❌ Fallback navigation also failed: ${retryError.message}`);
        throw error;
      }
    }
  });

  test('should show login form with correct elements', async ({ page, baseURL }) => {
    console.log(`Running test with baseURL: ${baseURL}`);
    // Verify login page elements are visible
    await expect(page.getByRole('heading', { name: 'Compassionate Transportation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dispatcher Login' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    
    // Verify form has the correct structure
    await expect(page.locator('form')).toBeVisible();
  });

  test('should login with valid dispatcher credentials', async ({ page }) => {
    // Fill login form with real dispatcher credentials
    await page.getByLabel('Email').fill(testUsers.dispatcher.email);
    await page.getByLabel('Password').fill(testUsers.dispatcher.password);
    
    // Submit form and wait for navigation
    const navigationPromise = page.waitForURL('/dashboard');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Verify redirect to dashboard after successful login
    await navigationPromise;
    await expect(page).toHaveURL('/dashboard');
    
    // Verify dispatcher UI elements are visible on dashboard
    // Adjust these selectors based on your actual dashboard elements
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill login form with invalid credentials
    await page.getByLabel('Email').fill(testUsers.invalid.email);
    await page.getByLabel('Password').fill(testUsers.invalid.password);
    
    // Submit form
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Verify error message appears
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText(/invalid|incorrect/i);
    
    // Still on login page
    await expect(page).toHaveURL('/login');
  });

  test('should show loading state during login attempt', async ({ page }) => {
    // Fill login form
    await page.getByLabel('Email').fill(testUsers.dispatcher.email);
    await page.getByLabel('Password').fill(testUsers.dispatcher.password);
    
    // Click login and observe loading state
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Verify button changes to loading state
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible();
  });

  test('should redirect non-dispatcher users with access denied', async ({ page }) => {
    // Login with non-dispatcher user
    await page.getByLabel('Email').fill(testUsers.nonDispatcher.email);
    await page.getByLabel('Password').fill(testUsers.nonDispatcher.password);
    
    // Submit form and wait for redirect with error parameter
    const navigationPromise = page.waitForURL(url => 
      url.pathname === '/login' && url.searchParams.has('error')
    );
    
    await page.getByRole('button', { name: 'Sign in' }).click();
    await navigationPromise;
    
    // Verify access denied message
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText('Access denied');
    await expect(page.locator('[role="alert"]')).toContainText('This app is for dispatchers only');
  });

  test('should maintain form values after failed login', async ({ page }) => {
    // Fill login form with invalid credentials
    await page.getByLabel('Email').fill(testUsers.invalid.email);
    await page.getByLabel('Password').fill(testUsers.invalid.password);
    
    // Submit form
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait for error message 
    await expect(page.locator('[role="alert"]')).toBeVisible();
    
    // Verify email field still has value (password might be cleared for security)
    await expect(page.getByLabel('Email')).toHaveValue(testUsers.invalid.email);
  });
});