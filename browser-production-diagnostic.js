/**
 * 🔍 BROWSER DIAGNOSTIC FOR PRODUCTION DISPATCHER ISSUE
 * 
 * INSTRUCTIONS:
 * 1. Go to https://dispatch.compassionatecaretransportation.com/trips/individual
 * 2. Open browser Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Paste this entire script and press Enter
 * 5. Look for the results and share them
 */

(async function diagnoseProductionIssue() {
  console.log('🔍 PRODUCTION DISPATCHER DIAGNOSTIC');
  console.log('===================================');
  console.log('Time:', new Date().toISOString());
  console.log('URL:', window.location.href);
  console.log('');

  // Test 1: Check if we can access the trip actions API
  console.log('1️⃣ Testing Dispatcher Actions API...');
  try {
    const response = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: 'test-trip-id-diagnostic',
        action: 'approve'
      })
    });

    console.log(`API Status: ${response.status}`);
    const result = await response.text();
    console.log(`API Response: ${result.substring(0, 500)}`);

    if (response.status === 500) {
      console.log('❌ CONFIRMED: API returning 500 Internal Server Error');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(result);
        if (errorData.error) {
          console.log(`Error: ${errorData.error}`);
        }
        if (errorData.details) {
          console.log(`Details: ${errorData.details}`);
        }
        if (errorData.requestId) {
          console.log(`Request ID: ${errorData.requestId}`);
        }
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
    } else if (response.status === 401) {
      console.log('✅ API accessible but requires authentication (expected)');
    } else if (response.status === 400) {
      console.log('✅ API accessible, bad request for test data (expected)');
    }

  } catch (apiError) {
    console.log('❌ API Test Error:', apiError.message);
  }

  console.log('');
  console.log('2️⃣ Testing Payment API connectivity...');
  
  try {
    const paymentResponse = await fetch('https://booking.compassionatecaretransportation.com/api/stripe/charge-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tripId: 'test-trip-id-diagnostic' })
    });

    console.log(`Payment API Status: ${paymentResponse.status}`);
    const paymentResult = await paymentResponse.text();
    console.log(`Payment API Response: ${paymentResult.substring(0, 300)}`);

    if (paymentResponse.status >= 500) {
      console.log('❌ PAYMENT API HAS INTERNAL ERROR - This could cause dispatcher failures');
    } else if (paymentResponse.status === 400) {
      console.log('✅ Payment API responding (400 expected for test data)');
    } else if (paymentResponse.status === 401) {
      console.log('✅ Payment API responding (401 auth required expected)');
    }

  } catch (paymentError) {
    console.log('❌ Payment API Error:', paymentError.message);
    console.log('💡 Payment API connectivity issues could cause dispatcher failures');
  }

  console.log('');
  console.log('3️⃣ Checking browser environment...');
  console.log(`User Agent: ${navigator.userAgent}`);
  console.log(`Cookies enabled: ${navigator.cookieEnabled}`);
  console.log(`Online status: ${navigator.onLine}`);

  // Check if there are any pending trips we can test with
  console.log('');
  console.log('4️⃣ Looking for test trips on current page...');
  
  const approveButtons = document.querySelectorAll('button:contains("APPROVE"), button[onclick*="approve"]');
  const completeButtons = document.querySelectorAll('button:contains("COMPLETE"), button[onclick*="complete"]');
  
  console.log(`Found ${approveButtons.length} APPROVE buttons`);
  console.log(`Found ${completeButtons.length} COMPLETE buttons`);

  if (approveButtons.length > 0) {
    console.log('💡 You can test by clicking an APPROVE button and checking the Network tab');
  }

  console.log('');
  console.log('🔧 DIAGNOSTIC SUMMARY:');
  console.log('======================');
  console.log('');
  console.log('✅ If you see API Status 401/400: API is working, authentication issue');
  console.log('❌ If you see API Status 500: Server error - check production deployment');
  console.log('❌ If you see Payment API errors: Payment system issue affecting approvals');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Share this diagnostic output');
  console.log('2. Check browser Network tab when clicking APPROVE/COMPLETE');
  console.log('3. Look for detailed error messages in failed requests');
  console.log('4. Check if recent code changes were deployed to production');

})();
