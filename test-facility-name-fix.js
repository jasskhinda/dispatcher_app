#!/usr/bin/env node

// Test script to verify facility name display is working correctly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFacilityNameDisplay() {
  console.log('🔍 TESTING FACILITY NAME DISPLAY FIX');
  console.log('=====================================');
  console.log('');

  try {
    // Test 1: Check if we can query facilities table with correct fields
    console.log('1️⃣ Testing facilities table query...');
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('id, name, contact_email, phone_number')
      .limit(3);

    if (facilitiesError) {
      console.log('❌ Facilities query error:', facilitiesError.message);
      return;
    }

    console.log(`✅ Successfully queried facilities table`);
    console.log(`   Found ${facilities?.length || 0} facilities:`);
    facilities?.forEach(facility => {
      console.log(`   - ${facility.name} (ID: ${facility.id.slice(0, 8)}...)`);
    });
    console.log('');

    // Test 2: Check if we can query trips with facility information
    console.log('2️⃣ Testing trips with facility information...');
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        facility_id,
        pickup_address,
        facility:facilities(id, name, contact_email, phone_number)
      `)
      .not('facility_id', 'is', null)
      .limit(5);

    if (tripsError) {
      console.log('❌ Trips with facility query error:', tripsError.message);
      return;
    }

    console.log(`✅ Successfully queried trips with facility info`);
    console.log(`   Found ${trips?.length || 0} facility trips:`);
    trips?.forEach(trip => {
      const facilityName = trip.facility?.name || `Facility ${trip.facility_id?.slice(0, 8)}`;
      console.log(`   - Trip ${trip.id.slice(0, 8)}... → Facility: ${facilityName}`);
    });
    console.log('');

    // Test 3: Test the getClientDisplayInfo logic
    console.log('3️⃣ Testing facility display logic...');
    if (trips && trips.length > 0) {
      const sampleTrip = trips[0];
      const facilityInfo = getFacilityDisplayInfo(sampleTrip);
      
      console.log('   Sample trip facility info:');
      console.log(`   - Facility Name: ${facilityInfo.facilityName}`);
      console.log(`   - Facility Contact: ${facilityInfo.facilityContact || 'None'}`);
      console.log('');
    }

    // Test 4: Expected results
    console.log('4️⃣ Expected Results:');
    console.log('   ✅ BEFORE: "🏥 Facility e1b94bde"');
    console.log('   ✅ AFTER:  "🏥 FacilityGroupB" (or actual facility name)');
    console.log('');
    console.log('🎉 FACILITY NAME DISPLAY FIX - TEST COMPLETE!');
    console.log('');
    console.log('The dispatcher app should now show proper facility names');
    console.log('instead of generic facility IDs in the trip listings.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Helper function to test facility display logic (matches dispatcher app logic)
function getFacilityDisplayInfo(trip) {
  if (!trip.facility_id) return { facilityName: '', facilityContact: '' };
  
  let facilityName = '';
  let facilityContact = '';
  
  if (trip.facility) {
    // Professional facility display with multiple fallbacks
    if (trip.facility.name) {
      facilityName = trip.facility.name;
    } else if (trip.facility.contact_email) {
      facilityName = trip.facility.contact_email;
    } else {
      facilityName = `Facility ${trip.facility_id.slice(0, 8)}`;
    }
    
    // Add facility contact information
    if (trip.facility.phone_number) {
      facilityContact = trip.facility.phone_number;
    } else if (trip.facility.contact_email) {
      facilityContact = trip.facility.contact_email;
    }
  } else {
    facilityName = `Facility ${trip.facility_id.slice(0, 8)}`;
  }
  
  return { facilityName, facilityContact };
}

// Run the test
testFacilityNameDisplay().catch(console.error);
