// Test script for browser console
// Run this at https://dispatch.compassionatecaretransportation.com/trips/individual

async function testSimpleActions() {
  console.log('🧪 Testing simple actions API...');
  
  // Get a trip ID from the page
  const tripElements = document.querySelectorAll('[data-trip-id]');
  if (tripElements.length === 0) {
    console.error('❌ No trip elements found with data-trip-id attribute');
    return;
  }
  
  const tripId = tripElements[0].getAttribute('data-trip-id');
  console.log('📋 Using trip ID:', tripId);
  
  try {
    const response = await fetch('/api/trips/simple-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: tripId,
        action: 'complete'
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    const result = await response.json();
    console.log('📋 Response:', result);
    
    if (response.ok) {
      console.log('✅ Simple API works! Trip action successful.');
    } else {
      console.error('❌ Simple API failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run the test
testSimpleActions();