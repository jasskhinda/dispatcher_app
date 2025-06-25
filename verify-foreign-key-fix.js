// Simple test to verify foreign key query syntax fix
// Run this in Node.js environment

const { createClient } = require('@supabase/supabase-js');

async function testQuerySyntax() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🧪 Testing Query Syntax Fix...\n');

  try {
    // Test the corrected query syntax
    console.log('1️⃣ Testing corrected query syntax...');
    const { data: correctedData, error: correctedError } = await supabase
      .from('trips')
      .select(`
        id,
        pickup_address,
        facility_id,
        user_id,
        user_profile:profiles(first_name, last_name),
        facility:facilities(id, name, contact_email)
      `)
      .order('created_at', { ascending: false })
      .limit(3);

    if (correctedError) {
      console.error('❌ Corrected syntax failed:', correctedError.message);
      
      // If the simple approach fails, try without the joins
      console.log('\n2️⃣ Testing without joins...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('trips')
        .select('id, pickup_address, facility_id, user_id')
        .order('created_at', { ascending: false })
        .limit(3);

      if (simpleError) {
        console.error('❌ Even simple query failed:', simpleError.message);
      } else {
        console.log('✅ Simple query works:', simpleData.length, 'trips found');
        
        // Manually fetch facility data
        if (simpleData.length > 0) {
          const facilityIds = [...new Set(simpleData.filter(t => t.facility_id).map(t => t.facility_id))];
          if (facilityIds.length > 0) {
            const { data: facilities, error: facError } = await supabase
              .from('facilities')
              .select('id, name')
              .in('id', facilityIds);
            
            if (!facError) {
              console.log('✅ Facility data fetched separately:', facilities);
            }
          }
        }
      }
    } else {
      console.log('✅ Corrected syntax works! Sample data:');
      correctedData.forEach((trip, index) => {
        console.log(`  ${index + 1}. Trip ${trip.id.substring(0, 8)}:`);
        console.log(`     Facility: ${trip.facility?.name || 'No facility'}`);
        console.log(`     Client: ${trip.user_profile ? trip.user_profile.first_name + ' ' + trip.user_profile.last_name : 'No client'}`);
      });

      // Check specifically for facility names
      const tripsWithFacilities = correctedData.filter(trip => trip.facility && trip.facility.name);
      console.log(`\n📊 Trips with facility names: ${tripsWithFacilities.length}/${correctedData.length}`);
      
      if (tripsWithFacilities.length > 0) {
        console.log('🎉 SUCCESS: Facility names are being loaded correctly!');
        tripsWithFacilities.forEach(trip => {
          console.log(`   🏥 ${trip.facility.name} (ID: ${trip.facility.id.substring(0, 8)})`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

testQuerySyntax();
