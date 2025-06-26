#!/usr/bin/env node

/**
 * Comprehensive Dispatcher App Trip Actions Diagnostic Tool
 * 
 * This script will help identify the exact cause of the "Internal server error"
 * when trying to approve trips in the dispatcher app.
 */

const https = require('https');
const http = require('http');

console.log('🔍 DISPATCHER APP TRIP ACTIONS DIAGNOSTIC');
console.log('==========================================\n');

// Test configuration
const DISPATCHER_APP_URL = 'https://dispatch.compassionatecaretransportation.com';
const BOOKING_APP_URL = 'https://booking.compassionatecaretransportation.com';

async function runDiagnostics() {
  console.log('1️⃣ Testing dispatcher app accessibility...');
  await testEndpointAccessibility(`${DISPATCHER_APP_URL}/trips/individual`);
  
  console.log('\n2️⃣ Testing trip actions API endpoint...');
  await testTripActionsAPI();
  
  console.log('\n3️⃣ Testing payment API connectivity...');
  await testPaymentAPI();
  
  console.log('\n4️⃣ Testing environment variables...');
  testEnvironmentVariables();
  
  console.log('\n5️⃣ Generating troubleshooting recommendations...');
  generateRecommendations();
}

async function testEndpointAccessibility(url) {
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      console.log(`✅ ${url} - Status: ${response.statusCode}`);
      if (response.statusCode >= 400) {
        console.log(`⚠️  Warning: Non-success status code`);
      }
      resolve();
    });
    
    request.on('error', (error) => {
      console.log(`❌ ${url} - Error: ${error.message}`);
      resolve();
    });
    
    request.setTimeout(10000, () => {
      console.log(`❌ ${url} - Timeout after 10 seconds`);
      request.destroy();
      resolve();
    });
  });
}

async function testTripActionsAPI() {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      tripId: 'test-trip-id',
      action: 'approve'
    });

    const options = {
      hostname: 'dispatch.compassionatecaretransportation.com',
      port: 443,
      path: '/api/trips/actions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 10000
    };

    const request = https.request(options, (response) => {
      console.log(`📡 Trip Actions API - Status: ${response.statusCode}`);
      console.log(`📡 Headers:`, response.headers);
      
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      
      response.on('end', () => {
        console.log(`📡 Response body: ${body.substring(0, 500)}`);
        
        if (response.statusCode >= 500) {
          console.log('❌ INTERNAL SERVER ERROR CONFIRMED');
          console.log('This indicates a server-side issue.');
        } else if (response.statusCode === 401) {
          console.log('🔒 Authentication required - this is expected for unauthenticated requests');
        } else if (response.statusCode === 400) {
          console.log('⚠️  Bad request - this might be expected for test data');
        }
        resolve();
      });
    });

    request.on('error', (error) => {
      console.log(`❌ Trip Actions API - Network Error: ${error.message}`);
      resolve();
    });

    request.on('timeout', () => {
      console.log(`❌ Trip Actions API - Timeout`);
      request.destroy();
      resolve();
    });

    request.write(data);
    request.end();
  });
}

async function testPaymentAPI() {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      tripId: 'test-trip-id'
    });

    const options = {
      hostname: 'booking.compassionatecaretransportation.com',
      port: 443,
      path: '/api/stripe/charge-payment',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 10000
    };

    const request = https.request(options, (response) => {
      console.log(`💳 Payment API - Status: ${response.statusCode}`);
      
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      
      response.on('end', () => {
        console.log(`💳 Payment API Response: ${body.substring(0, 200)}`);
        
        if (response.statusCode >= 500) {
          console.log('❌ Payment API has internal server error - this could cause trip approval failures');
        } else if (response.statusCode === 404) {
          console.log('❌ Payment API endpoint not found - this would cause trip approval failures');
        } else if (response.statusCode >= 400) {
          console.log('⚠️  Payment API returned client error - this might be expected for test data');
        } else {
          console.log('✅ Payment API is accessible');
        }
        resolve();
      });
    });

    request.on('error', (error) => {
      console.log(`❌ Payment API - Network Error: ${error.message}`);
      console.log('💡 This network error could be causing the trip approval failures');
      resolve();
    });

    request.on('timeout', () => {
      console.log(`❌ Payment API - Timeout`);
      console.log('💡 Payment API timeouts could be causing the trip approval failures');
      request.destroy();
      resolve();
    });

    request.write(data);
    request.end();
  });
}

function testEnvironmentVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'BOOKING_APP_URL'
  ];

  console.log('🔧 Checking environment variables...');
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: Set (${value.substring(0, 20)}...)`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      if (varName === 'BOOKING_APP_URL') {
        console.log('💡 Missing BOOKING_APP_URL could cause payment processing failures');
      }
    }
  });
}

function generateRecommendations() {
  console.log('🔧 TROUBLESHOOTING RECOMMENDATIONS:');
  console.log('');
  console.log('If you see a 500 error from the Trip Actions API:');
  console.log('1. Check the server logs for detailed error messages');
  console.log('2. Verify all environment variables are set correctly');
  console.log('3. Restart the dispatcher app server');
  console.log('');
  console.log('If the Payment API is unreachable:');
  console.log('1. Check if the BookingCCT app is running');
  console.log('2. Verify the BOOKING_APP_URL environment variable');
  console.log('3. Check network connectivity between services');
  console.log('');
  console.log('Immediate workarounds:');
  console.log('1. Use the browser debug tool: /dispatcher_app/browser-debug-trip-approval.js');
  console.log('2. Check browser console for specific error messages');
  console.log('3. Try approving a facility trip (no payment processing)');
  console.log('');
  console.log('Next steps:');
  console.log('1. Open https://dispatch.compassionatecaretransportation.com/trips/individual');
  console.log('2. Open browser console (F12)');
  console.log('3. Try to approve a trip and check for error details');
  console.log('4. Share the specific error message for targeted troubleshooting');
}

// Run the diagnostics
runDiagnostics().then(() => {
  console.log('\n✅ Diagnostic complete!');
  console.log('Please share the results above to help identify the specific issue.');
}).catch((error) => {
  console.error('❌ Diagnostic failed:', error.message);
});
