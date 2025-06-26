#!/usr/bin/env node

/**
 * Production Diagnostic Script for Dispatcher Trip Actions
 * Tests the actual production environment that's failing
 */

console.log('🔍 PRODUCTION DISPATCHER TRIP ACTIONS DIAGNOSTIC');
console.log('=================================================');
console.log('URL: https://dispatch.compassionatecaretransportation.com');
console.log('Time:', new Date().toISOString());
console.log('');

async function testProductionIssue() {
  console.log('1️⃣ Testing BookingCCT Payment API connectivity...');
  
  try {
    const https = require('https');
    const url = require('url');
    
    // Test payment API endpoint
    const paymentApiUrl = 'https://booking.compassionatecaretransportation.com/api/stripe/charge-payment';
    const parsedUrl = url.parse(paymentApiUrl);
    
    const testPaymentAPI = () => {
      return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ tripId: 'test-trip-id' });
        
        const options = {
          hostname: parsedUrl.hostname,
          port: 443,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 8000
        };
        
        const req = https.request(options, (res) => {
          console.log(`Payment API Status: ${res.statusCode}`);
          
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            console.log(`Payment API Response (first 200 chars): ${data.substring(0, 200)}`);
            
            if (res.statusCode >= 500) {
              console.log('❌ PAYMENT API HAS INTERNAL SERVER ERROR');
              console.log('💡 This is causing dispatcher approval failures!');
            } else if (res.statusCode === 400) {
              console.log('✅ Payment API is responding (400 expected for test data)');
            } else {
              console.log(`ℹ️ Payment API returned: ${res.statusCode}`);
            }
            resolve();
          });
        });
        
        req.on('error', (err) => {
          console.log('❌ Payment API Connection Error:', err.message);
          console.log('💡 Network/connectivity issue causing dispatcher failures!');
          
          if (err.code === 'ECONNREFUSED') {
            console.log('   - Payment service is down');
          } else if (err.code === 'ETIMEDOUT') {
            console.log('   - Payment service is too slow to respond');
          } else if (err.code === 'ENOTFOUND') {
            console.log('   - Payment service hostname cannot be resolved');
          }
          resolve();
        });
        
        req.on('timeout', () => {
          console.log('❌ Payment API Timeout (8 seconds)');
          console.log('💡 Slow payment API causing dispatcher timeouts!');
          req.destroy();
          resolve();
        });
        
        req.write(postData);
        req.end();
      });
    };
    
    await testPaymentAPI();
    
  } catch (error) {
    console.log('❌ Test Error:', error.message);
  }
  
  console.log('');
  console.log('2️⃣ Testing Dispatcher Production API...');
  
  try {
    const https = require('https');
    
    const testDispatcherAPI = () => {
      return new Promise((resolve) => {
        const postData = JSON.stringify({
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
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 10000
        };
        
        const req = https.request(options, (res) => {
          console.log(`Dispatcher API Status: ${res.statusCode}`);
          
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            console.log(`Dispatcher API Response: ${data.substring(0, 300)}`);
            
            if (res.statusCode === 500) {
              console.log('❌ DISPATCHER API INTERNAL SERVER ERROR CONFIRMED');
              console.log('💡 This is the exact error you\'re seeing in the UI');
            } else if (res.statusCode === 401 || res.statusCode === 403) {
              console.log('✅ Dispatcher API is working (auth required, expected)');
            } else {
              console.log(`ℹ️ Dispatcher API status: ${res.statusCode}`);
            }
            resolve();
          });
        });
        
        req.on('error', (err) => {
          console.log('❌ Dispatcher API Error:', err.message);
          resolve();
        });
        
        req.on('timeout', () => {
          console.log('❌ Dispatcher API Timeout');
          req.destroy();
          resolve();
        });
        
        req.write(postData);
        req.end();
      });
    };
    
    await testDispatcherAPI();
    
  } catch (error) {
    console.log('❌ Dispatcher Test Error:', error.message);
  }
  
  console.log('');
  console.log('🔧 DIAGNOSIS SUMMARY:');
  console.log('=====================');
  console.log('');
  console.log('If Payment API shows errors above:');
  console.log('  → Payment processing is failing');
  console.log('  → Dispatcher approval fails when trying to charge payment');
  console.log('  → Need to check BookingCCT app payment system');
  console.log('');
  console.log('If Dispatcher API shows 500 errors:');
  console.log('  → Server-side issue in dispatcher app');
  console.log('  → Check production logs');
  console.log('  → Verify environment variables are set');
  console.log('');
  console.log('IMMEDIATE FIXES TO TRY:');
  console.log('1. Check production logs for detailed error messages');
  console.log('2. Verify BOOKING_APP_URL environment variable is set');
  console.log('3. Test if BookingCCT payment API is accessible from production');
  console.log('4. Consider implementing manual approval fallback');
  console.log('');
}

testProductionIssue();
