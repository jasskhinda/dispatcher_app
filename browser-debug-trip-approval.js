/**
 * Simple browser-based test for debugging trip approval issues
 * 
 * Instructions:
 * 1. Open https://dispatch.compassionatecaretransportation.com/trips/individual
 * 2. Log in as a dispatcher
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire script
 * 5. Run: debugTripApproval()
 */

async function debugTripApproval() {
  console.log('🔍 DEBUGGING TRIP APPROVAL ISSUE');
  console.log('=================================\n');

  // Step 1: Check authentication
  console.log('1️⃣ Checking authentication...');
  try {
    const authResponse = await fetch('/api/auth/session');
    if (authResponse.ok) {
      const session = await authResponse.json();
      console.log('✅ Authentication working');
      console.log('User:', session.user?.email || 'Unknown');
    } else {
      console.log('❌ Authentication issue:', authResponse.status);
      return;
    }
  } catch (error) {
    console.log('❌ Auth test failed:', error.message);
  }

  // Step 2: Get a pending trip ID from the page
  console.log('\n2️⃣ Looking for pending trips on page...');
  const pendingTripButtons = document.querySelectorAll('button[onclick*="approve"]');
  if (pendingTripButtons.length === 0) {
    console.log('❌ No pending trips found on page');
    console.log('💡 Try refreshing the page or creating a test trip');
    return;
  }

  // Extract trip ID from the first pending trip
  let testTripId = null;
  for (const button of pendingTripButtons) {
    const onclick = button.getAttribute('onclick');
    const match = onclick?.match(/handleTripAction\(['"]([^'"]+)['"]/);
    if (match) {
      testTripId = match[1];
      break;
    }
  }

  if (!testTripId) {
    console.log('❌ Could not extract trip ID from page');
    return;
  }

  console.log('✅ Found test trip ID:', testTripId.substring(0, 8) + '...');

  // Step 3: Test the API endpoint directly
  console.log('\n3️⃣ Testing trip actions API...');
  try {
    const response = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: testTripId,
        action: 'approve'
      }),
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.text();
    console.log('API Response Body:', result);

    if (response.status >= 500) {
      console.log('\n❌ INTERNAL SERVER ERROR CONFIRMED');
      console.log('This indicates a server-side issue. Common causes:');
      console.log('- Database connection problems');
      console.log('- Missing environment variables');
      console.log('- Payment API connectivity issues');
      console.log('- Authentication/authorization problems');
      
      // Try to parse the error response
      try {
        const errorData = JSON.parse(result);
        console.log('Error details:', errorData);
        
        if (errorData.details?.includes('fetch')) {
          console.log('💡 Likely cause: Payment API connection issue');
        } else if (errorData.details?.includes('permission')) {
          console.log('💡 Likely cause: Database permission issue');
        } else if (errorData.details?.includes('timeout')) {
          console.log('💡 Likely cause: Request timeout');
        }
      } catch (parseError) {
        console.log('Could not parse error response as JSON');
      }
    } else if (response.ok) {
      console.log('✅ API call successful!');
      try {
        const successData = JSON.parse(result);
        console.log('Success data:', successData);
      } catch (parseError) {
        console.log('Response is not JSON');
      }
    } else {
      console.log(`❌ API returned ${response.status}`);
    }

  } catch (error) {
    console.log('❌ API test failed:', error.message);
    console.log('Error type:', error.name);
    console.log('Full error:', error);
  }

  // Step 4: Test payment API connectivity
  console.log('\n4️⃣ Testing payment API connectivity...');
  try {
    const paymentTestResponse = await fetch('https://booking.compassionatecaretransportation.com/api/stripe/charge-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tripId: 'test-trip-id' }),
    });

    console.log('Payment API Status:', paymentTestResponse.status);
    const paymentResult = await paymentTestResponse.text();
    console.log('Payment API Response:', paymentResult.substring(0, 200));

  } catch (paymentError) {
    console.log('❌ Payment API test failed:', paymentError.message);
    console.log('💡 This could be causing the internal server error!');
  }

  console.log('\n🔧 TROUBLESHOOTING SUMMARY:');
  console.log('If you see a 500 error above, the issue is server-side.');
  console.log('Common fixes:');
  console.log('1. Check server logs for detailed error messages');
  console.log('2. Verify environment variables are set correctly');
  console.log('3. Ensure payment API is accessible');
  console.log('4. Check database permissions for dispatcher role');
  console.log('5. Restart the application server');
}

// Helper function to test with a specific trip ID
async function testSpecificTrip(tripId) {
  console.log(`🧪 Testing with specific trip ID: ${tripId}`);
  
  try {
    const response = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: tripId,
        action: 'approve'
      }),
    });

    console.log('Status:', response.status);
    const result = await response.text();
    console.log('Response:', result);

  } catch (error) {
    console.log('Error:', error.message);
  }
}

console.log('🚀 Trip Approval Debug Tool Loaded!');
console.log('');
console.log('Available functions:');
console.log('- debugTripApproval() - Full diagnostic test');
console.log('- testSpecificTrip("trip-id") - Test with specific trip ID');
console.log('');
console.log('Run debugTripApproval() to start debugging...');
