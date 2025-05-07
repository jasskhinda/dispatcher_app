import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/test-users.js';

// Add debug info
const DEBUG_MODE = true;
const TEST_URL = 'http://localhost:3015';

test.describe('Driver Management by Dispatcher', () => {
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

  test('should navigate to drivers page and see driver list', async ({ page }) => {
    // Go to dashboard first
    if (DEBUG_MODE) console.log('Navigating to dashboard');
    await page.goto(`${TEST_URL}/dashboard`);
    
    // Verify we're logged in by checking for dashboard elements
    await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible();
    
    // Navigate to drivers page
    if (DEBUG_MODE) console.log('Navigating to drivers page');
    await page.goto(`${TEST_URL}/drivers`);
    
    // Verify we're on the drivers page
    await expect(page).toHaveURL(/.*drivers.*/);
    
    // Verify drivers page UI elements
    if (DEBUG_MODE) console.log('Verifying drivers page elements');
    
    // Check for key UI elements
    await expect(page.getByRole('heading', { name: /drivers/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add new driver/i })).toBeVisible();
    
    // Verify that the table headers are visible (if there are drivers)
    // or check for the "No drivers found" message
    const driversCountElement = page.locator('text=/drivers found/i');
    
    if (await driversCountElement.isVisible()) {
      const countText = await driversCountElement.textContent();
      const count = parseInt(countText?.match(/\d+/)?.[0] || '0', 10);
      
      if (DEBUG_MODE) console.log(`Found ${count} drivers`);
      
      if (count > 0) {
        // Verify table headers are visible
        await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /contact info/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /vehicle/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
        
        // Check that at least one row in the table is visible
        await expect(page.locator('tbody tr').first()).toBeVisible();
      } else {
        // Check for "No drivers found" message
        await expect(page.getByText(/no drivers found/i)).toBeVisible();
      }
    } else {
      // If drivers count isn't visible, the page might be loading or there's an error
      // Check for loading state or error messages
      const isLoading = await page.getByText(/loading drivers/i).isVisible();
      
      if (isLoading) {
        if (DEBUG_MODE) console.log('Page is still loading drivers');
      } else {
        // Check for no drivers message
        await expect(page.getByText(/no drivers found/i)).toBeVisible();
        if (DEBUG_MODE) console.log('No drivers found');
      }
    }
  });

  test('should be able to click Add New Driver button', async ({ page }) => {
    // Go to drivers page
    await page.goto(`${TEST_URL}/drivers`);
    
    // Click the Add New Driver button
    await page.getByRole('button', { name: /add new driver/i }).click();
    
    // Verify we're directed to the add driver page
    await expect(page).toHaveURL(/.*drivers\/add.*/);
    
    // Verify elements on the add driver page (assuming it has similar structure to client add)
    await expect(page.getByText(/add.*(new|driver)/i)).toBeVisible();
  });

  test('should show driver details when clicking on a driver row', async ({ page }) => {
    // Go to drivers page
    await page.goto(`${TEST_URL}/drivers`);
    
    // Check if there are any drivers
    const noDriversMessage = page.getByText(/no drivers found/i);
    if (await noDriversMessage.isVisible()) {
      if (DEBUG_MODE) console.log('No drivers to test with - skipping driver details test');
      test.skip();
      return;
    }
    
    // Get count of drivers
    const countText = await page.locator('text=/drivers found/i').textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] || '0', 10);
    
    if (count === 0) {
      if (DEBUG_MODE) console.log('No drivers to test with - skipping driver details test');
      test.skip();
      return;
    }
    
    // Click on the first driver row
    await page.locator('tbody tr').first().click();
    
    // Verify navigation to driver details page
    await expect(page).toHaveURL(/.*drivers\/[\w-]+$/);
    
    // Verify driver details page elements (will vary based on your app's structure)
    // Here we're just checking for some common elements that might be present
    await expect(page.getByText(/driver.*(profile|details|information)/i, { exact: false })).toBeVisible();
  });

  test('should allow assigning a trip to a driver', async ({ page }) => {
    // Go to drivers page
    await page.goto(`${TEST_URL}/drivers`);
    
    // Check if there are any drivers
    const noDriversMessage = page.getByText(/no drivers found/i);
    if (await noDriversMessage.isVisible()) {
      if (DEBUG_MODE) console.log('No drivers to test with - skipping driver assignment test');
      test.skip();
      return;
    }
    
    // Find the first driver row
    const firstDriverRow = page.locator('tbody tr').first();
    
    // Click the "Assign Trip" button for the first driver
    // We use force: true because the button might be covered by other elements
    await firstDriverRow.getByRole('button', { name: 'Assign Trip' }).click({ force: true });
    
    // Verify redirect to new trip page with driver_id in the URL
    await expect(page).toHaveURL(/.*trips\/new\?driver_id=.*/);
    
    // Verify we're on the trip creation page with driver pre-selected
    await expect(page.getByRole('heading', { name: /create new trip/i })).toBeVisible();
    
    // Check if driver assignment info is visible (it should show driver is pre-selected)
    await expect(page.getByText(/driver assignment/i)).toBeVisible();
  });
  
  test('should navigate back to dashboard from drivers page', async ({ page }) => {
    // Go to drivers page
    await page.goto(`${TEST_URL}/drivers`);
    
    // Verify we're on the drivers page
    await expect(page).toHaveURL(/.*drivers.*/);
    
    // Navigate back to dashboard (this will depend on your app's UI - adjust selector as needed)
    // This example assumes there's a Dashboard link in the header/navigation
    await page.getByRole('link', { name: /dashboard/i }).click();
    
    // Verify we're back on the dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible();
  });
});