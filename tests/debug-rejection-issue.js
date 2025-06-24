#!/usr/bin/env node

/**
 * Debug Trip Rejection Issue
 * Test if rejection is persisting in database
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugRejectionIssue() {
  console.log('🔍 Debugging Trip Rejection Issue');
  console.log('==================================');

  try {
    // Step 1: Find a pending trip or create one for testing
    console.log('\\n1️⃣ Looking for pending trips...');
    
    let { data: pendingTrips, error: pendingError } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'pending')
      .limit(3);

    if (pendingError) {
      console.error('Error fetching pending trips:', pendingError);
      return;
    }

    if (!pendingTrips || pendingTrips.length === 0) {
      console.log('📝 No pending trips found, creating test trip...');
      
      const { data: newTrip, error: createError } = await supabase
        .from('trips')
        .insert([{
          user_id: 'ea79223a-b30b-4b70-b86e-cdab8ae88bdf',
          facility_id: '9e7b8c9b-4e7b-4c9b-8e7b-9c9b4e7b8c9b',
          pickup_location: '123 Debug St, Toronto, ON',
          dropoff_location: '456 Debug Ave, Toronto, ON',
          pickup_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          trip_type: 'facility_booking',
          price: 45.00,
          notes: 'Debug rejection test trip'
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating test trip:', createError);
        return;
      }

      pendingTrips = [newTrip];
      console.log('✅ Created test trip:', newTrip.id);
    }

    const testTrip = pendingTrips[0];
    console.log('\\n📋 Test trip details:');
    console.log('   ID:', testTrip.id);
    console.log('   Status:', testTrip.status);
    console.log('   Created:', testTrip.created_at);

    // Step 2: Simulate dispatcher rejection (exact same as dispatcher app)
    console.log('\\n2️⃣ Simulating dispatcher rejection...');
    
    const rejectionReason = 'Test rejection - debugging persistence issue';
    
    const { data: rejectedData, error: rejectError } = await supabase
      .from('trips')
      .update({ 
        status: 'cancelled',
        cancellation_reason: `Rejected by dispatcher: ${rejectionReason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select();

    if (rejectError) {
      console.error('❌ Error rejecting trip:', rejectError);
      return;
    }

    console.log('✅ Trip rejection response:', rejectedData);

    // Step 3: Verify the rejection persisted by fetching fresh data
    console.log('\\n3️⃣ Verifying rejection persisted...');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', testTrip.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying trip:', verifyError);
      return;
    }

    console.log('📋 Trip after rejection:');
    console.log('   ID:', verifyData.id);
    console.log('   Status:', verifyData.status);
    console.log('   Cancellation reason:', verifyData.cancellation_reason);
    console.log('   Updated at:', verifyData.updated_at);

    if (verifyData.status === 'cancelled') {
      console.log('\\n✅ SUCCESS: Rejection persisted correctly!');
      console.log('   The database update is working properly.');
      console.log('   Issue is likely in the frontend state management or filtering.');
    } else {
      console.log('\\n❌ PROBLEM: Rejection did not persist!');
      console.log('   The database update failed or was overwritten.');
      console.log('   Current status:', verifyData.status);
    }

    // Step 4: Check if there are any other trips with the same ID
    console.log('\\n4️⃣ Checking for duplicate trips...');
    
    const { data: duplicateCheck, error: duplicateError } = await supabase
      .from('trips')
      .select('id, status, created_at')
      .eq('id', testTrip.id);

    if (!duplicateError && duplicateCheck) {
      console.log('Trips with this ID:', duplicateCheck.length);
      duplicateCheck.forEach((trip, index) => {
        console.log(`   ${index + 1}. Status: ${trip.status}, Created: ${trip.created_at}`);
      });
    }

    // Step 5: Check dispatcher app query logic
    console.log('\\n5️⃣ Testing dispatcher app query...');
    
    // Simulate the exact query used by dispatcher app
    const { data: dispatcherView, error: dispatcherError } = await supabase
      .from('trips')
      .select('*')
      .eq('trip_type', 'facility_booking')
      .order('created_at', { ascending: false });

    if (!dispatcherError && dispatcherView) {
      const ourTrip = dispatcherView.find(trip => trip.id === testTrip.id);
      if (ourTrip) {
        console.log('✅ Trip found in dispatcher query:');
        console.log('   Status:', ourTrip.status);
        console.log('   Should show as:', ourTrip.status === 'cancelled' ? 'REJECTED (no buttons)' : 'PENDING (Approve/Reject buttons)');
      } else {
        console.log('❌ Trip not found in dispatcher query');
      }
    }

    // Step 6: Clean up test trip
    console.log('\\n6️⃣ Cleaning up...');
    
    if (testTrip.notes && testTrip.notes.includes('Debug rejection test trip')) {
      await supabase
        .from('trips')
        .delete()
        .eq('id', testTrip.id);
      console.log('✅ Test trip cleaned up');
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

if (require.main === module) {
  debugRejectionIssue();
}
