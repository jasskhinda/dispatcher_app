#!/usr/bin/env node

/**
 * Comprehensive test of the dispatcher trip actions API
 * This tests the complete approval workflow
 */

console.log('🚀 COMPREHENSIVE DISPATCHER API TEST');
console.log('===================================\n');

async function testDispatcherApprovalFlow() {
  try {
    // Test 1: Test the approval endpoint directly
    console.log('1️⃣ Testing dispatcher approval endpoint...');
    
    const testTripId = 'test-trip-id'; // This will fail but we can see the error patterns
    
    const response = await fetch('https://dispatch.compassionatecaretransportation.com/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: testTripId,
        action: 'approve'
      }),
      signal: AbortSignal.timeout(15000)
    });

    console.log(`   Dispatcher API Status: ${response.status}`);
    
    const result = await response.text();
    console.log(`   Response (first 300 chars): ${result.substring(0, 300)}...`);
    
    // Analyze the response
    if (response.status === 500) {
      console.log('❌ INTERNAL SERVER ERROR detected');
      
      if (result.includes('Payment system connection failed')) {
        console.log('💡 Issue: Payment system connectivity');
      } else if (result.includes('Database connection failed')) {
        console.log('💡 Issue: Database connectivity');
      } else if (result.includes('Authentication failed')) {
        console.log('💡 Issue: Authentication/session');
      } else if (result.includes('fetch')) {
        console.log('💡 Issue: External API call failure');
      } else {
        console.log('💡 Issue: Unknown server error');
      }
    } else if (response.status === 401) {
      console.log('🔒 Authentication required (expected for test)');
    } else if (response.status === 400) {
      console.log('⚠️  Bad request (expected for invalid trip ID)');
    } else if (response.status === 404) {
      console.log('🔍 Trip not found (expected for test trip ID)');
    }

    // Test 2: Test payment API availability
    console.log('\n2️⃣ Testing payment API availability...');
    
    const paymentResponse = await fetch('https://booking.compassionatecaretransportation.com/api/stripe/charge-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tripId: testTripId }),
      signal: AbortSignal.timeout(10000)
    });

    console.log(`   Payment API Status: ${paymentResponse.status}`);
    
    const paymentResult = await paymentResponse.text();
    console.log(`   Payment Response (first 200 chars): ${paymentResult.substring(0, 200)}...`);
    
    if (paymentResponse.status >= 500) {
      console.log('❌ Payment API has internal errors - this could cause dispatcher approval failures');
    } else if (paymentResponse.status === 400) {
      console.log('✅ Payment API is responding (validation errors expected)');
    } else if (paymentResponse.status === 401) {
      console.log('✅ Payment API is responding (authentication required)');
    }

    // Test 3: Check environment connectivity
    console.log('\n3️⃣ Testing environment connectivity...');
    
    // Test dispatcher app health
    const dispatcherHealthResponse = await fetch('https://dispatch.compassionatecaretransportation.com/', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`   Dispatcher App Health: ${dispatcherHealthResponse.status}`);
    
    // Test booking app health
    const bookingHealthResponse = await fetch('https://booking.compassionatecaretransportation.com/', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`   BookingCCT App Health: ${bookingHealthResponse.status}`);

    // Summary and recommendations
    console.log('\n🎯 TEST SUMMARY & RECOMMENDATIONS');
    console.log('=================================');
    
    if (response.status === 500) {
      console.log('❌ ISSUE CONFIRMED: Dispatcher API returning internal server error');
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('1. Check dispatcher app server logs for detailed error messages');
      console.log('2. Verify environment variables (BOOKING_APP_URL, Supabase keys)');
      console.log('3. Test payment API connectivity from dispatcher server');
      console.log('4. Implement better error handling and fallback mechanisms');
      console.log('5. Consider adding circuit breaker pattern for external API calls');
    } else {
      console.log('✅ No immediate API errors detected in basic testing');
      console.log('\n💡 If users are still experiencing issues:');
      console.log('1. Check authentication/session management');
      console.log('2. Verify trip data integrity and status flows');
      console.log('3. Monitor for intermittent network issues');
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Apply the status validation fix to payment API (already done)');
    console.log('2. Test with real authentication and trip data');
    console.log('3. Monitor server logs during approval attempts');
    console.log('4. Consider implementing retry mechanisms for robustness');

  } catch (error) {
    console.error('❌ Test error:', error);
    
    if (error.name === 'TimeoutError') {
      console.log('\n⏱️  TIMEOUT DETECTED');
      console.log('This indicates network connectivity issues or server unresponsiveness');
    } else if (error.message.includes('fetch')) {
      console.log('\n🌐 NETWORK ERROR DETECTED');
      console.log('This indicates connectivity issues between services');
    }
  }
}

// Run the comprehensive test
testDispatcherApprovalFlow().then(() => {
  console.log('\n✅ Comprehensive test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal test error:', error);
  process.exit(1);
});
