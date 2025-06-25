// Debug script to check facility overview data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function debugFacilityOverview() {
  try {
    console.log('🔍 Debugging facility overview data...\n');
    
    // Check facilities
    console.log('1. Checking facilities...');
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('id, name, address, contact_email, phone_number')
      .order('name', { ascending: true });
    
    if (facilitiesError) {
      console.error('❌ Facilities error:', facilitiesError);
      return;
    }
    
    console.log(`✅ Found ${facilities?.length || 0} facilities`);
    facilities?.forEach((facility, index) => {
      console.log(`  ${index + 1}. ${facility.name} (ID: ${facility.id.slice(0, 8)}...)`);
      console.log(`     Address: ${facility.address || 'No address'}`);
      console.log(`     Email: ${facility.contact_email || 'No email'}`);
      console.log('');
    });
    
    // Check all trips
    console.log('2. Checking all trips...');
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('id, facility_id, status, price, created_at, managed_client_id, user_id')
      .order('created_at', { ascending: false });
    
    if (allTripsError) {
      console.error('❌ All trips error:', allTripsError);
      return;
    }
    
    console.log(`✅ Found ${allTrips?.length || 0} total trips`);
    
    // Check facility trips specifically
    const facilityTrips = allTrips?.filter(trip => trip.facility_id) || [];
    console.log(`✅ Found ${facilityTrips.length} trips with facility_id`);
    
    if (facilityTrips.length > 0) {
      console.log('\nFacility trips breakdown:');
      facilityTrips.slice(0, 5).forEach((trip, index) => {
        console.log(`  ${index + 1}. Trip ${trip.id.slice(0, 8)}...`);
        console.log(`     Facility ID: ${trip.facility_id?.slice(0, 8)}...`);
        console.log(`     Status: ${trip.status}`);
        console.log(`     Price: ${trip.price || 'No price'}`);
        console.log(`     Created: ${trip.created_at}`);
        console.log('');
      });
    }
    
    // Check individual trips
    const individualTrips = allTrips?.filter(trip => !trip.facility_id && trip.user_id) || [];
    console.log(`✅ Found ${individualTrips.length} individual trips (no facility_id)`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Total facilities: ${facilities?.length || 0}`);
    console.log(`Total trips: ${allTrips?.length || 0}`);
    console.log(`Facility trips: ${facilityTrips.length}`);
    console.log(`Individual trips: ${individualTrips.length}`);
    
    if (facilities?.length === 0) {
      console.log('\n⚠️  NO FACILITIES FOUND - This explains why the overview is empty!');
      console.log('💡 Solution: You need to add facilities to the database first.');
    }
    
    if (facilityTrips.length === 0 && facilities?.length > 0) {
      console.log('\n⚠️  FACILITIES EXIST BUT NO FACILITY TRIPS - Facilities will show with zero stats');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugFacilityOverview();
