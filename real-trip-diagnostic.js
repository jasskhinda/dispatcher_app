/**
 * 🔍 REAL TRIP DIAGNOSTIC FOR PRODUCTION
 * 
 * This diagnostic will test with actual trip IDs from the current page
 * 
 * INSTRUCTIONS:
 * 1. Go to https://dispatch.compassionatecaretransportation.com/trips/individual
 * 2. Open browser Developer Tools (F12)
 * 3. Paste this script in Console and press Enter
 * 4. This will test with real trip IDs from the page
 */

(async function diagnoseRealTrips() {
  console.log('🔍 REAL TRIP DIAGNOSTIC - PRODUCTION');
  console.log('====================================');
  console.log('Time:', new Date().toISOString());
  console.log('');

  // Extract real trip IDs from the current page
  console.log('1️⃣ Extracting trip IDs from current page...');
  
  const tripElements = document.querySelectorAll('[class*="trip"], [data-trip-id], button[onclick*="handleTripAction"]');
  const tripIds = [];
  
  // Look for trip IDs in various places
  const allText = document.body.innerText;
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const foundUuids = allText.match(uuidRegex);
  
  if (foundUuids && foundUuids.length > 0) {
    console.log(`Found ${foundUuids.length} potential trip UUIDs on page`);
    foundUuids.slice(0, 3).forEach((uuid, index) => {
      console.log(`  ${index + 1}. ${uuid}`);
      tripIds.push(uuid);
    });
  } else {
    console.log('❌ No trip UUIDs found on page');
    console.log('💡 Make sure you are on the trips/individual page with trips listed');
    return;
  }

  // Test with the first real trip ID
  if (tripIds.length > 0) {
    const testTripId = tripIds[0];
    console.log('');
    console.log(`2️⃣ Testing APPROVE action with real trip ID: ${testTripId}...`);
    
    try {
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

      console.log(`API Status: ${response.status}`);
      const result = await response.text();
      console.log(`API Response: ${result}`);

      if (response.status === 500) {
        console.log('❌ CONFIRMED: 500 Internal Server Error');
        try {
          const errorData = JSON.parse(result);
          console.log('Error details:', errorData);
        } catch (e) {
          console.log('Raw error response:', result);
        }
      } else if (response.status === 400) {
        console.log('ℹ️ 400 Bad Request - could be status validation');
        try {
          const errorData = JSON.parse(result);
          if (errorData.details && errorData.details.includes('status')) {
            console.log('✅ API working - trip status validation (expected)');
          } else {
            console.log('⚠️ Other validation error:', errorData);
          }
        } catch (e) {
          console.log('Raw response:', result);
        }
      } else if (response.status === 401) {
        console.log('🔒 401 Unauthorized - need to be logged in as dispatcher');
      } else if (response.status === 403) {
        console.log('🔒 403 Forbidden - need dispatcher role');
      } else if (response.status === 404) {
        console.log('❌ 404 Not Found - trip not found or API endpoint missing');
      } else {
        console.log(`ℹ️ Unexpected status: ${response.status}`);
      }

    } catch (apiError) {
      console.log('❌ API Request Error:', apiError.message);
    }

    // Test COMPLETE action with a different trip
    if (tripIds.length > 1) {
      console.log('');
      console.log(`3️⃣ Testing COMPLETE action with trip ID: ${tripIds[1]}...`);
      
      try {
        const completeResponse = await fetch('/api/trips/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripId: tripIds[1],
            action: 'complete'
          })
        });

        console.log(`Complete API Status: ${completeResponse.status}`);
        const completeResult = await completeResponse.text();
        console.log(`Complete API Response: ${completeResult.substring(0, 300)}`);

      } catch (completeError) {
        console.log('❌ Complete API Error:', completeError.message);
      }
    }
  }

  console.log('');
  console.log('4️⃣ Checking authentication status...');
  
  // Check if user is logged in
  const authCookies = document.cookie.split(';').filter(cookie => 
    cookie.includes('supabase') || cookie.includes('auth') || cookie.includes('session')
  );
  
  if (authCookies.length > 0) {
    console.log('✅ Authentication cookies found');
    authCookies.forEach(cookie => {
      console.log(`  ${cookie.trim().substring(0, 50)}...`);
    });
  } else {
    console.log('❌ No authentication cookies found');
    console.log('💡 You may need to log in again');
  }

  console.log('');
  console.log('5️⃣ Network tab inspection...');
  console.log('💡 NEXT STEPS:');
  console.log('1. Click an APPROVE or COMPLETE button on the page');
  console.log('2. Watch the Network tab in DevTools');
  console.log('3. Look for the /api/trips/actions request');
  console.log('4. Check the Response tab for detailed error info');
  console.log('5. Share the exact error response');

  console.log('');
  console.log('🔧 DIAGNOSTIC SUMMARY:');
  console.log('======================');
  console.log('');
  
  if (tripIds.length === 0) {
    console.log('❌ No trip IDs found - ensure you are on the trips page');
  } else {
    console.log(`✅ Found ${tripIds.length} trip IDs to test with`);
    console.log('📋 Test results above show the exact API behavior');
    console.log('💡 The "Internal server error" in UI might be different from API response');
  }

})();
