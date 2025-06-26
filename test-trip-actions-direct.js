// Direct test of trip actions API
// Run this in browser console at https://dispatch.compassionatecaretransportation.com/trips/individual

async function testTripActionsAPI() {
  console.log('🧪 Testing trip actions API directly...');
  
  try {
    // First test the test endpoint
    console.log('Testing /api/test-actions...');
    const testResponse = await fetch('/api/test-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    });
    
    const testResult = await testResponse.json();
    console.log('✅ Test endpoint result:', testResult);
    
    // Now test with a real trip ID (replace with actual trip ID from the page)
    const tripId = 'replace-with-real-trip-id'; // You need to replace this
    
    console.log(`Testing /api/trips/actions with trip ID: ${tripId}...`);
    const actionResponse = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: tripId,
        action: 'complete'
      })
    });
    
    console.log('Response status:', actionResponse.status);
    console.log('Response headers:', Object.fromEntries(actionResponse.headers.entries()));
    
    const actionResult = await actionResponse.json();
    console.log('Action result:', actionResult);
    
    if (!actionResponse.ok) {
      console.error('❌ API returned error:', actionResult);
    } else {
      console.log('✅ API call successful:', actionResult);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTripActionsAPI();