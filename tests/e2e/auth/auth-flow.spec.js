import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/test-users.js';

// Add debug info
const DEBUG_MODE = true;
const TEST_URL = 'http://localhost:3015';

test.describe('Authentication Flow', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page, baseURL }) => {
    // Log debug info
    const appBaseURL = baseURL || TEST_URL;
    if (DEBUG_MODE) console.log(`Using URL: ${appBaseURL}/dashboard`);
    
    // Try to access dashboard directly without authentication
    try {
      await page.goto(`${TEST_URL}/dashboard`, { timeout: 30000 });
    } catch (error) {
      console.error(`❌ Error navigating to dashboard: ${error.message}`);
      throw error;
    }
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should redirect to login when accessing clients page without auth', async ({ page, baseURL }) => {
    // Log debug info
    const appBaseURL = baseURL || TEST_URL;
    if (DEBUG_MODE) console.log(`Using URL: ${appBaseURL}/clients`);
    
    // Try to access clients page without authentication
    try {
      await page.goto(`${TEST_URL}/clients`, { timeout: 30000 });
    } catch (error) {
      console.error(`❌ Error navigating to clients: ${error.message}`);
      throw error;
    }
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should redirect to login when accessing trips page without auth', async ({ page, baseURL }) => {
    // Log debug info
    const appBaseURL = baseURL || TEST_URL;
    if (DEBUG_MODE) console.log(`Using URL: ${appBaseURL}/trips`);
    
    // Try to access trips page without authentication
    try {
      await page.goto(`${TEST_URL}/trips`, { timeout: 30000 });
    } catch (error) {
      console.error(`❌ Error navigating to trips: ${error.message}`);
      throw error;
    }
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should redirect to dashboard when accessing login while authenticated', async ({ page }) => {
    // First login with valid credentials
    await page.goto(`${TEST_URL}/login`, { timeout: 30000 });
    await page.getByLabel('Email').fill(testUsers.dispatcher.email);
    await page.getByLabel('Password').fill(testUsers.dispatcher.password);
    
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
    
    // After successful login, try to access login page again
    await page.goto(`${TEST_URL}/login`, { timeout: 30000 });
    
    // Should be redirected to dashboard (authenticated users can't access login)
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should persist authentication across page navigation', async ({ page }) => {
    // Login with valid dispatcher
    await page.goto(`${TEST_URL}/login`, { timeout: 30000 });
    await page.getByLabel('Email').fill(testUsers.dispatcher.email);
    await page.getByLabel('Password').fill(testUsers.dispatcher.password);
    
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
    
    // Navigate to clients page - should still be authenticated
    await page.goto(`${TEST_URL}/clients`, { timeout: 30000 });
    await expect(page).toHaveURL(/.*clients.*/);
    
    // Navigate to trips page - should still be authenticated
    await page.goto(`${TEST_URL}/trips`, { timeout: 30000 });
    await expect(page).toHaveURL(/.*trips.*/);
    
    // Go back to dashboard - should still be authenticated
    await page.goto(`${TEST_URL}/dashboard`, { timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should allow logout and redirect to login page', async ({ page }) => {
    // Login first
    await page.goto(`${TEST_URL}/login`, { timeout: 30000 });
    await page.getByLabel('Email').fill(testUsers.dispatcher.email);
    await page.getByLabel('Password').fill(testUsers.dispatcher.password);
    
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
    
    // Find and click the logout button/link (adjust selector based on your actual UI)
    await page.getByRole('button', { name: /log out|sign out|logout/i }).click();
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*login.*/);
    
    // After logout, ensure protected routes redirect back to login
    await page.goto(`${TEST_URL}/dashboard`, { timeout: 30000 });
    await expect(page).toHaveURL(/.*login.*/);
  });
});