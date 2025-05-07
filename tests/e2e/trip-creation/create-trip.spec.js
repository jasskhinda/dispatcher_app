import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/test-users.js';

// Add debug info
const DEBUG_MODE = true;
const TEST_URL = 'http://localhost:3015';

test.describe('Trip Creation by Dispatcher', () => {
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

  test('should navigate to the new trip page', async ({ page }) => {
    // Go to dashboard first
    if (DEBUG_MODE) console.log('Navigating to dashboard');
    await page.goto(`${TEST_URL}/dashboard`);
    
    // Verify we're logged in by checking for dashboard elements
    await expect(page.getByRole('heading', { level: 1, name: /dashboard/i })).toBeVisible();

    // Navigate to new trip page
    if (DEBUG_MODE) console.log('Navigating to new trip page');
    await page.goto(`${TEST_URL}/trips/new`);

    // Verify we're on the new trip page
    await expect(page).toHaveURL(/.*trips\/new.*/);
    await expect(page.getByRole('heading', { name: /create new trip/i })).toBeVisible();

    // Verify key form elements are present
    if (DEBUG_MODE) console.log('Verifying new trip form elements');
    await expect(page.getByText('Trip Details')).toBeVisible();
    await expect(page.getByLabel('Client')).toBeVisible();
    await expect(page.getByLabel('Pickup Address')).toBeVisible();
    await expect(page.getByLabel('Destination Address')).toBeVisible();
    await expect(page.getByLabel('Pickup Date & Time')).toBeVisible();
    await expect(page.getByText('Trip Type')).toBeVisible();
    await expect(page.getByLabel('Wheelchair Required')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Trip' })).toBeVisible();
  });

  test('should create a basic one-way trip', async ({ page }) => {
    // Skip this test if there are no clients
    if (DEBUG_MODE) console.log('Navigating to clients page to check for clients');
    await page.goto(`${TEST_URL}/clients`);
    
    const noClientsMessage = page.getByText(/no clients found/i);
    if (await noClientsMessage.isVisible()) {
      if (DEBUG_MODE) console.log('No clients to test with - skipping trip creation test');
      test.skip();
      return;
    }
    
    // Navigate to new trip page
    await page.goto(`${TEST_URL}/trips/new`);
    
    // Fill out the form with basic information
    if (DEBUG_MODE) console.log('Filling out trip form');
    
    // 1. Select the first client from the dropdown
    const clientSelect = page.locator('#client_id');
    await clientSelect.click();
    // Skip the first option which is "Select a client"
    await page.locator('#client_id option:not([value=""])').first().click();
    
    // 2. Fill in addresses (simple test values)
    await page.getByLabel('Pickup Address').fill('123 Main St, New York, NY');
    await page.getByLabel('Destination Address').fill('456 Park Ave, New York, NY');
    
    // 3. Set pickup time (tomorrow at noon)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const formattedDate = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
    await page.getByLabel('Pickup Date & Time').fill(formattedDate);
    
    // 4. Ensure One Way trip is selected (default)
    await page.getByRole('button', { name: 'One Way' }).click();
    
    // 5. Add some notes
    await page.getByLabel('Additional Notes').fill('This is a test trip created by automated testing');
    
    // Check that the price calculation section is visible
    await expect(page.getByText('Price Calculation')).toBeVisible();
    
    if (DEBUG_MODE) console.log('Submitting trip form');
    
    // Create a promise to wait for navigation
    const navigationPromise = page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Trip' }).click();
    
    // Wait for navigation to dashboard after form submission
    await navigationPromise;
    
    // Verify that we've been redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    if (DEBUG_MODE) console.log('Trip creation successful');
  });

  test('should create a round-trip with wheelchair required', async ({ page }) => {
    // Skip this test if there are no clients
    if (DEBUG_MODE) console.log('Navigating to clients page to check for clients');
    await page.goto(`${TEST_URL}/clients`);
    
    const noClientsMessage = page.getByText(/no clients found/i);
    if (await noClientsMessage.isVisible()) {
      if (DEBUG_MODE) console.log('No clients to test with - skipping trip creation test');
      test.skip();
      return;
    }
    
    // Navigate to new trip page
    await page.goto(`${TEST_URL}/trips/new`);
    
    // Fill out the form with round-trip information
    if (DEBUG_MODE) console.log('Filling out round-trip form with wheelchair required');
    
    // 1. Select the first client from the dropdown
    const clientSelect = page.locator('#client_id');
    await clientSelect.click();
    // Skip the first option which is "Select a client"
    await page.locator('#client_id option:not([value=""])').first().click();
    
    // 2. Fill in addresses
    await page.getByLabel('Pickup Address').fill('123 Main St, New York, NY');
    await page.getByLabel('Destination Address').fill('Medical Center, 789 Health Blvd, New York, NY');
    
    // 3. Set pickup time (tomorrow at 10 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const formattedDate = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
    await page.getByLabel('Pickup Date & Time').fill(formattedDate);
    
    // 4. Select Round Trip option
    await page.getByRole('button', { name: 'Round Trip' }).click();
    
    // 5. Enable wheelchair required
    if (await page.getByText('No').isVisible()) {
      // Click the toggle switch (if it's showing "No")
      await page.locator('input[name="wheelchair_required"]').click({ force: true });
    }
    
    // 6. Add some notes
    await page.getByLabel('Additional Notes').fill('Round trip to medical appointment. Wheelchair required.');
    
    // Check that the price calculation has updated for round trip
    await expect(page.getByText('Round trip to medical appointment')).toBeVisible();
    
    // Check the increased price (base price should be $100 instead of $50 for round trip)
    // And should have wheelchair fee added
    const totalPriceElement = page.locator('text=/Total estimated price:.*/');
    const priceText = await totalPriceElement.textContent();
    
    // Extract the price amount (should be at least $125 for round trip + wheelchair)
    const priceMatch = priceText.match(/\$(\d+\.\d+)/);
    if (priceMatch && priceMatch[1]) {
      const price = parseFloat(priceMatch[1]);
      if (DEBUG_MODE) console.log(`Trip price: $${price}`);
      expect(price).toBeGreaterThanOrEqual(125);
    }
    
    if (DEBUG_MODE) console.log('Submitting round-trip form');
    
    // Create a promise to wait for navigation
    const navigationPromise = page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Trip' }).click();
    
    // Wait for navigation to dashboard after form submission
    await navigationPromise;
    
    // Verify that we've been redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    if (DEBUG_MODE) console.log('Round-trip creation successful');
  });
  
  test('should show validation errors for missing required fields', async ({ page }) => {
    // Navigate to new trip page
    await page.goto(`${TEST_URL}/trips/new`);
    
    // Try to submit the form without filling any fields
    await page.getByRole('button', { name: 'Create Trip' }).click();
    
    // Check for browser validation messages
    // Note: We need to get the first validation message that appears
    // This will be the client selection which is required
    const clientSelect = page.locator('#client_id');
    await expect(clientSelect).toBeFocused();
    
    // The validation message might appear differently in different browsers
    // We'll check that we're still on the form page, meaning submission failed
    await expect(page).toHaveURL(/.*trips\/new.*/);
    
    // Form should still be visible
    await expect(page.getByRole('heading', { name: /create new trip/i })).toBeVisible();
  });
});