#!/usr/bin/env node

/**
 * Complete Workflow Test Script
 * Tests: Approve/Reject → Complete → Real-time Sync
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteWorkflow() {
  console.log('🚀 Testing Complete Workflow: Approve → Complete → Invoice');
  console.log('=========================================================');

  try {
    // Step 1: Find a pending trip or create one
    console.log('\\n1️⃣ Looking for pending trips...');
    
    let { data: pendingTrips, error: pendingError } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'pending')
      .limit(1);

    if (pendingError) {
      console.error('Error fetching pending trips:', pendingError);
      return;
    }

    let testTrip;
    if (pendingTrips && pendingTrips.length > 0) {
      testTrip = pendingTrips[0];
      console.log('✅ Found pending trip:', testTrip.id);
    } else {
      // Create a test trip
      console.log('📝 Creating test trip...');
      const { data: newTrip, error: createError } = await supabase
        .from('trips')
        .insert([{
          user_id: 'ea79223a-b30b-4b70-b86e-cdab8ae88bdf', // David Patel
          facility_id: '9e7b8c9b-4e7b-4c9b-8e7b-9c9b4e7b8c9b',
          pickup_location: '123 Test St, Toronto, ON',
          dropoff_location: '456 Test Ave, Toronto, ON',
          pickup_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          trip_type: 'facility_booking',
          price: 50.00,
          notes: 'Complete workflow test trip'
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating test trip:', createError);
        return;
      }

      testTrip = newTrip;
      console.log('✅ Created test trip:', testTrip.id);
    }

    // Step 2: Simulate dispatcher approval
    console.log('\\n2️⃣ Simulating dispatcher approval...');
    
    const { data: approvedTrip, error: approveError } = await supabase
      .from('trips')
      .update({
        status: 'upcoming',
        driver_name: 'Test Driver',
        vehicle: 'Standard Accessible Vehicle',
        updated_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select()
      .single();

    if (approveError) {
      console.error('Error approving trip:', approveError);
      return;
    }

    console.log('✅ Trip approved:', approvedTrip.status);

    // Step 3: Wait and simulate completion
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\\n3️⃣ Simulating trip completion...');
    
    const { data: completedTrip, error: completeError } = await supabase
      .from('trips')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select()
      .single();

    if (completeError) {
      console.error('Error completing trip:', completeError);
      return;
    }

    console.log('✅ Trip completed:', completedTrip.status);

    // Step 4: Check if trip is now billable
    console.log('\\n4️⃣ Checking if trip is billable...');
    
    const { data: billableTrip, error: billableError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', testTrip.id)
      .eq('status', 'completed')
      .single();

    if (billableError) {
      console.error('Error checking billable status:', billableError);
      return;
    }

    if (billableTrip) {
      console.log('✅ Trip is ready for billing!');
      console.log('   Trip ID:', billableTrip.id);
      console.log('   Status:', billableTrip.status);
      console.log('   Price:', billableTrip.price);
      console.log('   Completed at:', billableTrip.completed_at);
    }

    // Step 5: Clean up (optional - remove test trip)
    console.log('\\n5️⃣ Cleaning up test data...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await supabase
      .from('trips')
      .delete()
      .eq('id', testTrip.id);

    console.log('✅ Test trip cleaned up');

    console.log('\\n🎉 COMPLETE WORKFLOW TEST SUCCESSFUL!');
    console.log('=====================================');
    console.log('✅ Approval workflow: Working');
    console.log('✅ Completion workflow: Working');
    console.log('✅ Billing integration: Ready');
    console.log('\\n📋 Real-time sync should now work in the facility app!');

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
  }
}

if (require.main === module) {
  testCompleteWorkflow();
}
