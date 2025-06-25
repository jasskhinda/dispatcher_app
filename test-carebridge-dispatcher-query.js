/**
 * CAREBRIDGE LIVING DISPATCHER DIAGNOSTIC
 * This script will test the exact dispatcher query for CareBridge Living facility
 */

// Test the exact dispatcher query that should show CareBridge Living
async function testDispatcherQuery() {
    console.log('🔍 TESTING EXACT DISPATCHER QUERY FOR CAREBRIDGE LIVING');
    console.log('=======================================================');
    
    const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
    
    const { createClient } = supabase;
    const client = createClient(supabaseUrl, supabaseKey);
    
    try {
        console.log('1️⃣ Testing the EXACT dispatcher query...');
        
        // This is the EXACT query from WorkingDashboard.js line 60-65
        const { data: tripsData, error: tripsError } = await client
            .from('trips')
            .select(`
                *,
                user_profile:profiles(first_name, last_name, phone_number),
                facility:facilities(id, name, contact_email, phone_number)
            `)
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (tripsError) {
            console.error('❌ DISPATCHER QUERY FAILED:', tripsError);
            console.log('   This is why facility names are not showing!');
            return;
        }
        
        console.log(`✅ Dispatcher query succeeded! Found ${tripsData.length} trips`);
        
        // Find CareBridge Living trips
        const carebridgeTrips = tripsData.filter(trip => 
            trip.facility_id && trip.facility_id.toString().startsWith('e1b94bde')
        );
        
        console.log('');
        console.log('2️⃣ Looking for CareBridge Living trips...');
        console.log(`Found ${carebridgeTrips.length} trips with facility ID starting with e1b94bde`);
        
        carebridgeTrips.forEach((trip, index) => {
            console.log(`');
            console.log(`Trip ${index + 1}:`);
            console.log(`   ID: ${trip.id.slice(0, 8)}`);
            console.log(`   Facility ID: ${trip.facility_id}`);
            console.log(`   Pickup: ${trip.pickup_address?.slice(0, 50)}...`);
            console.log(`   Status: ${trip.status}`);
            console.log(`   Facility Data:`, trip.facility);
            
            // Test the exact display logic from dispatcher
            if (trip.facility) {
                if (trip.facility.name) {
                    console.log(`   ✅ SHOULD DISPLAY: "🏥 ${trip.facility.name}"`);
                } else if (trip.facility.contact_email) {
                    console.log(`   ⚠️ WOULD DISPLAY: "🏥 ${trip.facility.contact_email}"`);
                } else {
                    console.log(`   ❌ WOULD DISPLAY: "🏥 Facility ${trip.facility_id.slice(0, 8)}"`);
                }
            } else {
                console.log(`   ❌ NO FACILITY DATA - WOULD DISPLAY: "🏥 Facility ${trip.facility_id.slice(0, 8)}"`);
            }
        });
        
        console.log('');
        console.log('3️⃣ Testing all trips for facility data...');
        
        const facilityTrips = tripsData.filter(trip => trip.facility_id);
        console.log(`Found ${facilityTrips.length} total facility trips`);
        
        facilityTrips.forEach((trip, index) => {
            if (index < 3) { // Show first 3 for debugging
                console.log(`Facility Trip ${index + 1}:`);
                console.log(`   Facility ID: ${trip.facility_id.slice(0, 8)}`);
                console.log(`   Has facility data: ${!!trip.facility}`);
                if (trip.facility) {
                    console.log(`   Facility name: "${trip.facility.name || 'NULL'}"`);
                }
            }
        });
        
        console.log('');
        console.log('🎯 DIAGNOSIS:');
        
        if (carebridgeTrips.length === 0) {
            console.log('❌ NO CAREBRIDGE TRIPS FOUND');
            console.log('   Either no trips exist or facility_id is different');
        } else if (carebridgeTrips[0].facility?.name === 'CareBridge Living') {
            console.log('✅ CAREBRIDGE LIVING NAME IS CORRECT IN QUERY');
            console.log('❌ PROBLEM: Frontend display logic or caching issue');
        } else if (carebridgeTrips[0].facility) {
            console.log('⚠️ FACILITY DATA EXISTS BUT NAME IS WRONG');
            console.log(`   Current name: "${carebridgeTrips[0].facility.name || 'NULL'}"`);
            console.log('   Expected: "CareBridge Living"');
        } else {
            console.log('❌ NO FACILITY DATA IN JOIN RESULT');
            console.log('   JOIN is failing - check foreign key relationship');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testDispatcherQuery();
