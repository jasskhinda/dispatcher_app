#!/usr/bin/env node

/**
 * Simple Rejection Test
 * Direct test of the rejection functionality to see if it's working
 */

const { createClient } = require('@supabase/supabase-js');

// Use service role for full access
const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRejection() {
  console.log('🧪 Testing Trip Rejection - Direct Database Test');
  console.log('================================================');

  try {
    // Find the specific trip fe5f6b7c that you mentioned
    console.log('1️⃣ Looking for trip fe5f6b7c...');
    
    const { data: foundTrips, error: searchError } = await supabase
      .from('trips')
      .select('*')
      .like('id', 'fe5f6b7c%');

    if (searchError) {
      console.error('❌ Search error:', searchError);
      return;
    }

    console.log(`Found ${foundTrips.length} trips matching fe5f6b7c:`);
    foundTrips.forEach(trip => {
      console.log(`   - ${trip.id} (${trip.status})`);
    });

    if (foundTrips.length === 0) {
      console.log('❌ Trip fe5f6b7c not found. Let me check for any pending trips...');
      
      const { data: pendingTrips } = await supabase
        .from('trips')
        .select('id, status, user_id, managed_client_id')
        .eq('status', 'pending')
        .limit(3);
      
      console.log('Available pending trips:');
      pendingTrips.forEach(trip => {
        console.log(`   - ${trip.id.substring(0, 8)} (${trip.status})`);
      });
      
      if (pendingTrips.length === 0) {
        console.log('❌ No pending trips found. Creating a test trip...');
        
        const { data: newTrip, error: createError } = await supabase
          .from('trips')
          .insert([{
            user_id: 'ea79223a-b30b-4b70-b86e-cdab8ae88bdf',
            facility_id: '9e7b8c9b-4e7b-4c9b-8e7b-9c9b4e7b8c9b',
            pickup_location: '123 Test Street, Toronto, ON',
            dropoff_location: '456 Test Avenue, Toronto, ON',
            pickup_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            trip_type: 'facility_booking',
            price: 50.00,
            notes: 'Rejection test trip'
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Failed to create test trip:', createError);
          return;
        }
        
        foundTrips.push(newTrip);
        console.log('✅ Created test trip:', newTrip.id.substring(0, 8));
      } else {
        foundTrips.push(pendingTrips[0]);
      }
    }

    const testTrip = foundTrips[0];
    console.log(`\n2️⃣ Testing rejection on trip: ${testTrip.id}`);
    console.log(`   Current status: ${testTrip.status}`);

    // Perform the rejection
    const rejectionReason = 'TEST REJECTION - Debugging persistence issue';
    
    const { data: rejectionResult, error: rejectionError } = await supabase
      .from('trips')
      .update({
        status: 'cancelled',
        cancellation_reason: `Rejected by dispatcher: ${rejectionReason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select();

    if (rejectionError) {
      console.error('❌ Rejection failed:', rejectionError);
      return;
    }

    console.log('✅ Rejection update completed:', rejectionResult);

    // Wait and verify
    console.log('\n3️⃣ Waiting 2 seconds then verifying...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: verifyTrip, error: verifyError } = await supabase
      .from('trips')
      .select('id, status, cancellation_reason, updated_at')
      .eq('id', testTrip.id)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return;
    }

    console.log('📋 Trip after rejection:');
    console.log(`   ID: ${verifyTrip.id}`);
    console.log(`   Status: ${verifyTrip.status}`);
    console.log(`   Reason: ${verifyTrip.cancellation_reason}`);
    console.log(`   Updated: ${verifyTrip.updated_at}`);

    if (verifyTrip.status === 'cancelled') {
      console.log('\n🎉 SUCCESS! Rejection is working correctly.');
      console.log('   The issue must be in the frontend or data refresh logic.');
    } else {
      console.log('\n❌ FAILURE! Rejection did not persist.');
      console.log(`   Expected: cancelled, Got: ${verifyTrip.status}`);
    }

    // Test what the dispatcher query would return
    console.log('\n4️⃣ Testing dispatcher query...');
    
    const { data: dispatcherView, error: dispatcherError } = await supabase
      .from('trips')
      .select('id, status, cancellation_reason')
      .eq('trip_type', 'facility_booking')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!dispatcherError) {
      console.log('Dispatcher query results:');
      dispatcherView.forEach(trip => {
        const isOurTrip = trip.id === testTrip.id;
        console.log(`   ${isOurTrip ? '👉' : '  '} ${trip.id.substring(0, 8)} - ${trip.status}`);
        if (isOurTrip) {
          console.log(`      This is our test trip! Status: ${trip.status}`);
        }
      });
    }

    console.log('\n✅ Test completed! Check the results above.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testRejection();
}
