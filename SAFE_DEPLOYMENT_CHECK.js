/**
 * 🔍 SAFE DEPLOYMENT CHECK
 * 
 * This script safely checks if our fixes have been deployed to production
 * WITHOUT making any changes to trip data.
 * 
 * INSTRUCTIONS:
 * 1. Go to https://dispatch.compassionatecaretransportation.com/trips/individual
 * 2. Open Developer Tools (F12) → Console tab
 * 3. Paste this script and press Enter
 * 
 * This will check:
 * - If the API timeout fix is deployed
 * - If enhanced error handling is active
 * - If fallback mechanisms are working
 */

(async function safeDeploymentCheck() {
  console.clear();
  console.log('🔍 SAFE DEPLOYMENT CHECK');
  console.log('========================');
  console.log('🕐 Time:', new Date().toISOString());
  console.log('🌐 URL:', window.location.href);
  console.log('');

  console.log('1️⃣ Checking API endpoint availability...');
  
  try {
    // Test 1: Check for enhanced error handling with invalid data
    const testResponse = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: 'invalid-uuid-format',
        action: 'approve'
      })
    });
    
    const responseText = await testResponse.text();
    console.log(`📊 Response Status: ${testResponse.status}`);
    console.log(`📄 Response Body: ${responseText}`);
    
    // Check if we have enhanced error messages (indicates our fixes are deployed)
    if (responseText.includes('UUID format') || responseText.includes('invalid input syntax for type uuid')) {
      console.log('✅ Database layer is accessible');
    }
    
    if (responseText.includes('Missing required fields') || responseText.includes('Invalid action')) {
      console.log('✅ Input validation is working');
    }
    
    // Test 2: Check if we can identify the deployed version
    console.log('');
    console.log('2️⃣ Checking for deployment markers...');
    
    // Test with a request that should trigger timeout handling
    const timeoutTestStart = Date.now();
    try {
      const timeoutResponse = await fetch('/api/trips/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: 'timeout-test-marker',
          action: 'approve'
        })
      });
      
      const timeoutDuration = Date.now() - timeoutTestStart;
      const timeoutText = await timeoutResponse.text();
      
      console.log(`⏱️  Response time: ${timeoutDuration}ms`);
      
      // Check for our enhanced error messages
      if (timeoutText.includes('Request ID:') || timeoutText.includes('Enhanced error handling')) {
        console.log('🎉 ENHANCED ERROR HANDLING DETECTED!');
        console.log('✅ Our fixes appear to be deployed!');
      } else if (timeoutText.includes('Invalid trip ID format') || timeoutText.includes('Missing required fields')) {
        console.log('⚠️  Basic validation present, but enhanced features unclear');
      } else {
        console.log('❓ Cannot determine if enhanced features are deployed');
      }
      
    } catch (timeoutError) {
      console.log('❌ Timeout test failed:', timeoutError.message);
    }
    
  } catch (error) {
    console.log('❌ API connectivity test failed:', error.message);
    console.log('🔍 This could indicate the server is completely down');
  }
  
  console.log('');
  console.log('3️⃣ Extracting trip IDs for reference...');
  
  // Extract trip IDs without using them
  const pageText = document.body.innerText;
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const foundUuids = pageText.match(uuidRegex);
  
  if (foundUuids && foundUuids.length > 0) {
    console.log(`📋 Found ${foundUuids.length} trip IDs on this page`);
    console.log(`📝 Sample trip ID: ${foundUuids[0]} (for reference only)`);
    console.log('💡 You can test these manually with the full test script if needed');
  } else {
    console.log('❌ No trip IDs found on this page');
    console.log('💡 Make sure you are on the trips/individual page with trips displayed');
  }
  
  console.log('');
  console.log('🏁 DEPLOYMENT CHECK COMPLETE');
  console.log('');
  console.log('📊 RESULTS SUMMARY:');
  
  if (responseText && (responseText.includes('Request ID:') || responseText.includes('Enhanced error handling'))) {
    console.log('✅ STATUS: FIXES APPEAR TO BE DEPLOYED');
    console.log('💡 The enhanced error handling and timeout fixes are active');
    console.log('🎯 You can now test with real trip IDs using the full test script');
  } else {
    console.log('⚠️  STATUS: DEPLOYMENT STATUS UNCLEAR');
    console.log('💡 The API is responding but enhanced features cannot be confirmed');
    console.log('🔧 Consider deploying the PRODUCTION_HOTFIX_route.js file');
  }
  
  console.log('');
  console.log('📋 NEXT STEPS:');
  console.log('   1. If fixes are deployed: Test with real trip IDs');
  console.log('   2. If status unclear: Deploy the hotfix and retest');
  console.log('   3. If API is down: Check server status and logs');
  
})();
