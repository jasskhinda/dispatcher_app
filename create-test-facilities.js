// Quick facility creation script for testing the multi-facility overview
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestFacilities() {
  console.log('🏥 CREATING TEST FACILITIES FOR MULTI-FACILITY OVERVIEW');
  console.log('======================================================');
  
  try {
    // Check if facilities table exists and has any data
    console.log('🔍 Checking existing facilities...');
    const { data: existingFacilities, error: checkError } = await supabase
      .from('facilities')
      .select('id, name')
      .limit(10);
    
    if (checkError) {
      console.error('❌ Error checking facilities:', checkError);
      return;
    }
    
    console.log(`📊 Found ${existingFacilities?.length || 0} existing facilities`);
    existingFacilities?.forEach((facility, index) => {
      console.log(`  ${index + 1}. ${facility.name} (${facility.id})`);
    });
    
    if (existingFacilities && existingFacilities.length > 0) {
      console.log('✅ Facilities already exist! The issue might be with the display logic.');
      
      // Check trips associated with these facilities
      console.log('\n🔍 Checking trips for these facilities...');
      for (const facility of existingFacilities) {
        const { data: trips, error: tripsError } = await supabase
          .from('trips')
          .select('id, status, created_at')
          .eq('facility_id', facility.id)
          .limit(5);
        
        if (!tripsError && trips) {
          console.log(`  📋 ${facility.name}: ${trips.length} trips`);
        }
      }
      return;
    }
    
    // Create test facilities
    console.log('\n🏗️ Creating test facilities...');
    
    const testFacilities = [
      {
        name: 'CareBridge Living',
        address: '123 Healthcare Drive, Toronto, ON M5V 3A8',
        contact_email: 'admin@carebridge.com',
        billing_email: 'billing@carebridge.com',
        phone_number: '(416) 555-0123',
        facility_type: 'assisted_living'
      },
      {
        name: 'Sunset Senior Care',
        address: '456 Sunset Boulevard, Toronto, ON M6H 2K9',
        contact_email: 'info@sunsetcare.com',
        billing_email: 'billing@sunsetcare.com',
        phone_number: '(416) 555-0456',
        facility_type: 'nursing_home'
      },
      {
        name: 'Maple Grove Medical Center',
        address: '789 Maple Street, Toronto, ON M4B 1X2',
        contact_email: 'contact@maplegrove.com',
        billing_email: 'billing@maplegrove.com',
        phone_number: '(416) 555-0789',
        facility_type: 'medical_center'
      }
    ];
    
    for (const facilityData of testFacilities) {
      console.log(`\n📝 Creating: ${facilityData.name}...`);
      
      const { data: newFacility, error: createError } = await supabase
        .from('facilities')
        .insert([facilityData])
        .select()
        .single();
      
      if (createError) {
        console.error(`❌ Error creating ${facilityData.name}:`, createError);
      } else {
        console.log(`✅ Created: ${newFacility.name} (ID: ${newFacility.id})`);
        
        // Create a few test trips for this facility
        console.log(`  📋 Creating test trips for ${newFacility.name}...`);
        
        const testTrips = [
          {
            facility_id: newFacility.id,
            pickup_address: `${facilityData.address}`,
            destination_address: '999 Hospital Way, Toronto, ON',
            pickup_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            status: 'pending',
            price: 45.00,
            managed_client_id: null // Will create managed clients later if needed
          },
          {
            facility_id: newFacility.id,
            pickup_address: `${facilityData.address}`,
            destination_address: '555 Medical Plaza, Toronto, ON',
            pickup_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
            status: 'upcoming',
            price: 35.00,
            managed_client_id: null
          },
          {
            facility_id: newFacility.id,
            pickup_address: `${facilityData.address}`,
            destination_address: '777 Pharmacy Drive, Toronto, ON',
            pickup_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            status: 'completed',
            price: 50.00,
            managed_client_id: null
          }
        ];
        
        for (const tripData of testTrips) {
          const { data: newTrip, error: tripError } = await supabase
            .from('trips')
            .insert([tripData])
            .select()
            .single();
          
          if (tripError) {
            console.error(`    ❌ Error creating trip:`, tripError);
          } else {
            console.log(`    ✅ Created trip: ${newTrip.status} - ${newTrip.pickup_time.split('T')[0]}`);
          }
        }
      }
    }
    
    console.log('\n🎉 TEST FACILITIES CREATED SUCCESSFULLY!');
    console.log('🔄 Refresh the Multi-Facility Overview page to see the data.');
    console.log('📊 You should now see:');
    console.log('   - 3 Total Facilities');
    console.log('   - 9 Total Trips');
    console.log('   - Mix of pending, upcoming, and completed trips');
    console.log('   - Revenue from completed trips');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

createTestFacilities();
