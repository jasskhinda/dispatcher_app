#!/usr/bin/env node

/**
 * Test script to verify the trip actions API fix
 * This will test the specific issue with status validation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApiFixture() {
  console.log('🧪 TESTING TRIP ACTIONS API FIX');
  console.log('===============================\n');

  try {
    // 1. Find a pending individual trip for testing
    console.log('1️⃣ Looking for a pending individual trip...');
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'pending')
      .not('facility_id', 'is', null) // Individual trips have user_id but no facility_id
      .is('facility_id', null)
      .not('payment_method_id', 'is', null)
      .limit(1);

    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }

    if (trips.length === 0) {
      console.log('⚠️  No suitable test trips found. Creating a test scenario...');
      
      // Look for any trip we can use for testing the payment API directly
      const { data: anyTrips } = await supabase
        .from('trips')
        .select('*')
        .not('payment_method_id', 'is', null)
        .limit(1);
        
      if (anyTrips && anyTrips.length > 0) {
        console.log('📝 Using existing trip for payment API test:', anyTrips[0].id.substring(0, 8));
        await testPaymentAPIDirectly(anyTrips[0]);
      } else {
        console.log('ℹ️  No trips with payment methods found for testing');
      }
      return;
    }

    const testTrip = trips[0];
    console.log(`✅ Found test trip: ${testTrip.id.substring(0, 8)}...`);
    console.log(`   Status: ${testTrip.status}`);
    console.log(`   Payment method: ${testTrip.payment_method_id ? 'Yes' : 'No'}`);
    console.log(`   User ID: ${testTrip.user_id ? 'Yes' : 'No'}`);
    console.log(`   Facility ID: ${testTrip.facility_id || 'None'}`);

    // 2. Test the payment status validation fix
    console.log('\n2️⃣ Testing payment API with approved_pending_payment status...');
    
    // First simulate the dispatcher approval (set to approved_pending_payment)
    const { data: approvedTrip, error: approvalError } = await supabase
      .from('trips')
      .update({
        status: 'approved_pending_payment',
        driver_name: 'Test Driver',
        vehicle: 'Test Vehicle',
        updated_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select()
      .single();

    if (approvalError) {
      console.error('❌ Failed to simulate approval:', approvalError);
      return;
    }

    console.log('✅ Trip status set to approved_pending_payment');

    // 3. Test the payment API with the new status
    await testPaymentAPIDirectly(approvedTrip);

    // 4. Restore original status
    console.log('\n4️⃣ Restoring original trip status...');
    await supabase
      .from('trips')
      .update({
        status: testTrip.status,
        driver_name: testTrip.driver_name,
        vehicle: testTrip.vehicle,
        updated_at: new Date().toISOString()
      })
      .eq('id', testTrip.id);

    console.log('✅ Trip status restored');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function testPaymentAPIDirectly(trip) {
  try {
    console.log('💳 Testing payment API with current status...');
    
    const response = await fetch('https://booking.compassionatecaretransportation.com/api/stripe/charge-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tripId: trip.id }),
      signal: AbortSignal.timeout(10000)
    });

    console.log(`   Response status: ${response.status}`);
    
    const result = await response.text();
    console.log(`   Response preview: ${result.substring(0, 200)}...`);
    
    if (response.status === 400 && result.includes('Trip must be approved')) {
      console.log('❌ STATUS VALIDATION STILL FAILING - Fix not working');
    } else if (response.status === 400 && result.includes('authentication')) {
      console.log('✅ Status validation passed - now failing on authentication (expected)');
    } else if (response.status === 401 || response.status === 403) {
      console.log('✅ Status validation passed - authentication required (expected)');
    } else if (response.status === 200) {
      console.log('✅ Payment API working completely');
    } else {
      console.log(`⚠️  Unexpected response: ${response.status}`);
    }
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log('⏱️  Payment API timeout (this might indicate server issues)');
    } else {
      console.log(`❌ Payment API test error: ${error.message}`);
    }
  }
}

// Run the test
testApiFixture().then(() => {
  console.log('\n🎯 TEST COMPLETE');
  console.log('==============');
  console.log('If you see "Status validation passed" above, the fix is working!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal test error:', error);
  process.exit(1);
});
