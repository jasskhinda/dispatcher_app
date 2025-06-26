// Simple test to verify the individual trips filtering is working
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dqabrmgzgzaebuzqhhtz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxYWJybWd6Z3phZWJ1enFoaHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4ODg4MDEsImV4cCI6MjA1MDQ2NDgwMX0.0q9ZMqsIgPhtJfYnhxcpN4TyE0AkrGQWP3Q9jCmLPIs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testIndividualTripsFiltering() {
  console.log('🔍 TESTING INDIVIDUAL TRIPS FILTERING');
  console.log('====================================\n');

  try {
    // 1. Test the exact query used in the individual trips page
    console.log('1️⃣ Testing current individual trips query...');
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

    console.log(`✅ Raw query returned ${rawTripsData?.length || 0} trips`);

    // 2. Apply the additional filtering
    const tripsData = rawTripsData?.filter(trip => {
      const isIndividualTrip = !trip.facility_id && trip.user_id;
      if (!isIndividualTrip) {
        console.warn(`⚠️ Filtering out non-individual trip: ${trip.id} (facility_id: ${trip.facility_id}, user_id: ${trip.user_id})`);
      }
      return isIndividualTrip;
    }) || [];

    console.log(`✅ After filtering: ${tripsData.length} confirmed individual trips`);

    // 3. Show a few examples
    if (tripsData.length > 0) {
      console.log('\n📋 Sample individual trips:');
      tripsData.slice(0, 5).forEach((trip, index) => {
        console.log(`   ${index + 1}. Trip ${trip.id.substring(0, 8)}...`);
        console.log(`      User ID: ${trip.user_id?.substring(0, 8)}...`);
        console.log(`      Facility ID: ${trip.facility_id || 'NULL'}`);
        console.log(`      Status: ${trip.status}`);
        console.log(`      Created: ${trip.created_at}`);
        console.log(`      Pickup: ${trip.pickup_address}`);
        console.log('');
      });
    }

    // 4. Test facility trips query for comparison
    console.log('2️⃣ Testing facility trips for comparison...');
    const { data: facilityTrips, error: facilityError } = await supabase
      .from('trips')
      .select('*')
      .not('facility_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (facilityError) {
      console.error('❌ Facility query error:', facilityError);
    } else {
      console.log(`✅ Found ${facilityTrips?.length || 0} facility trips`);
      
      if (facilityTrips && facilityTrips.length > 0) {
        console.log('\n📋 Sample facility trips:');
        facilityTrips.slice(0, 3).forEach((trip, index) => {
          console.log(`   ${index + 1}. Trip ${trip.id.substring(0, 8)}...`);
          console.log(`      User ID: ${trip.user_id?.substring(0, 8) || 'NULL'}...`);
          console.log(`      Facility ID: ${trip.facility_id?.substring(0, 8)}...`);
          console.log(`      Status: ${trip.status}`);
          console.log('');
        });
      }
    }

    // 5. Check for data inconsistencies
    console.log('3️⃣ Checking for data inconsistencies...');
    const { data: bothFieldsTrips, error: bothError } = await supabase
      .from('trips')
      .select('*')
      .not('facility_id', 'is', null)
      .not('user_id', 'is', null)
      .limit(10);

    if (bothError) {
      console.error('❌ Inconsistency check error:', bothError);
    } else {
      if (bothFieldsTrips && bothFieldsTrips.length > 0) {
        console.log(`⚠️ Found ${bothFieldsTrips.length} trips with BOTH facility_id AND user_id set:`);
        bothFieldsTrips.forEach((trip, index) => {
          console.log(`   ${index + 1}. Trip ${trip.id.substring(0, 8)}... (facility: ${trip.facility_id?.substring(0, 8)}..., user: ${trip.user_id?.substring(0, 8)}...)`);
        });
        console.log('   This indicates data inconsistency that needs to be resolved.');
      } else {
        console.log('✅ No trips found with both facility_id and user_id set');
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`Individual trips (BookingCCT): ${tripsData.length}`);
    console.log(`Facility trips: ${facilityTrips?.length || 0}`);
    console.log(`Data inconsistencies: ${bothFieldsTrips?.length || 0}`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testIndividualTripsFiltering();
