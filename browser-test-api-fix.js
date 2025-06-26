/**
 * Browser Console Test for Fixed Dispatcher API
 * 
 * Instructions:
 * 1. Open https://dispatch.compassionatecaretransportation.com/trips/individual
 * 2. Log in as a dispatcher
 * 3. Open browser console (F12)
 * 4. Copy and paste this script
 * 5. Run: testFixedAPI()
 */

console.log('🔧 DISPATCHER API FIX VERIFICATION LOADED');
console.log('=========================================\n');

async function testFixedAPI() {
  console.log('🧪 Testing Fixed Dispatcher API...\n');
  
  // Step 1: Check authentication
  console.log('1️⃣ Checking dispatcher authentication...');
  try {
    const authResponse = await fetch('/api/auth/session');
    if (authResponse.ok) {
      console.log('✅ Authentication working');
    } else {
      console.log('❌ Authentication issue - please log in first');
      return;
    }
  } catch (error) {
    console.log('❌ Auth check failed:', error.message);
    return;
  }
  
  // Step 2: Get pending trips from the page
  console.log('\n2️⃣ Looking for pending trips...');
  const pendingButtons = document.querySelectorAll('button[onclick*="approve"], button[onclick*="handleTripAction"]');
  console.log(`Found ${pendingButtons.length} action buttons on page`);
  
  if (pendingButtons.length === 0) {
    console.log('⚠️  No pending trips found on this page');
    console.log('💡 Try navigating to the individual trips page with pending trips');
    return;
  }
  
  // Extract trip ID from the first button
  let testTripId = null;
  for (const button of pendingButtons) {
    const onclick = button.getAttribute('onclick');
    const match = onclick?.match(/['"]([a-f0-9-]{36})['"]/);
    if (match) {
      testTripId = match[1];
      break;
    }
  }
  
  if (!testTripId) {
    console.log('❌ Could not extract trip ID from page buttons');
    return;
  }
  
  console.log(`✅ Found test trip: ${testTripId.substring(0, 8)}...`);
  
  // Step 3: Test the fixed approval API
  console.log('\n3️⃣ Testing approval action (this should now work)...');
  
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
      }),
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`📊 Response received in ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    const result = await response.text();
    
    if (response.status === 500) {
      console.log('❌ STILL GETTING INTERNAL SERVER ERROR');
      console.log('🔍 Error details:', result.substring(0, 500));
      console.log('\n💡 Possible remaining issues:');
      console.log('   - Payment API still not accessible');
      console.log('   - Environment variables not updated');
      console.log('   - Server needs restart to pick up changes');
    } else if (response.status === 200) {
      console.log('✅ SUCCESS! Approval API is working');
      try {
        const parsed = JSON.parse(result);
        console.log('🎉 Approval result:', {
          success: parsed.success,
          tripStatus: parsed.trip?.status,
          paymentCharged: parsed.payment?.charged,
          message: parsed.message
        });
      } catch (e) {
        console.log('✅ Got 200 response but could not parse JSON');
      }
    } else if (response.status === 401 || response.status === 403) {
      console.log('🔒 Authentication/permission issue (check dispatcher role)');
    } else if (response.status === 400) {
      console.log('⚠️  Bad request - trip might not be in correct state');
      console.log('📄 Response:', result.substring(0, 300));
    } else {
      console.log(`ℹ️  Unexpected status: ${response.status}`);
      console.log('📄 Response:', result.substring(0, 300));
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
    if (error.name === 'TimeoutError') {
      console.log('⏱️  API call timed out - server might be overloaded');
    }
  }
  
  // Step 4: Test complete action
  console.log('\n4️⃣ Testing complete action...');
  
  try {
    const response = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: testTripId,
        action: 'complete'
      }),
    });
    
    console.log(`📊 Complete action status: ${response.status}`);
    
    if (response.status === 500) {
      console.log('❌ Complete action also failing with 500 error');
    } else {
      console.log('✅ Complete action not returning 500 error');
    }
    
  } catch (error) {
    console.log('❌ Complete action network error:', error.message);
  }
  
  console.log('\n🎯 TEST SUMMARY');
  console.log('===============');
  console.log('If you see "SUCCESS!" above, the fix is working!');
  console.log('If you still see 500 errors, additional investigation needed.');
  console.log('\nNext steps if still failing:');
  console.log('1. Check server logs for detailed error messages');
  console.log('2. Verify payment API is accessible from dispatcher server');
  console.log('3. Restart the dispatcher application server');
  console.log('4. Check environment variables are properly loaded');
}

async function testPaymentAPIDirectly() {
  console.log('\n🔧 Testing Payment API Status Validation Fix...\n');
  
  try {
    const response = await fetch('https://booking.compassionatecaretransportation.com/api/stripe/charge-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        tripId: 'test-trip-id-for-status-validation'
      }),
    });
    
    console.log(`Payment API Status: ${response.status}`);
    const result = await response.text();
    
    if (result.includes('Trip must be approved (upcoming status)')) {
      console.log('❌ Payment API still has old status validation');
    } else if (result.includes('Current status:') || result.includes('approved_pending_payment')) {
      console.log('✅ Payment API has updated status validation');
    } else {
      console.log('ℹ️  Payment API responding with other validation');
    }
    
    console.log('Response preview:', result.substring(0, 200));
    
  } catch (error) {
    console.log('❌ Payment API test error:', error.message);
  }
}

// Auto-run basic test
console.log('🚀 Auto-running API fix verification...');
console.log('Call testFixedAPI() for full test or testPaymentAPIDirectly() for payment API test\n');

// Expose functions globally
window.testFixedAPI = testFixedAPI;
window.testPaymentAPIDirectly = testPaymentAPIDirectly;

console.log('Available functions:');
console.log('- testFixedAPI() - Full dispatcher API test');
console.log('- testPaymentAPIDirectly() - Payment API validation test');
