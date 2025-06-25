// Check actual facility IDs in the database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wxaanujqarljnsfhuuam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YWFudWpxYXJsam5zZmh1dWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMjY5MDAsImV4cCI6MjA0OTcwMjkwMH0.IFzpGf4Qw7DdGJDsLjIo_Ir8yJ7-2tYUdpj8sYqRF38';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findCorrectFacilityId() {
  console.log('🔍 FINDING CORRECT FACILITY ID FOR CAREBRIDGE LIVING');
  console.log('===================================================');
  
  try {
    // 1. Find all facilities with "CareBridge" in the name
    console.log('1️⃣ Searching for CareBridge facilities...');
    const { data: carebridgeFacilities, error: carebridgeError } = await supabase
      .from('facilities')
      .select('id, name, contact_email, billing_email')
      .ilike('name', '%carebridge%');
    
    if (carebridgeError) {
      console.error('❌ Error searching CareBridge facilities:', carebridgeError.message);
    } else {
      console.log(`Found ${carebridgeFacilities?.length || 0} CareBridge facilities:`);
      carebridgeFacilities?.forEach((facility, i) => {
        console.log(`  ${i+1}. "${facility.name}" (ID: ${facility.id})`);
      });
    }
    
    // 2. Find all facilities with IDs starting with e1b94bde
    console.log('\n2️⃣ Searching for facilities with ID starting e1b94bde...');
    const { data: e1Facilities, error: e1Error } = await supabase
      .from('facilities')
      .select('id, name, contact_email, billing_email')
      .like('id', 'e1b94bde%');
    
    if (e1Error) {
      console.error('❌ Error searching e1b94bde facilities:', e1Error.message);
    } else {
      console.log(`Found ${e1Facilities?.length || 0} facilities with e1b94bde prefix:`);
      e1Facilities?.forEach((facility, i) => {
        console.log(`  ${i+1}. "${facility.name}" (ID: ${facility.id})`);
      });
    }
    
    // 3. Check recent trips with facility_id to see what's actually being used
    console.log('\n3️⃣ Checking recent trips to find active facility IDs...');
    const { data: recentTrips, error: tripsError } = await supabase
      .from('trips')
      .select('facility_id')
      .not('facility_id', 'is', null)
      .gte('pickup_time', '2025-06-01')
      .order('pickup_time', { ascending: false })
      .limit(20);
    
    if (tripsError) {
      console.error('❌ Error fetching recent trips:', tripsError.message);
    } else {
      const facilityIds = [...new Set(recentTrips?.map(trip => trip.facility_id) || [])];
      console.log(`Found ${facilityIds.length} unique facility IDs in recent trips:`);
      facilityIds.forEach((id, i) => {
        console.log(`  ${i+1}. ${id}`);
        if (id.startsWith('e1b94bde')) {
          console.log('      ⭐ This matches our target prefix!');
        }
      });
    }
    
    // 4. Try the exact ID from the URL to see what error we get
    console.log('\n4️⃣ Testing the exact facility ID from URL...');
    const urlFacilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    const { data: exactFacility, error: exactError } = await supabase
      .from('facilities')
      .select('id, name, contact_email, billing_email')
      .eq('id', urlFacilityId)
      .single();
    
    if (exactError) {
      console.error('❌ Exact facility lookup failed:', exactError.message);
      console.log('   Code:', exactError.code);
      console.log('   Details:', exactError.details);
    } else {
      console.log('✅ Exact facility found:', exactFacility);
    }
    
  } catch (err) {
    console.error('💥 Script failed:', err.message);
  }
}

findCorrectFacilityId();
