#!/usr/bin/env node

/**
 * Quick diagnostic script to identify the current trip actions API issue
 * This will help determine the exact cause of the "Internal server error"
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseApiError() {
  console.log('🔍 DIAGNOSING DISPATCHER API ERROR');
  console.log('===================================\n');

  try {
    // 1. Check for pending trips that dispatchers should be able to approve
    console.log('1️⃣ Checking for pending trips...');
    const { data: pendingTrips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'pending')
      .limit(5);

    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }

    console.log(`✅ Found ${pendingTrips.length} pending trips`);
    if (pendingTrips.length > 0) {
      const testTrip = pendingTrips[0];
      console.log(`Test trip: ${testTrip.id.substring(0, 8)}... (${testTrip.trip_type})`);
      
      // 2. Test the specific API endpoints that are failing
      const testCases = [
        { action: 'approve', description: 'Trip Approval' },
        { action: 'complete', description: 'Trip Completion' }
      ];

      for (const testCase of testCases) {
        console.log(`\n2️⃣ Testing ${testCase.description}...`);
        
        try {
          const response = await fetch('https://dispatch.compassionatecaretransportation.com/api/trips/actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tripId: testTrip.id,
              action: testCase.action
            }),
            signal: AbortSignal.timeout(10000)
          });

          console.log(`   Status: ${response.status}`);
          const result = await response.text();
          
          if (response.status === 500) {
            console.log(`   ❌ INTERNAL SERVER ERROR detected for ${testCase.action}`);
            console.log(`   Response: ${result.substring(0, 200)}...`);
            
            // Try to identify the specific error pattern
            if (result.includes('fetch')) {
              console.log(`   💡 Likely cause: External API connection issue`);
            } else if (result.includes('permission')) {
              console.log(`   💡 Likely cause: Database permission issue`);
            } else if (result.includes('timeout')) {
              console.log(`   💡 Likely cause: Request timeout`);
            } else if (result.includes('authentication')) {
              console.log(`   💡 Likely cause: Authentication issue`);
            } else {
              console.log(`   💡 Generic server error - check logs for details`);
            }
          } else if (response.status === 401) {
            console.log(`   🔒 Authentication required (expected for test)`);
          } else if (response.status === 400) {
            console.log(`   ⚠️  Bad request (expected for test data)`);
          } else {
            console.log(`   ✅ No immediate error detected`);
          }
          
        } catch (error) {
          console.log(`   ❌ Network error: ${error.message}`);
        }
      }

      // 3. Test the payment API connectivity (major suspect)
      console.log(`\n3️⃣ Testing BookingCCT Payment API connectivity...`);
      
      try {
        const paymentResponse = await fetch('https://booking.compassionatecaretransportation.com/api/stripe/charge-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tripId: testTrip.id }),
          signal: AbortSignal.timeout(10000)
        });

        console.log(`   Payment API Status: ${paymentResponse.status}`);
        const paymentResult = await paymentResponse.text();
        console.log(`   Payment API Response: ${paymentResult.substring(0, 200)}...`);
        
        if (paymentResponse.status >= 500) {
          console.log(`   ❌ PAYMENT API ERROR - This could be causing dispatcher approval failures!`);
        } else {
          console.log(`   ✅ Payment API is responding`);
        }
        
      } catch (paymentError) {
        console.log(`   ❌ Payment API connection failed: ${paymentError.message}`);
        console.log(`   💡 This is likely the root cause of dispatcher approval failures!`);
      }
    }

    // 4. Check for any trips stuck in intermediate states
    console.log(`\n4️⃣ Checking for trips in problematic states...`);
    
    const { data: stuckTrips, error: stuckError } = await supabase
      .from('trips')
      .select('id, status, created_at')
      .in('status', ['approved_pending_payment', 'payment_failed'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (stuckError) {
      console.error('❌ Error checking stuck trips:', stuckError);
    } else {
      console.log(`✅ Found ${stuckTrips.length} trips in intermediate states`);
      stuckTrips.forEach(trip => {
        console.log(`   ${trip.id.substring(0, 8)}... - ${trip.status} (${new Date(trip.created_at).toLocaleDateString()})`);
      });
    }

    console.log(`\n🔧 DIAGNOSIS SUMMARY:`);
    console.log(`- Pending trips available for testing: ${pendingTrips.length > 0 ? 'YES' : 'NO'}`);
    console.log(`- API endpoints tested for internal errors`);
    console.log(`- Payment system connectivity tested`);
    console.log(`- Stuck trips identified: ${stuckTrips?.length || 0}`);
    
    console.log(`\n💡 NEXT STEPS:`);
    console.log(`1. Check the server logs for detailed error messages`);
    console.log(`2. Verify environment variables in the dispatcher app`);
    console.log(`3. Test payment API connectivity from dispatcher app server`);
    console.log(`4. Consider implementing fallback approval without payment`);

  } catch (error) {
    console.error('❌ Diagnostic script error:', error);
  }
}

// Run the diagnosis
diagnoseApiError().then(() => {
  console.log('\n✅ Diagnosis complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
