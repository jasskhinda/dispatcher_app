// Browser Console Diagnostic Script for Individual Trips Filtering
// Copy and paste this into the browser console on the individual trips page

console.log('🔍 INDIVIDUAL TRIPS FILTERING DIAGNOSTIC');
console.log('========================================');

// Function to test the filtering
async function diagnoseIndividualTripsFiltering() {
  try {
    console.log('\n1️⃣ Checking if Supabase client is available...');
    
    // Try to access the Supabase client from the page context
    if (typeof window !== 'undefined' && window.supabase) {
      console.log('✅ Using existing Supabase client');
      var supabase = window.supabase;
    } else {
      console.log('⚠️ No existing Supabase client found, please ensure you are on the individual trips page');
      return;
    }

    console.log('\n2️⃣ Testing individual trips query (current logic)...');
    
    // Test the exact query used in the page
    const { data: rawTripsData, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .is('facility_id', null)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (tripsError) {
      console.error('❌ Query error:', tripsError);
      return;
    }

    console.log(`✅ Raw query returned: ${rawTripsData?.length || 0} trips`);

    // Apply the additional filtering
    const filteredTrips = rawTripsData?.filter(trip => {
      const isIndividual = !trip.facility_id && trip.user_id;
      if (!isIndividual) {
        console.warn(`⚠️ Filtering out: ${trip.id} (facility_id: ${trip.facility_id}, user_id: ${trip.user_id})`);
      }
      return isIndividual;
    }) || [];

    console.log(`✅ After filtering: ${filteredTrips.length} confirmed individual trips`);

    console.log('\n3️⃣ Testing facility trips query for comparison...');
    const { data: facilityTrips, error: facilityError } = await supabase
      .from('trips')
      .select('*')
      .not('facility_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (facilityError) {
      console.error('❌ Facility query error:', facilityError);
    } else {
      console.log(`✅ Facility trips found: ${facilityTrips?.length || 0}`);
    }

    console.log('\n4️⃣ Checking for data inconsistencies...');
    const { data: bothFields, error: bothError } = await supabase
      .from('trips')
      .select('*')
      .not('facility_id', 'is', null)
      .not('user_id', 'is', null)
      .limit(10);

    if (bothError) {
      console.error('❌ Inconsistency check error:', bothError);
    } else {
      if (bothFields?.length > 0) {
        console.warn(`⚠️ Found ${bothFields.length} trips with BOTH facility_id AND user_id!`);
        console.log('This could cause trips to appear in wrong categories.');
        bothFields.forEach((trip, i) => {
          console.log(`   ${i + 1}. Trip ${trip.id}: facility=${trip.facility_id}, user=${trip.user_id}`);
        });
      } else {
        console.log('✅ No data inconsistencies found');
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`Individual trips (should show): ${filteredTrips.length}`);
    console.log(`Facility trips (should be hidden): ${facilityTrips?.length || 0}`);
    console.log(`Data inconsistencies: ${bothFields?.length || 0}`);

    if (filteredTrips.length === 0) {
      console.log('\n⚠️ NO INDIVIDUAL TRIPS FOUND!');
      console.log('Possible reasons:');
      console.log('1. All trips in database are facility trips');
      console.log('2. No trips exist with user_id but null facility_id');
      console.log('3. BookingCCT app is not creating trips correctly');
    }

    return {
      individual: filteredTrips.length,
      facility: facilityTrips?.length || 0,
      inconsistent: bothFields?.length || 0
    };

  } catch (error) {
    console.error('💥 Diagnostic failed:', error);
  }
}

// Auto-run the diagnostic
diagnoseIndividualTripsFiltering();
