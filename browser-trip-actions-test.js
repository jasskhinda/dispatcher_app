/**
 * Browser Console Test for Trip Actions API
 * 
 * Instructions:
 * 1. Open the dispatcher app in your browser and log in
 * 2. Navigate to the individual trips page
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire script
 * 5. Run: testTripActions('your-trip-id-here')
 */

async function testTripActions(tripId, action = 'approve') {
  console.log(`🧪 Testing ${action} action for trip:`, tripId);
  
  if (!tripId) {
    console.error('❌ Please provide a trip ID');
    return;
  }

  try {
    const response = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: tripId,
        action: action,
        reason: action === 'reject' ? 'Test rejection from browser console' : undefined
      })
    });

    const result = await response.json();
    
    console.log(`📊 ${action.toUpperCase()} Response:`, {
      status: response.status,
      success: result.success,
      message: result.message,
      payment: result.payment,
      trip: result.trip ? {
        id: result.trip.id,
        status: result.trip.status,
        payment_status: result.trip.payment_status
      } : null,
      error: result.error
    });

    if (result.success) {
      console.log(`✅ ${action} successful!`);
    } else {
      console.log(`❌ ${action} failed:`, result.error);
    }

    return result;
  } catch (error) {
    console.error(`❌ Network error during ${action}:`, error);
    return null;
  }
}

// Helper function to test both approve and reject
async function testBothActions(tripId) {
  console.log('🔄 Testing both approve and reject actions...\n');
  
  // Test approve first
  await testTripActions(tripId, 'approve');
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Wait a moment then test reject
  setTimeout(async () => {
    await testTripActions(tripId, 'reject');
  }, 2000);
}

// Helper to get trip IDs from the current page
function getCurrentPageTripIds() {
  const tripRows = document.querySelectorAll('[data-trip-id]');
  const tripIds = Array.from(tripRows).map(row => row.getAttribute('data-trip-id'));
  console.log('🔍 Found trip IDs on current page:', tripIds);
  return tripIds;
}

// Helper to test authentication
async function testAuth() {
  console.log('🔐 Testing authentication...');
  
  try {
    const response = await fetch('/api/trips/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: 'test-id',
        action: 'approve'
      })
    });

    const result = await response.json();
    
    if (response.status === 401) {
      console.log('❌ Authentication failed - please make sure you are logged in');
    } else if (response.status === 403) {
      console.log('❌ Access denied - dispatcher role required');
    } else if (response.status === 400 && result.error?.includes('Trip not found')) {
      console.log('✅ Authentication successful (test trip not found as expected)');
    } else {
      console.log('📊 Auth test response:', { status: response.status, result });
    }
    
    return response.status;
  } catch (error) {
    console.error('❌ Auth test error:', error);
    return null;
  }
}

console.log(`
🚀 Trip Actions API Browser Test Loaded!

Available functions:
- testTripActions(tripId, action) - Test specific action ('approve' or 'reject')
- testBothActions(tripId) - Test both approve and reject
- getCurrentPageTripIds() - Get trip IDs from current page
- testAuth() - Test if you're properly authenticated

Example usage:
  testAuth()
  testTripActions('trip-id-here', 'approve')
  testTripActions('trip-id-here', 'reject')
  
  // Or get trip IDs from page and test
  const tripIds = getCurrentPageTripIds()
  testTripActions(tripIds[0], 'approve')
`);
