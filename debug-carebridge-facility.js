/**
 * Database Verification Script for Facility Name Display Issue
 * 
 * This script will check:
 * 1. The facility record with "CareBridge Living"
 * 2. The trips associated with this facility
 * 3. The JOIN relationship between trips and facilities
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFacilityNameIssue() {
  console.log('🔍 DEBUGGING FACILITY NAME DISPLAY ISSUE');
  console.log('=======================================');
  console.log('Expected: "🏥 CareBridge Living"');
  console.log('Actual: "🏥 Facility e1b94bde"');
  console.log('');
  
  console.log('1️⃣ Checking facilities table...');
  
  // Get all facilities to find the one with "CareBridge Living"
  const { data: facilities, error: facilitiesError } = await supabase
    .from('facilities')
    .select('*');
    
  if (facilitiesError) {
    console.error('❌ Error fetching facilities:', facilitiesError);
    return;
  }
  
  console.log(`Found ${facilities.length} facilities:`);
  facilities.forEach(facility => {
    console.log(`   - ${facility.name} (ID: ${facility.id})`);
    if (facility.name === 'CareBridge Living') {
      console.log('     ⭐ THIS IS THE TARGET FACILITY');
    }
  });
  
  const carebridge = facilities.find(f => f.name === 'CareBridge Living');
  
  if (!carebridge) {
    console.log('');
    console.log('❌ PROBLEM: No facility found with name "CareBridge Living"');
    console.log('   This means the facility name in settings is not saved correctly');
    return;
  }
  
  console.log('');
  console.log('2️⃣ Found CareBridge Living facility:');
  console.log('   ID:', carebridge.id);
  console.log('   Name:', carebridge.name);
  console.log('   Contact Email:', carebridge.contact_email);
  console.log('   Phone:', carebridge.phone_number);
  
  console.log('');
  console.log('3️⃣ Checking trips for this facility...');
  
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, facility_id, pickup_address, status')
    .eq('facility_id', carebridge.id);
    
  if (tripsError) {
    console.error('❌ Error fetching trips:', tripsError);
    return;
  }
  
  console.log(`Found ${trips.length} trips for CareBridge Living:`);
  trips.forEach((trip, index) => {
    console.log(`   ${index + 1}. Trip ${trip.id.slice(0, 8)} - Status: ${trip.status}`);
    console.log(`      Pickup: ${trip.pickup_address?.slice(0, 50)}...`);
  });
  
  console.log('');
  console.log('4️⃣ Testing dispatcher app query (WITH JOIN)...');
  
  // This is the exact query the dispatcher app uses
  const { data: dispatcherTrips, error: dispatcherError } = await supabase
    .from('trips')
    .select(`
      *,
      user_profile:profiles(first_name, last_name, phone_number),
      facility:facilities(id, name, contact_email, phone_number)
    `)
    .eq('facility_id', carebridge.id)
    .limit(5);
    
  if (dispatcherError) {
    console.error('❌ DISPATCHER QUERY FAILED:', dispatcherError);
    console.log('   This is why the facility name is not showing!');
    console.log('   The JOIN is failing due to a database relationship issue');
    return;
  }
  
  console.log(`✅ Dispatcher query succeeded! Found ${dispatcherTrips.length} trips with facility data:`);
  
  dispatcherTrips.forEach((trip, index) => {
    console.log(`   Trip ${index + 1}:`);
    console.log(`     ID: ${trip.id.slice(0, 8)}`);
    console.log(`     Facility ID: ${trip.facility_id}`);
    console.log(`     Facility Data: ${JSON.stringify(trip.facility, null, 6)}`);
    
    if (trip.facility?.name === 'CareBridge Living') {
      console.log('     ✅ FACILITY NAME IS CORRECT IN QUERY!');
    } else {
      console.log('     ❌ FACILITY NAME IS MISSING OR INCORRECT');
    }
  });
  
  console.log('');
  console.log('5️⃣ Testing display logic...');
  
  if (dispatcherTrips.length > 0) {
    const sampleTrip = dispatcherTrips[0];
    
    // Simulate the dispatcher display logic
    let facilityInfo = '';
    
    if (sampleTrip.facility) {
      if (sampleTrip.facility.name) {
        facilityInfo = sampleTrip.facility.name;
        console.log('✅ Display logic would show:', facilityInfo);
      } else {
        facilityInfo = `Facility ${sampleTrip.facility_id.slice(0, 8)}`;
        console.log('❌ Display logic would fall back to:', facilityInfo);
      }
    } else {
      facilityInfo = `Facility ${sampleTrip.facility_id.slice(0, 8)}`;
      console.log('❌ No facility data, would show:', facilityInfo);
    }
  }
  
  console.log('');
  console.log('📊 DIAGNOSIS SUMMARY:');
  
  if (dispatcherTrips.length > 0 && dispatcherTrips[0].facility?.name === 'CareBridge Living') {
    console.log('✅ DATABASE IS CORRECT: Facility name is properly stored and queryable');
    console.log('❌ FRONTEND ISSUE: The dispatcher app is not using the correct data');
    console.log('');
    console.log('🔧 SOLUTION NEEDED:');
    console.log('   1. Check if the dispatcher app is deployed with latest code');
    console.log('   2. Clear browser cache and hard refresh');
    console.log('   3. Verify the frontend display logic is working correctly');
  } else {
    console.log('❌ DATABASE ISSUE: The JOIN query is failing or facility data is missing');
    console.log('');
    console.log('🔧 SOLUTION NEEDED:');
    console.log('   1. Check foreign key relationships');
    console.log('   2. Verify RLS (Row Level Security) policies');
    console.log('   3. Check if facility_id in trips matches facilities.id');
  }
}

debugFacilityNameIssue().catch(console.error);
