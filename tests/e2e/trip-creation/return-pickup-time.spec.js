import { test, expect } from '@playwright/test';
import { testUsers } from '../../fixtures/test-users.js';

// Add debug info
const DEBUG_MODE = true;
const TEST_URL = 'http://localhost:3015';

test.describe('Trip Creation with Return Pickup Time', () => {
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

  test('should create a round-trip with specific return pickup time', async ({ page }) => {
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
    if (DEBUG_MODE) console.log('Filling out round-trip form with specific return pickup time');
    
    // 1. Select the first client from the dropdown
    const clientSelect = page.locator('#client_id');
    await clientSelect.click();
    // Skip the first option which is "Select a client"
    await page.locator('#client_id option:not([value=""])').first().click();
    
    // 2. Fill in addresses
    await page.getByLabel('Pickup Address').fill('123 Main St, New York, NY');
    await page.getByLabel('Destination Address').fill('456 Park Ave, New York, NY');
    
    // 3. Set pickup time (tomorrow at 10 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const formattedPickupDate = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
    await page.getByLabel('Pickup Date & Time').fill(formattedPickupDate);
    
    // 4. Select Round Trip option
    await page.getByRole('button', { name: 'Round Trip' }).click();
    
    // 5. Set return pickup time (tomorrow at 3 PM)
    const returnTime = new Date(tomorrow);
    returnTime.setHours(15, 0, 0, 0); // 3:00 PM, same day
    const formattedReturnDate = returnTime.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
    
    // Wait for the return pickup time field to be visible
    await page.getByLabel('Return Pickup Date & Time').waitFor({ state: 'visible' });
    await page.getByLabel('Return Pickup Date & Time').fill(formattedReturnDate);
    
    // 6. Add some notes
    await page.getByLabel('Additional Notes').fill('Round trip with specified return time of 3:00 PM.');
    
    // Check that the price calculation has updated for round trip
    await expect(page.getByText('Round trip with specified return time')).toBeVisible();
    
    // Check the increased price (base price should be $100 instead of $50 for round trip)
    const totalPriceElement = page.locator('text=/Total estimated price:.*/');
    const priceText = await totalPriceElement.textContent();
    
    // Extract the price amount
    const priceMatch = priceText.match(/\$(\d+\.\d+)/);
    if (priceMatch && priceMatch[1]) {
      const price = parseFloat(priceMatch[1]);
      if (DEBUG_MODE) console.log(`Trip price: $${price}`);
      expect(price).toBeGreaterThanOrEqual(100);
    }
    
    if (DEBUG_MODE) console.log('Submitting round-trip form with return pickup time');
    
    // Create a promise to wait for navigation
    const navigationPromise = page.waitForURL(/.*dashboard.*/, { timeout: 30000 });
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Trip' }).click();
    
    // Wait for navigation to dashboard after form submission
    await navigationPromise;
    
    // Verify that we've been redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    if (DEBUG_MODE) console.log('Round-trip creation with specific return time successful');
  });
  
  test('should reject round-trip with return time before pickup time', async ({ page }) => {
    // Skip this test if there are no clients
    if (DEBUG_MODE) console.log('Navigating to clients page to check for clients');
    await page.goto(`${TEST_URL}/clients`);
    
    const noClientsMessage = page.getByText(/no clients found/i);
    if (await noClientsMessage.isVisible()) {
      if (DEBUG_MODE) console.log('No clients to test with - skipping validation test');
      test.skip();
      return;
    }
    
    // Navigate to new trip page
    await page.goto(`${TEST_URL}/trips/new`);
    
    // Fill out the form with invalid round-trip information
    if (DEBUG_MODE) console.log('Filling out round-trip form with invalid return time');
    
    // 1. Select the first client from the dropdown
    const clientSelect = page.locator('#client_id');
    await clientSelect.click();
    // Skip the first option which is "Select a client"
    await page.locator('#client_id option:not([value=""])').first().click();
    
    // 2. Fill in addresses
    await page.getByLabel('Pickup Address').fill('123 Main St, New York, NY');
    await page.getByLabel('Destination Address').fill('456 Park Ave, New York, NY');
    
    // 3. Set pickup time (tomorrow at 2 PM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2:00 PM
    const formattedPickupDate = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
    await page.getByLabel('Pickup Date & Time').fill(formattedPickupDate);
    
    // 4. Select Round Trip option
    await page.getByRole('button', { name: 'Round Trip' }).click();
    
    // 5. Set INVALID return pickup time (tomorrow at 10 AM - earlier than pickup)
    const returnTime = new Date(tomorrow);
    returnTime.setHours(10, 0, 0, 0); // 10:00 AM, same day (earlier than pickup)
    const formattedReturnDate = returnTime.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
    
    // Wait for the return pickup time field to be visible
    await page.getByLabel('Return Pickup Date & Time').waitFor({ state: 'visible' });
    await page.getByLabel('Return Pickup Date & Time').fill(formattedReturnDate);
    
    // 6. Add some notes
    await page.getByLabel('Additional Notes').fill('Invalid return time that is earlier than pickup time.');
    
    if (DEBUG_MODE) console.log('Submitting invalid round-trip form');
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Trip' }).click();
    
    // Expect to see an alert message
    const dialogPromise = page.waitForEvent('dialog');
    const dialog = await dialogPromise;
    
    // Check dialog message
    expect(dialog.message()).toContain('Return pickup time must be after the initial pickup time');
    
    // Accept the dialog
    await dialog.accept();
    
    // Verify we're still on the new trip page
    await expect(page).toHaveURL(/.*trips\/new.*/);
    
    if (DEBUG_MODE) console.log('Invalid return time validation succeeded');
  });
  
  test('should reject round-trip with missing return pickup time', async ({ page }) => {
    // Skip this test if there are no clients
    if (DEBUG_MODE) console.log('Navigating to clients page to check for clients');
    await page.goto(`${TEST_URL}/clients`);
    
    const noClientsMessage = page.getByText(/no clients found/i);
    if (await noClientsMessage.isVisible()) {
      if (DEBUG_MODE) console.log('No clients to test with - skipping validation test');
      test.skip();
      return;
    }
    
    // Navigate to new trip page
    await page.goto(`${TEST_URL}/trips/new`);
    
    // Fill out the form with invalid round-trip information (missing return time)
    if (DEBUG_MODE) console.log('Filling out round-trip form with missing return time');
    
    // 1. Select the first client from the dropdown
    const clientSelect = page.locator('#client_id');
    await clientSelect.click();
    // Skip the first option which is "Select a client"
    await page.locator('#client_id option:not([value=""])').first().click();
    
    // 2. Fill in addresses
    await page.getByLabel('Pickup Address').fill('123 Main St, New York, NY');
    await page.getByLabel('Destination Address').fill('456 Park Ave, New York, NY');
    
    // 3. Set pickup time (tomorrow at 2 PM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2:00 PM
    const formattedPickupDate = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
    await page.getByLabel('Pickup Date & Time').fill(formattedPickupDate);
    
    // 4. Select Round Trip option
    await page.getByRole('button', { name: 'Round Trip' }).click();
    
    // 5. Do NOT set a return pickup time
    
    // 6. Add some notes
    await page.getByLabel('Additional Notes').fill('Missing return pickup time for round trip.');
    
    if (DEBUG_MODE) console.log('Submitting round-trip form without return time');
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Trip' }).click();
    
    // Expect to see an alert message
    const dialogPromise = page.waitForEvent('dialog');
    const dialog = await dialogPromise;
    
    // Check dialog message
    expect(dialog.message()).toContain('Please select a return pickup time for the round trip');
    
    // Accept the dialog
    await dialog.accept();
    
    // Verify we're still on the new trip page
    await expect(page).toHaveURL(/.*trips\/new.*/);
    
    if (DEBUG_MODE) console.log('Missing return time validation succeeded');
  });
});