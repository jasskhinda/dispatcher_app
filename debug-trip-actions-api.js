// Test script to debug trip actions API
const fetch = require('node-fetch');

async function testTripActions() {
  console.log('🧪 Testing trip actions API...');
  
  const testCases = [
    {
      name: 'Test Approve Action',
      action: 'approve',
      tripId: '3c8dc00f-f42d-4638-a1ce-430825e7d997' // Replace with actual trip ID
    },
    {
      name: 'Test Complete Action', 
      action: 'complete',
      tripId: '3c8dc00f-f42d-4638-a1ce-430825e7d997' // Replace with actual trip ID
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 ${testCase.name}`);
    
    try {
      const response = await fetch('https://dispatch.compassionatecaretransportation.com/api/trips/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: This won't work without proper authentication cookies
          // This is just to test the endpoint structure
        },
        body: JSON.stringify({
          tripId: testCase.tripId,
          action: testCase.action
        })
      });

      console.log(`Status: ${response.status}`);
      console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log(`Response:`, text);
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const json = JSON.parse(text);
          console.log(`Parsed JSON:`, json);
        } catch (e) {
          console.log('Could not parse as JSON');
        }
      }
      
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
}

testTripActions().catch(console.error);
