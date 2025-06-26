// Test script to diagnose the trip approval issue
const fetch = require('node-fetch');

console.log('🔍 DIAGNOSING TRIP APPROVAL ISSUE');
console.log('=================================');

async function testIssue() {
  try {
    // Test the payment API endpoint directly
    console.log('\n1️⃣ Testing BookingCCT Payment API...');
    
    const testUrl = 'https://booking.compassionatecaretransportation.com/api/stripe/charge-payment';
    console.log('Testing URL:', testUrl);
    
    try {
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId: 'test-trip-id' }),
        timeout: 5000 // 5 second timeout
      });
      
      console.log('Payment API Status:', response.status);
      const result = await response.text();
      console.log('Payment API Response:', result.substring(0, 200));
      
      if (response.status >= 500) {
        console.log('❌ Payment API has internal server error');
        console.log('💡 This could be causing dispatcher approval failures');
      } else if (response.status === 400) {
        console.log('✅ Payment API is responding (400 is expected for test data)');
      } else {
        console.log(`ℹ️ Payment API response: ${response.status}`);
      }
      
    } catch (paymentError) {
      console.log('❌ Payment API Error:', paymentError.message);
      console.log('💡 This network/timeout error is likely causing the issue!');
      
      if (paymentError.message.includes('timeout')) {
        console.log('💡 SOLUTION: The payment API is timing out');
        console.log('   - Increase timeout in dispatcher API route');
        console.log('   - Add better error handling for timeouts');
        console.log('   - Implement fallback approval without payment');
      }
    }

    // Test the dispatcher API endpoint
    console.log('\n2️⃣ Testing Dispatcher Actions API (local)...');
    
    try {
      const dispatcherResponse = await fetch('http://localhost:3000/api/trips/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: 'test-trip-id',
          action: 'approve'
        }),
        timeout: 5000
      });
      
      console.log('Dispatcher API Status:', dispatcherResponse.status);
      const dispatcherResult = await dispatcherResponse.text();
      console.log('Dispatcher API Response:', dispatcherResult.substring(0, 200));
      
    } catch (dispatcherError) {
      console.log('❌ Dispatcher API Error:', dispatcherError.message);
      
      if (dispatcherError.message.includes('ECONNREFUSED')) {
        console.log('💡 Dispatcher app is not running locally');
        console.log('   Start the app with: npm run dev');
      }
    }

    console.log('\n🔧 RECOMMENDED SOLUTIONS:');
    console.log('1. Check if BookingCCT payment API is accessible');
    console.log('2. Increase timeout values in trip actions route');
    console.log('3. Add fallback approval mechanism');
    console.log('4. Improve error handling and user feedback');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testIssue();
