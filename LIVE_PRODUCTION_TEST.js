/**
 * 🚀 LIVE PRODUCTION TEST SCRIPT
 * 
 * This script will test the trip actions on the live production environment
 * and help determine if our fixes have been deployed.
 * 
 * INSTRUCTIONS:
 * 1. Go to https://dispatch.compassionatecaretransportation.com/trips/individual
 * 2. Open Developer Tools (F12) → Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 * 
 * This will:
 * - Extract real trip IDs from the page
 * - Test the API endpoints with actual data
 * - Show detailed diagnostic information
 * - Help determine what needs to be fixed
 */

(async function liveProductionTest() {
  console.clear();
  console.log('🚀 LIVE PRODUCTION TEST SCRIPT');
  console.log('==============================');
  console.log('🕐 Time:', new Date().toISOString());
  console.log('🌐 URL:', window.location.href);
  console.log('');

  // Step 1: Extract trip IDs from the current page
  console.log('📋 Step 1: Extracting trip IDs from page...');
  
  const tripIds = [];
  
  // Method 1: Look for UUIDs in page content
  const pageText = document.body.innerText;
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const foundUuids = pageText.match(uuidRegex);
  
  if (foundUuids) {
    foundUuids.forEach(uuid => {
      if (!tripIds.includes(uuid)) {
        tripIds.push(uuid);
      }
    });
  }
  
  // Method 2: Look in button onclick handlers
  const buttons = document.querySelectorAll('button[onclick]');
  buttons.forEach(button => {
    const onclick = button.getAttribute('onclick');
    if (onclick) {
      const matches = onclick.match(uuidRegex);
      if (matches) {
        matches.forEach(uuid => {
          if (!tripIds.includes(uuid)) {
            tripIds.push(uuid);
          }
        });
      }
    }
  });
  
  // Method 3: Look in data attributes
  const elementsWithData = document.querySelectorAll('[data-trip-id]');
  elementsWithData.forEach(el => {
    const tripId = el.getAttribute('data-trip-id');
    if (tripId && tripId.match(uuidRegex)) {
      if (!tripIds.includes(tripId)) {
        tripIds.push(tripId);
      }
    }
  });

  console.log(`✅ Found ${tripIds.length} trip IDs on page:`);
  tripIds.slice(0, 5).forEach((id, index) => {
    console.log(`   ${index + 1}. ${id}`);
  });
  
  if (tripIds.length === 0) {
    console.log('❌ No trip IDs found on this page');
    console.log('💡 Please make sure you are on the trips/individual page with trips displayed');
    console.log('💡 The page should show a list of trips with APPROVE/COMPLETE buttons');
    return;
  }

  console.log('');
  
  // Step 2: Test API availability
  console.log('🔌 Step 2: Testing API availability...');
  
  try {
    const healthResponse = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: 'test-connectivity',
        action: 'test'
      })
    });
    
    console.log(`✅ API responded with status: ${healthResponse.status}`);
    
    if (healthResponse.status === 400) {
      const errorText = await healthResponse.text();
      console.log('📄 Response body:', errorText);
      
      if (errorText.includes('Missing required fields') || errorText.includes('Invalid action')) {
        console.log('✅ API is working - validation errors are expected for test data');
      }
    }
  } catch (error) {
    console.log('❌ API connectivity test failed:', error.message);
  }
  
  console.log('');

  // Step 3: Test with real trip ID
  if (tripIds.length > 0) {
    const testTripId = tripIds[0];
    console.log(`🎯 Step 3: Testing with real trip ID: ${testTripId}...`);
    console.log('⚠️  This will attempt to APPROVE the trip - proceed carefully in production!');
    
    // Give user a chance to stop
    const shouldContinue = confirm(`🚨 PRODUCTION TEST WARNING 🚨\n\nThis will attempt to APPROVE trip: ${testTripId}\n\nThis is a REAL trip on the LIVE system!\n\nOnly proceed if you are authorized to approve trips.\n\nContinue?`);
    
    if (!shouldContinue) {
      console.log('❌ Test cancelled by user');
      return;
    }
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('/api/trips/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: testTripId,
          action: 'approve'
        })
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`📊 Response time: ${duration}ms`);
      console.log(`📋 Status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log('📄 Response body:');
      console.log(responseText);
      
      if (response.ok) {
        console.log('🎉 SUCCESS! Trip action completed successfully');
        try {
          const responseData = JSON.parse(responseText);
          if (responseData.fallback) {
            console.log('⚠️  FALLBACK MODE: Trip approved but payment processing failed');
            console.log('💡 This indicates the payment service is having issues');
          }
        } catch (e) {
          // Response might not be JSON
        }
      } else {
        console.log('❌ FAILED! Trip action returned an error');
        
        if (response.status === 500) {
          console.log('🔥 This is the original "Internal server error" issue');
          console.log('📝 The deployment may not include our fixes yet');
        } else if (response.status === 404) {
          console.log('🔍 Trip not found - may be invalid trip ID');
        } else if (response.status === 400) {
          console.log('📝 Bad request - check the error message above');
        }
      }
      
    } catch (error) {
      console.log('💥 Network error:', error.message);
      console.log('🔍 This could indicate:');
      console.log('   - Network connectivity issues');
      console.log('   - Server completely down');
      console.log('   - Request timeout');
    }
  }
  
  console.log('');
  console.log('🏁 Test completed!');
  console.log('');
  console.log('📋 SUMMARY:');
  console.log(`   - Found ${tripIds.length} trip IDs`);
  console.log('   - API connectivity tested');
  console.log('   - Live trip action tested');
  console.log('');
  console.log('💡 Next steps based on results:');
  console.log('   ✅ If successful → Fixes are deployed and working');
  console.log('   ❌ If 500 error → Deployment may be needed');
  console.log('   ⚠️  If fallback → Payment service needs attention');
  console.log('   🔍 If 404 → Check trip ID validity');
})();

console.log('');
console.log('📌 READY TO RUN!');
console.log('➡️  The script is loaded and ready.');
console.log('⚠️  Make sure you are on: https://dispatch.compassionatecaretransportation.com/trips/individual');
console.log('🚀 Press Enter to execute the test!');
