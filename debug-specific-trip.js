// Debug script to check specific trip data
const { createClient } = require('@supabase/supabase-js');

// Use the same Supabase config as the dispatcher app
const supabase = createClient(
  'https://btzfgasugkycbavcwvnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
);

async function debugSpecificTrip() {
  console.log('🔍 DEBUGGING SPECIFIC TRIP: 7162903d-1251-43c2-9e65-c7ff6cdedfc2');
  console.log('===========================================');
  
  try {
    const tripId = '7162903d-1251-43c2-9e65-c7ff6cdedfc2';
    
    // 1. Get basic trip data
    console.log('\n1️⃣ Fetching basic trip data...');
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
      
    if (tripError) {
      console.error('❌ Trip error:', tripError);
      return;
    }
    
    console.log('✅ Trip found:');
    console.log('   ID:', trip.id);
    console.log('   User ID:', trip.user_id);
    console.log('   Facility ID:', trip.facility_id);
    console.log('   Managed Client ID:', trip.managed_client_id);
    console.log('   Passenger Name:', trip.passenger_name);
    console.log('   Created At:', trip.created_at);
    
    // 2. Check facility data if facility_id exists
    if (trip.facility_id) {
      console.log('\n2️⃣ Fetching facility data...');
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', trip.facility_id)
        .single();
        
      if (facilityError) {
        console.error('❌ Facility error:', facilityError);
        console.log('   This could be why the facility name is not showing!');
      } else {
        console.log('✅ Facility found:');
        console.log('   ID:', facility.id);
        console.log('   Name:', facility.name);
        console.log('   Contact Email:', facility.contact_email);
        console.log('   Phone:', facility.phone_number);
        console.log('   Address:', facility.address);
      }
    } else {
      console.log('\n2️⃣ No facility_id found in trip data');
    }
    
    // 3. Check managed client if managed_client_id exists
    if (trip.managed_client_id) {
      console.log('\n3️⃣ Fetching managed client data...');
      const { data: managedClient, error: clientError } = await supabase
        .from('facility_managed_clients')
        .select('*')
        .eq('id', trip.managed_client_id)
        .single();
        
      if (clientError) {
        console.error('❌ Managed client error:', clientError);
      } else {
        console.log('✅ Managed client found:');
        console.log('   ID:', managedClient.id);
        console.log('   Name:', `${managedClient.first_name} ${managedClient.last_name}`);
        console.log('   Phone:', managedClient.phone_number);
        console.log('   Email:', managedClient.email);
      }
    } else {
      console.log('\n3️⃣ No managed_client_id found');
    }
    
    // 4. Check user profile if user_id exists
    if (trip.user_id) {
      console.log('\n4️⃣ Fetching user profile...');
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', trip.user_id)
        .single();
        
      if (userError) {
        console.error('❌ User profile error:', userError);
      } else {
        console.log('✅ User profile found:');
        console.log('   ID:', userProfile.id);
        console.log('   Name:', `${userProfile.first_name} ${userProfile.last_name}`);
        console.log('   Role:', userProfile.role);
        console.log('   Facility ID:', userProfile.facility_id);
        console.log('   Phone:', userProfile.phone_number);
        console.log('   Email:', userProfile.email);
      }
    } else {
      console.log('\n4️⃣ No user_id found');
    }
    
    // 5. Summary and recommendations
    console.log('\n🎯 SUMMARY & DIAGNOSIS:');
    console.log('============================');
    
    if (trip.facility_id) {
      console.log('✅ Trip has facility_id - this is a facility booking');
      // The facility query will tell us if the facility exists
    } else {
      console.log('❌ Trip has no facility_id - this might be an individual booking');
    }
    
    if (trip.managed_client_id) {
      console.log('✅ Trip has managed_client_id - client is managed by facility');
    }
    
    if (trip.user_id) {
      console.log('✅ Trip has user_id - there is an authenticated user');
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

debugSpecificTrip();
