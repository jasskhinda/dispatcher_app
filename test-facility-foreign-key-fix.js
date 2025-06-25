// Test script to verify the facility foreign key relationship fix
// Run in browser console at dispatcher app dashboard

async function testForeignKeyFix() {
  if (!window.supabase) {
    console.error('❌ Supabase not available. Make sure you\'re on the dispatcher app dashboard.');
    return;
  }

  console.log('🧪 Testing Foreign Key Relationship Fix...\n');

  try {
    // Test 1: Try the old broken query syntax to confirm it fails
    console.log('1️⃣ Testing old broken query syntax...');
    const { data: brokenData, error: brokenError } = await window.supabase
      .from('trips')
      .select(`
        *,
        user_profile:profiles!trips_user_id_fkey(first_name, last_name, phone_number)
      `)
      .limit(1);

    if (brokenError) {
      console.log('✅ Expected: Old syntax fails with error:', brokenError.message);
    } else {
      console.log('⚠️ Unexpected: Old syntax worked, data:', brokenData);
    }

    // Test 2: Try the new corrected query syntax
    console.log('\n2️⃣ Testing new corrected query syntax...');
    const { data: fixedData, error: fixedError } = await window.supabase
      .from('trips')
      .select(`
        *,
        user_profile:profiles(first_name, last_name, phone_number),
        facility:facilities(id, name, contact_email, phone_number)
      `)
      .order('created_at', { ascending: false })
      .limit(3);

    if (fixedError) {
      console.error('❌ New syntax failed:', fixedError.message);
    } else {
      console.log('✅ New syntax works! Sample trips:');
      fixedData.forEach((trip, index) => {
        const clientInfo = trip.user_profile 
          ? `${trip.user_profile.first_name} ${trip.user_profile.last_name}`
          : trip.managed_client_id ? `Managed Client ${trip.managed_client_id.substring(0, 8)}` : 'No client';
        
        const facilityInfo = trip.facility 
          ? `${trip.facility.name}` 
          : trip.facility_id ? `Facility ${trip.facility_id.substring(0, 8)}` : 'No facility';
        
        console.log(`  ${index + 1}. Trip ${trip.id.substring(0, 8)}: ${clientInfo} → ${facilityInfo}`);
      });

      // Test 3: Check for facility data specifically
      console.log('\n3️⃣ Checking facility data availability...');
      const tripsWithFacilities = fixedData.filter(trip => trip.facility);
      console.log(`📊 Trips with facility data: ${tripsWithFacilities.length}/${fixedData.length}`);
      
      if (tripsWithFacilities.length > 0) {
        console.log('🏥 Sample facility data:', tripsWithFacilities[0].facility);
        
        // Check if we're getting actual facility names
        const facilitiesWithNames = tripsWithFacilities.filter(trip => 
          trip.facility && trip.facility.name && trip.facility.name !== trip.facility.id
        );
        console.log(`📋 Facilities with actual names: ${facilitiesWithNames.length}/${tripsWithFacilities.length}`);
        
        if (facilitiesWithNames.length > 0) {
          console.log('🎉 SUCCESS: Facility names are being loaded!');
          facilitiesWithNames.forEach(trip => {
            console.log(`   - ${trip.facility.name} (ID: ${trip.facility.id.substring(0, 8)})`);
          });
        }
      }
    }

    console.log('\n🔍 FINAL TEST: Check specific facility "FacilityGroupB"...');
    
    // Test 4: Look for the specific facility we know exists
    const { data: facilityData, error: facilityError } = await window.supabase
      .from('facilities')
      .select('*')
      .eq('name', 'FacilityGroupB');

    if (facilityError) {
      console.error('❌ Error fetching facility:', facilityError.message);
    } else if (facilityData && facilityData.length > 0) {
      console.log('✅ Found FacilityGroupB:', facilityData[0]);
      
      // Now check if any trips are associated with this facility
      const { data: tripData, error: tripError } = await window.supabase
        .from('trips')
        .select(`
          *,
          facility:facilities(name)
        `)
        .eq('facility_id', facilityData[0].id)
        .limit(5);

      if (tripError) {
        console.error('❌ Error fetching trips for facility:', tripError.message);
      } else {
        console.log(`✅ Found ${tripData.length} trips for FacilityGroupB`);
        if (tripData.length > 0) {
          console.log('🎯 Sample trip with facility name:', {
            trip_id: tripData[0].id.substring(0, 8),
            facility_name: tripData[0].facility?.name,
            pickup: tripData[0].pickup_address?.substring(0, 50) + '...'
          });
        }
      }
    } else {
      console.log('⚠️ FacilityGroupB not found in database');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

console.log('🚀 Run testForeignKeyFix() to test the facility foreign key relationship fix');
window.testForeignKeyFix = testForeignKeyFix;
