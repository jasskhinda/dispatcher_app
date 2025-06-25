// Debug facility lookup issue
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wxaanujqarljnsfhuuam.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YWFudWpxYXJsam5zZmh1dWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMjY5MDAsImV4cCI6MjA0OTcwMjkwMH0.IFzpGf4Qw7DdGJDsLjIo_Ir8yJ7-2tYUdpj8sYqRF38';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFacilityLookup() {
  console.log('🔍 DEBUGGING FACILITY LOOKUP');
  console.log('=====================================');
  
  const targetFacilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
  console.log('Target Facility ID:', targetFacilityId);
  
  // 1. Try exact lookup
  console.log('\n1️⃣ Exact facility lookup...');
  const { data: facility, error } = await supabase
    .from('facilities')
    .select('id, name, contact_email, phone_number, address, billing_email')
    .eq('id', targetFacilityId)
    .single();
    
  if (error) {
    console.log('❌ Exact lookup error:', error.message);
    console.log('Error code:', error.code);
    console.log('Error details:', error.details);
  } else if (facility) {
    console.log('✅ Facility found:', facility);
    return; // Success, no need to continue
  } else {
    console.log('❌ No facility found with exact ID');
  }
  
  // 2. Check all facilities
  console.log('\n2️⃣ Checking all facilities...');
  const { data: allFacilities, error: allError } = await supabase
    .from('facilities')
    .select('id, name, contact_email, created_at');
    
  if (allError) {
    console.log('❌ Error fetching all facilities:', allError.message);
  } else {
    console.log(`Found ${allFacilities?.length || 0} facilities:`);
    allFacilities?.forEach((f, i) => {
      console.log(`  ${i+1}. ${f.name || 'Unknown'} (ID: ${f.id})`);
      if (f.id.startsWith('e1b94bde')) {
        console.log('     ⭐ THIS has matching prefix!');
      }
    });
  }
  
  // 3. Check trips with this facility_id
  console.log('\n3️⃣ Checking trips with this facility_id...');
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, facility_id, pickup_time, status')
    .eq('facility_id', targetFacilityId)
    .limit(5);
    
  if (tripsError) {
    console.log('❌ Error fetching trips:', tripsError.message);
  } else {
    console.log(`Found ${trips?.length || 0} trips with this facility_id:`);
    trips?.forEach((t, i) => {
      console.log(`  ${i+1}. Trip ${t.id} - ${t.status} - ${new Date(t.pickup_time).toDateString()}`);
    });
  }
  
  // 4. Check if there's a similar facility ID
  console.log('\n4️⃣ Looking for similar facility IDs...');
  const { data: similarFacilities, error: similarError } = await supabase
    .from('facilities')
    .select('id, name, contact_email')
    .ilike('id', 'e1b94bde%');
    
  if (similarError) {
    console.log('❌ Error searching for similar facilities:', similarError.message);
  } else {
    console.log(`Found ${similarFacilities?.length || 0} facilities with similar IDs:`);
    similarFacilities?.forEach((f, i) => {
      console.log(`  ${i+1}. ${f.name || 'Unknown'} (ID: ${f.id})`);
    });
  }
}

debugFacilityLookup().catch(console.error);
