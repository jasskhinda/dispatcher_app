// Simple API endpoint test
// Add this to your browser console while on the dispatcher app

async function testAPIEndpoints() {
    console.log('🧪 Testing Dispatcher API Endpoints');
    console.log('===================================');
    
    // Test 1: Check if endpoints exist
    try {
        console.log('\n1. Testing /api/trips/actions endpoint...');
        const response = await fetch('/api/trips/actions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Invalid data to test endpoint existence
                test: 'data'
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.status === 400) {
            console.log('✅ Endpoint exists (400 = bad request expected)');
        } else if (response.status === 401) {
            console.log('⚠️ Authentication required');
        } else if (response.status === 404) {
            console.log('❌ Endpoint not found');
        } else {
            console.log('ℹ️ Unexpected status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Network error:', error);
    }
    
    // Test 2: Check auth session
    try {
        console.log('\n2. Testing authentication...');
        const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
        const supabase = createClientComponentClient();
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Auth error:', error);
        } else if (session) {
            console.log('✅ Authenticated as:', session.user.email);
            
            // Test profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
                
            if (profileError) {
                console.error('❌ Profile error:', profileError);
            } else {
                console.log('✅ User role:', profile.role);
            }
        } else {
            console.log('❌ No session found');
        }
        
    } catch (error) {
        console.error('❌ Auth test error:', error);
    }
    
    // Test 3: Try with a real trip (you need to get a trip ID first)
    console.log('\n3. To test with real trip data:');
    console.log('   - Get a trip ID from the trips table');
    console.log('   - Run: testWithRealTrip("YOUR_TRIP_ID")');
}

// Function to test with real trip data
async function testWithRealTrip(tripId) {
    if (!tripId) {
        console.error('Please provide a trip ID');
        return;
    }
    
    console.log(`\n🧪 Testing with real trip: ${tripId}`);
    
    try {
        const response = await fetch('/api/trips/actions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tripId: tripId,
                action: 'approve'
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.ok) {
            console.log('✅ API call successful');
        } else {
            console.log('❌ API call failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Run the test
testAPIEndpoints();

// Instructions
console.log('\n📋 INSTRUCTIONS:');
console.log('1. Open browser console on the dispatcher app');
console.log('2. Paste this entire script and run it');
console.log('3. Check the results for authentication and endpoint issues');
console.log('4. If basic tests pass, get a real trip ID and test with testWithRealTrip("trip_id")');
