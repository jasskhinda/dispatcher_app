// Test script to verify invoice page functionality
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testInvoicePage() {
    try {
        console.log('🧪 Testing Invoice Page Functionality');
        console.log('=====================================');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        // 1. Get a list of available trips
        console.log('\n1️⃣ Fetching available trips...');
        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('id, passenger_name, pickup_address, status, created_at, facility_id, user_id, managed_client_id')
            .order('created_at', { ascending: false })
            .limit(5);

        if (tripsError) {
            console.error('❌ Error fetching trips:', tripsError);
            return;
        }

        console.log(`✅ Found ${trips.length} trips:`);
        trips.forEach((trip, i) => {
            console.log(`   ${i+1}. ${trip.id.slice(0, 8)} - ${trip.passenger_name} - ${trip.status}`);
            console.log(`      Facility ID: ${trip.facility_id || 'None'}`);
            console.log(`      User ID: ${trip.user_id || 'None'}`);
            console.log(`      Managed Client ID: ${trip.managed_client_id || 'None'}`);
        });

        // 2. Test with the first available trip
        if (trips.length > 0) {
            const testTripId = trips[0].id;
            console.log(`\n2️⃣ Testing invoice page data for trip: ${testTripId}`);

            // Simulate the invoice page data fetching logic
            const { data: basicTrip, error: basicError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', testTripId)
                .single();

            if (basicError) {
                console.error('❌ Basic trip query failed:', basicError);
                return;
            }

            console.log('✅ Basic trip data loaded');
            let enhancedTrip = { ...basicTrip };

            // Try to fetch user profile if user_id exists
            if (basicTrip.user_id) {
                try {
                    const { data: userProfile } = await supabase
                        .from('profiles')
                        .select('first_name, last_name, phone_number, email')
                        .eq('id', basicTrip.user_id)
                        .single();
                    
                    if (userProfile) {
                        enhancedTrip.user_profile = userProfile;
                        console.log('✅ User profile loaded');
                    }
                } catch (err) {
                    console.log('⚠️ Could not load user profile:', err.message);
                }
            }

            // Try to fetch facility if facility_id exists
            if (basicTrip.facility_id) {
                try {
                    const { data: facility } = await supabase
                        .from('facilities')
                        .select('id, name, contact_email, phone_number, address')
                        .eq('id', basicTrip.facility_id)
                        .single();
                    
                    if (facility) {
                        enhancedTrip.facility = facility;
                        console.log('✅ Facility data loaded');
                    }
                } catch (err) {
                    console.log('⚠️ Could not load facility:', err.message);
                }
            }

            // Try to fetch managed client if managed_client_id exists
            if (basicTrip.managed_client_id) {
                try {
                    const { data: managedClient } = await supabase
                        .from('facility_managed_clients')
                        .select('first_name, last_name, phone_number, email')
                        .eq('id', basicTrip.managed_client_id)
                        .single();
                    
                    if (managedClient) {
                        enhancedTrip.managed_client = managedClient;
                        console.log('✅ Managed client data loaded');
                    }
                } catch (err) {
                    console.log('⚠️ Could not load managed client:', err.message);
                }
            }

            console.log('\n3️⃣ Invoice page should work with this trip ID:');
            console.log(`   Trip ID: ${testTripId}`);
            console.log(`   Invoice URL: http://localhost:3015/invoice/${testTripId}`);
            console.log(`   Passenger: ${enhancedTrip.passenger_name}`);
            console.log(`   Status: ${enhancedTrip.status}`);
            console.log(`   Has user profile: ${!!enhancedTrip.user_profile}`);
            console.log(`   Has facility: ${!!enhancedTrip.facility}`);
            console.log(`   Has managed client: ${!!enhancedTrip.managed_client}`);

            // 4. Test the problematic trip ID
            console.log(`\n4️⃣ Testing the problematic trip ID: 7162903d-1251-43c2-9e65-c7ff6cdedfc2`);
            const { data: problemTrip, error: problemError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', '7162903d-1251-43c2-9e65-c7ff6cdedfc2')
                .single();

            if (problemError) {
                console.log('❌ Problematic trip not found:', problemError.message);
                console.log('   This explains why the invoice page shows "Trip Not Found"');
            } else {
                console.log('✅ Problematic trip found:', problemTrip.passenger_name);
            }

        } else {
            console.log('❌ No trips found in database');
        }

        console.log('\n✅ Invoice page test complete!');

    } catch (err) {
        console.error('❌ Test failed:', err.message);
    }
}

testInvoicePage();
