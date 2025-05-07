import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/test-users.js';

// Add debug info
const DEBUG_MODE = true;
const TEST_URL = 'http://localhost:3015';

test.describe('Client List Access', () => {
  // Setup: Log in before all tests
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    if (DEBUG_MODE) console.log('Starting login for test setup');
    
    try {
      // Log in as dispatcher
      await page.goto(`${TEST_URL}/login`);
      await page.getByLabel('Email').fill(testUsers.dispatcher.email);
      await page.getByLabel('Password').fill(testUsers.dispatcher.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Wait for successful login
      await page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
      
      if (DEBUG_MODE) console.log('Login successful during setup');
      
      // Store the authenticated state
      await context.storageState({ path: './tests/fixtures/auth-state.json' });
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    } finally {
      await context.close();
    }
  });

  // Use authenticated state for tests
  test.use({ storageState: './tests/fixtures/auth-state.json' });

  test('should navigate to clients page and see client list', async ({ page }) => {
    // Go to dashboard first
    if (DEBUG_MODE) console.log('Navigating to dashboard');
    await page.goto(`${TEST_URL}/dashboard`);
    
    // Verify we're logged in by checking for dashboard elements
    await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible();
    
    // Navigate to clients page
    if (DEBUG_MODE) console.log('Navigating to clients page');
    await page.goto(`${TEST_URL}/clients`);
    
    // Verify we're on the clients page
    await expect(page).toHaveURL(/.*clients.*/);
    
    // Verify clients page UI elements
    if (DEBUG_MODE) console.log('Verifying clients page elements');
    
    // Check for table header and key UI elements
    await expect(page.getByRole('heading', { name: /all clients/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add new client/i })).toBeVisible();
    
    // Verify that the table headers are visible (if there are clients)
    // or check for the "No clients found" message
    const clientsCountElement = page.locator('text=/clients found/i');
    
    if (await clientsCountElement.isVisible()) {
      const countText = await clientsCountElement.textContent();
      const count = parseInt(countText?.match(/\d+/)?.[0] || '0', 10);
      
      if (DEBUG_MODE) console.log(`Found ${count} clients`);
      
      if (count > 0) {
        // Verify table headers are visible
        await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /contact info/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /trips/i })).toBeVisible();
        
        // Check that at least one row in the table is visible
        await expect(page.locator('tbody tr').first()).toBeVisible();
      } else {
        // Check for "No clients found" message
        await expect(page.getByText(/no clients found/i)).toBeVisible();
      }
    } else {
      // If client count isn't visible, the page might be loading or there's an error
      // Check for loading state or error messages
      const isLoading = await page.getByText(/loading clients/i).isVisible();
      
      if (isLoading) {
        if (DEBUG_MODE) console.log('Page is still loading clients');
      } else {
        // Check for no clients message
        await expect(page.getByText(/no clients found/i)).toBeVisible();
        if (DEBUG_MODE) console.log('No clients found');
      }
    }
  });

  test('should be able to click Add New Client button', async ({ page }) => {
    // Go to clients page
    await page.goto(`${TEST_URL}/clients`);
    
    // Click the Add New Client button
    await page.getByRole('button', { name: /add new client/i }).click();
    
    // Verify we're directed to the add client page
    await expect(page).toHaveURL(/.*clients\/add.*/);
    
    // Verify elements on the add client page
    await expect(page.getByText(/add new client/i)).toBeVisible();
  });

  test('should show client details when clicking on a client row', async ({ page }) => {
    // Go to clients page
    await page.goto(`${TEST_URL}/clients`);
    
    // Check if there are any clients
    const noClientsMessage = page.getByText(/no clients found/i);
    if (await noClientsMessage.isVisible()) {
      if (DEBUG_MODE) console.log('No clients to test with - skipping client details test');
      test.skip();
      return;
    }
    
    // Get count of clients
    const countText = await page.locator('text=/clients found/i').textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] || '0', 10);
    
    if (count === 0) {
      if (DEBUG_MODE) console.log('No clients to test with - skipping client details test');
      test.skip();
      return;
    }
    
    // Click on the first client row
    await page.locator('tbody tr').first().click();
    
    // Verify navigation to client details page
    await expect(page).toHaveURL(/.*clients\/[\w-]+$/);
    
    // Verify client details page elements
    await expect(page.getByText(/client profile/i, { exact: false })).toBeVisible();
  });
  
  test('should navigate back to dashboard from clients page', async ({ page }) => {
    // Go to clients page
    await page.goto(`${TEST_URL}/clients`);
    
    // Verify we're on the clients page
    await expect(page).toHaveURL(/.*clients.*/);
    
    // Navigate back to dashboard (this will depend on your app's UI - adjust selector as needed)
    // This example assumes there's a Dashboard link in the header/navigation
    await page.getByRole('link', { name: /dashboard/i }).click();
    
    // Verify we're back on the dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible();
  });
});