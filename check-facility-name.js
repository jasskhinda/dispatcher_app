// Script to check and fix facility name in database
// This should be run in the browser console on the dispatcher app

async function checkAndFixFacilityName() {
  console.log('🔍 CHECKING FACILITY NAME IN DATABASE');
  console.log('====================================');
  
  // Get the supabase client from the page
  const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NzYzNjQsImV4cCI6MjAzMzQ1MjM2NH0.U4TG4Rnwaj7wCGGPCLJWtcO9bgkRRoUcxcOvlCeqXMM';
  
  const { createClient } = supabase;
  const client = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('1️⃣ Checking current facility data...');
    
    // Check all facilities
    const { data: facilities, error: facilitiesError } = await client
      .from('facilities')
      .select('id, name, contact_email, phone_number')
      .limit(5);
    
    if (facilitiesError) {
      console.error('❌ Error fetching facilities:', facilitiesError);
      return;
    }
    
    console.log(`✅ Found ${facilities.length} facilities:`);
    facilities.forEach(facility => {
      console.log(`   - ${facility.name} (ID: ${facility.id.slice(0, 8)}...)`);
    });
    
    // Find the specific facility that's showing as "e1b94bde"
    const targetFacilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    const targetFacility = facilities.find(f => f.id === targetFacilityId);
    
    if (targetFacility) {
      console.log('\n2️⃣ Found target facility:');
      console.log(`   Current name: "${targetFacility.name}"`);
      console.log(`   Expected name: "FacilityGroupB"`);
      
      if (targetFacility.name !== 'FacilityGroupB') {
        console.log('\n3️⃣ ISSUE FOUND: Facility name is not "FacilityGroupB"');
        console.log('The facility needs to be updated in the facility settings.');
        console.log('');
        console.log('🔧 SOLUTION:');
        console.log('1. Go to: https://facility.compassionatecaretransportation.com/dashboard/facility-settings');
        console.log('2. Update the "Facility Name" field to "FacilityGroupB"');
        console.log('3. Save the settings');
        console.log('4. Refresh the dispatcher app');
      } else {
        console.log('\n✅ Facility name is correct!');
        console.log('The issue might be in the database query or caching.');
      }
    } else {
      console.log('\n❌ Target facility not found!');
      console.log('Facility ID e1b94bde-d092-4ce6-b78c-9cff1d0118a3 does not exist');
    }
    
    console.log('\n4️⃣ Testing trips query...');
    
    // Test the same query the dispatcher app uses
    const { data: trips, error: tripsError } = await client
      .from('trips')
      .select(`
        id,
        facility_id,
        pickup_address,
        facility:facilities(id, name, contact_email, phone_number)
      `)
      .not('facility_id', 'is', null)
      .limit(2);
    
    if (tripsError) {
      console.error('❌ Trips query error:', tripsError);
    } else {
      console.log(`✅ Trips query successful - found ${trips.length} trips`);
      trips.forEach(trip => {
        const facilityName = trip.facility?.name || `Facility ${trip.facility_id?.slice(0, 8)}`;
        console.log(`   - Trip ${trip.id.slice(0, 8)}... → Facility: "${facilityName}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkAndFixFacilityName();
