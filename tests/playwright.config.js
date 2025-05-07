import dotenv from 'dotenv';
import { globalSetup, globalTeardown } from './global-setup.js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envFile = '.env.test';
dotenv.config({ path: envFile });

// Check if .env.test exists and log warning if it doesn't
if (!fs.existsSync(path.join(process.cwd(), envFile))) {
  console.warn(`\n⚠️ Warning: ${envFile} file not found! Please create it from the example file.`);
}

// Define port for the server
const TEST_PORT = process.env.TEST_PORT || 3015;
const BASE_URL = `http://localhost:${TEST_PORT}`;

console.log(`\n📝 Test Configuration:`);
console.log(`   - Port: ${TEST_PORT}`);
console.log(`   - Base URL: ${BASE_URL}`);
console.log(`   - Environment: ${envFile}`);

export default {
  testDir: './e2e',
  timeout: 60000, // Increase timeout to 60 seconds
  retries: 2,     // Allow two retries for flaky tests
  globalSetup,
  globalTeardown,
  
  // Use a custom setup for web server
  // Disable the built-in webServer since we handle this ourselves in globalSetup
  /*
  webServer: {
    command: `PORT=${TEST_PORT} npm run dev`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60000, // Allow 60 seconds for startup
  },
  */
  
  use: {
    // Set the base URL for all tests
    baseURL: BASE_URL,
    
    // Increase timeouts for navigations
    navigationTimeout: 30000,
    
    // Add debug info
    trace: 'on',
    screenshot: 'on',
    video: 'on-first-retry',
    
    // Add helpful logs
    launchOptions: {
      slowMo: 100, // Slow down operations by 100ms
    },
  },
  
  // Configure reporter
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  
  // Configure projects (browsers)
  projects: [
    {
      name: 'Chromium',
      use: { browserName: 'chromium' },
    },
  ],
  
  // Output more verbose logs
  quiet: false,
  
  // Fail test if console error occurs
  forbidOnly: !!(process.env.CI),
};