// Test script for dispatcher API actions
console.log('🧪 Testing Dispatcher API Actions');

// Test data
const testTripId = '12345-test'; // This should be replaced with a real trip ID
const baseUrl = 'https://dispatch.compassionatecaretransportation.com'; // Production URL

async function testApproveAction() {
    try {
        console.log('\n🔍 Testing APPROVE action...');
        
        const response = await fetch(`${baseUrl}/api/trips/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tripId: testTripId,
                action: 'approve'
            })
        });

        const result = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.ok) {
            console.log('✅ APPROVE action successful');
        } else {
            console.log('❌ APPROVE action failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ APPROVE action error:', error.message);
    }
}

async function testRejectAction() {
    try {
        console.log('\n🔍 Testing REJECT action...');
        
        const response = await fetch(`${baseUrl}/api/trips/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tripId: testTripId,
                action: 'reject',
                reason: 'Test rejection'
            })
        });

        const result = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.ok) {
            console.log('✅ REJECT action successful');
        } else {
            console.log('❌ REJECT action failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ REJECT action error:', error.message);
    }
}

// Instructions for manual testing
console.log('\n📋 MANUAL TESTING INSTRUCTIONS:');
console.log('1. Replace testTripId with a real trip ID from your database');
console.log('2. Make sure you are logged in as a dispatcher');
console.log('3. Run this script from browser console on the dispatcher app');
console.log('4. Check the network tab for detailed error messages');

console.log('\n🌐 Testing URLs:');
console.log('- Actions API:', `${baseUrl}/api/trips/actions`);
console.log('- Reminder API:', `${baseUrl}/api/trips/send-reminder`);

console.log('\n🔧 TROUBLESHOOTING:');
console.log('- Check if BOOKING_APP_URL is set correctly in environment');
console.log('- Verify user has dispatcher role in profiles table');
console.log('- Check Supabase authentication and permissions');
console.log('- Look for CORS issues in network tab');

// Uncomment to run tests (after setting a real trip ID)
// testApproveAction();
// testRejectAction();
