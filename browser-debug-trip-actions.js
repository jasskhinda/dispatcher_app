// Simple debug script to test the trip actions directly
// Run this in the browser console on the dispatcher app individual trips page

console.log('🧪 Starting trip actions debug...');

// Function to test trip actions with better error handling
async function debugTripAction(tripId, action) {
  console.log(`🔍 Testing ${action} action for trip: ${tripId}`);
  
  try {
    const response = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: tripId,
        action: action,
        reason: action === 'reject' ? 'Debug test rejection' : undefined
      }),
    });

    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const contentType = response.headers.get('content-type');
    console.log(`📡 Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log(`📄 JSON Response:`, result);
      
      if (!response.ok) {
        console.error(`❌ API Error (${response.status}):`, result);
      } else {
        console.log(`✅ Success:`, result);
      }
    } else {
      const text = await response.text();
      console.log(`📄 Text Response:`, text);
      console.error(`❌ Expected JSON but got: ${contentType}`);
    }
    
  } catch (error) {
    console.error(`❌ Network/Fetch Error:`, error);
    console.error(`❌ Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

// Test functions you can call manually
window.debugApprove = function(tripId) {
  return debugTripAction(tripId, 'approve');
};

window.debugComplete = function(tripId) {
  return debugTripAction(tripId, 'complete');
};

window.debugReject = function(tripId) {
  return debugTripAction(tripId, 'reject');
};

console.log('🎯 Debug functions ready! Use:');
console.log('debugApprove("your-trip-id")');
console.log('debugComplete("your-trip-id")');
console.log('debugReject("your-trip-id")');

// Auto-test with a trip ID if one is provided
// You can replace this with an actual trip ID from the page
const testTripId = '3c8dc00f-f42d-4638-a1ce-430825e7d997';
console.log(`🚀 Auto-testing with trip ID: ${testTripId}`);

// Test approve first
debugTripAction(testTripId, 'approve');
