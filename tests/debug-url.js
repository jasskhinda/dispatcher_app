#!/usr/bin/env node

/**
 * Debug script to verify server connectivity
 * Run this with: node tests/debug-url.js
 */

const http = require('http');
const PORT = process.env.PORT || 3015;
const URL = `http://localhost:${PORT}`;

console.log(`Checking connection to server at ${URL}...`);

// Function to test a specific URL
function testUrl(url) {
  return new Promise((resolve) => {
    console.log(`Testing: ${url}`);
    
    const request = http.get(url, (res) => {
      console.log(`✅ Connected to ${url} - Status: ${res.statusCode}`);
      resolve(true);
      res.resume();
    });
    
    request.on('error', (err) => {
      console.error(`❌ Failed to connect to ${url}: ${err.message}`);
      resolve(false);
    });
    
    request.setTimeout(5000, () => {
      console.error(`❌ Connection timeout for ${url}`);
      request.destroy();
      resolve(false);
    });
  });
}

// Test multiple URLs
async function runTests() {
  // Test connection to the server
  const mainConnection = await testUrl(URL);
  
  // If main connection works, test specific pages
  if (mainConnection) {
    console.log('\nTesting specific routes:');
    await testUrl(`${URL}/login`);
    await testUrl(`${URL}/dashboard`);
  }
  
  console.log('\nDebug information:');
  console.log('------------------');
  console.log(`Server should be running on port: ${PORT}`);
  console.log(`To start server manually: PORT=${PORT} npm run dev`);
  console.log(`To run tests: npm run test`);
}

runTests().catch(console.error);