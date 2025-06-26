// Manual test script - run in browser console
// Copy and paste this entire script into your browser console at the individual trips page

console.log('🔍 Looking for trip IDs on the page...');

// Method 1: Look for trip IDs in the page text
const pageText = document.body.innerText;
const tripIdMatches = pageText.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g);

if (tripIdMatches && tripIdMatches.length > 0) {
    console.log('Found trip IDs:', tripIdMatches);
    
    // Use the first trip ID found
    const tripId = tripIdMatches[0];
    console.log('Testing with trip ID:', tripId);
    
    // Test 1: Try the original API
    console.log('🧪 Testing original API...');
    fetch('/api/trips/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, action: 'complete' })
    })
    .then(response => {
        console.log('Original API status:', response.status);
        return response.json();
    })
    .then(result => {
        console.log('Original API result:', result);
        
        if (result.error) {
            console.log('❌ Original API failed, trying simple API...');
            
            // Test 2: Try the simple API
            return fetch('/api/trips/simple-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tripId, action: 'complete' })
            });
        } else {
            console.log('✅ Original API worked!');
            return null;
        }
    })
    .then(response => {
        if (response) {
            console.log('Simple API status:', response.status);
            return response.json();
        }
        return null;
    })
    .then(result => {
        if (result) {
            console.log('Simple API result:', result);
            if (result.success) {
                console.log('✅ Simple API worked! Refreshing page...');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                console.log('❌ Both APIs failed');
            }
        }
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
    });
} else {
    console.log('❌ No trip IDs found on page');
    console.log('Available text sample:', pageText.substring(0, 500));
    
    // Alternative: Look for any buttons with onclick handlers
    const buttons = document.querySelectorAll('button');
    console.log('Found buttons:', buttons.length);
    
    buttons.forEach((button, index) => {
        if (button.innerText.includes('COMPLETE') || button.innerText.includes('APPROVE')) {
            console.log(`Button ${index}:`, button.innerText, button.onclick);
        }
    });
}