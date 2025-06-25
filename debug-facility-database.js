// Debug script to check facility database and find the correct facility ID
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (using environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFacilityDatabase() {
    console.log('🔍 DEBUGGING FACILITY DATABASE');
    console.log('==============================');
    
    const targetFacilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    try {
        // 1. Check all facilities in database
        console.log('\n1. Fetching all facilities...');
        const { data: allFacilities, error: allError } = await supabase
            .from('facilities')
            .select('id, name, created_at')
            .limit(20);
        
        if (allError) {
            console.error('❌ Error fetching facilities:', allError);
            return;
        }
        
        console.log(`📊 Found ${allFacilities.length} facilities:`);
        allFacilities.forEach((facility, index) => {
            console.log(`   ${index + 1}. ${facility.name} (ID: ${facility.id})`);
        });
        
        // 2. Check if target facility exists
        console.log(`\n2. Searching for target facility ID: ${targetFacilityId}`);
        const { data: targetFacility, error: targetError } = await supabase
            .from('facilities')
            .select('*')
            .eq('id', targetFacilityId)
            .single();
        
        if (targetError || !targetFacility) {
            console.log('❌ Target facility NOT FOUND');
            console.log('Error:', targetError);
        } else {
            console.log('✅ Target facility FOUND:', targetFacility);
        }
        
        // 3. Check for facilities with similar IDs
        console.log('\n3. Searching for facilities with similar IDs...');
        const similarFacilities = allFacilities.filter(f => 
            f.id.includes('e1b94bde') || 
            f.id.includes('d092') || 
            f.id.includes('4ce6')
        );
        
        if (similarFacilities.length > 0) {
            console.log(`🎯 Found ${similarFacilities.length} facilities with similar IDs:`);
            similarFacilities.forEach(facility => {
                console.log(`   - ${facility.name} (ID: ${facility.id})`);
            });
        } else {
            console.log('❌ No facilities found with similar IDs');
        }
        
        // 4. Check trips table for this facility_id
        console.log('\n4. Checking trips table for this facility ID...');
        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('id, pickup_time, status, facility_id')
            .eq('facility_id', targetFacilityId)
            .limit(10);
        
        if (tripsError) {
            console.error('❌ Error fetching trips:', tripsError);
        } else {
            console.log(`📊 Found ${trips.length} trips with this facility_id:`);
            trips.forEach(trip => {
                console.log(`   - Trip ${trip.id}: ${trip.pickup_time} (${trip.status})`);
            });
        }
        
        // 5. Check for any trips with facility_id containing part of our target
        console.log('\n5. Checking for trips with similar facility_ids...');
        const { data: similarTrips, error: similarTripsError } = await supabase
            .from('trips')
            .select('id, pickup_time, status, facility_id')
            .not('facility_id', 'is', null)
            .limit(50);
        
        if (!similarTripsError && similarTrips) {
            const matchingTrips = similarTrips.filter(trip => 
                trip.facility_id && (
                    trip.facility_id.includes('e1b94bde') ||
                    trip.facility_id === targetFacilityId
                )
            );
            
            console.log(`🎯 Found ${matchingTrips.length} trips with matching facility_ids:`);
            matchingTrips.forEach(trip => {
                console.log(`   - Trip ${trip.id}: facility_id = ${trip.facility_id}`);
            });
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

// Run the debug function
debugFacilityDatabase();
