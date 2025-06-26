/**
 * Simple test to check what's causing the trip approval error
 * This will help identify the exact issue
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables from dispatcher app
const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Testing Dispatcher Trip Actions Issue');
console.log('========================================\n');

async function testIssue() {
  try {
    // 1. Test Supabase connection
    console.log('1️⃣ Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('trips')
      .select('id, status')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError.message);
      return;
    }
    console.log('✅ Supabase connection working');

    // 2. Check for pending trips
    console.log('\n2️⃣ Looking for pending trips...');
    const { data: pendingTrips, error: pendingError } = await supabase
      .from('trips')
      .select('id, status, user_id, facility_id, payment_method_id')
      .eq('status', 'pending')
      .limit(5);
    
    if (pendingError) {
      console.error('❌ Error fetching pending trips:', pendingError.message);
      return;
    }
    
    console.log(`✅ Found ${pendingTrips.length} pending trips`);
    if (pendingTrips.length > 0) {
      console.log('Sample trip:', pendingTrips[0]);
    }

    // 3. Test the problematic environment variable
    console.log('\n3️⃣ Checking environment variables...');
    const bookingAppUrl = process.env.BOOKING_APP_URL || 'https://booking.compassionatecaretransportation.com';
    console.log('✅ BOOKING_APP_URL:', bookingAppUrl);

    // 4. Test the payment API endpoint that might be failing
    if (pendingTrips.length > 0) {
      const testTrip = pendingTrips[0];
      console.log('\n4️⃣ Testing payment API connectivity...');
      
      try {
        const testUrl = `${bookingAppUrl}/api/stripe/charge-payment`;
        console.log('Testing URL:', testUrl);
        
        const response = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tripId: testTrip.id }),
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        console.log('Payment API Response Status:', response.status);
        const result = await response.text();
        console.log('Payment API Response:', result.substring(0, 200));
        
      } catch (paymentError) {
        console.error('❌ Payment API Error:', paymentError.message);
        console.log('This might be the issue causing the internal server error!');
      }
    }

    // 5. Test direct trip update to see if database permissions work
    console.log('\n5️⃣ Testing direct trip update...');
    if (pendingTrips.length > 0) {
      const testTrip = pendingTrips[0];
      const { data: updateData, error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'approved_pending_payment',
          updated_at: new Date().toISOString()
        })
        .eq('id', testTrip.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Database update failed:', updateError.message);
        console.log('This indicates a permissions issue!');
      } else {
        console.log('✅ Database update successful');
        
        // Revert the change
        await supabase
          .from('trips')
          .update({ status: 'pending' })
          .eq('id', testTrip.id);
        console.log('✅ Reverted test change');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testIssue();
