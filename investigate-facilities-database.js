/**
 * Comprehensive Facility Database Investigation
 * This will show us exactly what's in the facilities table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateFacilitiesTable() {
  console.log('🔍 COMPREHENSIVE FACILITY DATABASE INVESTIGATION');
  console.log('===============================================');
  console.log('Target: Find facility that should be "CareBridge Living"');
  console.log('Problem: Dispatcher shows "🏥 Facility e1b94bde"');
  console.log('');
  
  try {
    // Get ALL facilities
    console.log('1️⃣ Fetching ALL facilities from database...');
    const { data: allFacilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (facilitiesError) {
      console.error('❌ Error fetching facilities:', facilitiesError);
      return;
    }
    
    console.log(`Found ${allFacilities.length} facilities in database:`);
    console.log('');
    
    allFacilities.forEach((facility, index) => {
      console.log(`Facility ${index + 1}:`);
      console.log(`   ID: ${facility.id}`);
      console.log(`   Name: "${facility.name || 'NULL/EMPTY'}"`);
      console.log(`   Contact Email: ${facility.contact_email || 'NULL'}`);
      console.log(`   Phone: ${facility.phone_number || 'NULL'}`);
      console.log(`   Address: ${facility.address || 'NULL'}`);
      console.log(`   Created: ${new Date(facility.created_at).toLocaleString()}`);
      
      // Check if this matches the problematic ID
      if (facility.id.startsWith('e1b94bde')) {
        console.log('   ⭐ THIS IS THE PROBLEMATIC FACILITY!');
        console.log('   ⭐ This is what should show "CareBridge Living"');
      }
      
      console.log('');
    });
    
    // Look for the specific facility ID from the error
    console.log('2️⃣ Looking for facility with ID starting with "e1b94bde"...');
    const { data: problematicFacility, error: problemError } = await supabase
      .from('facilities')
      .select('*')
      .like('id', 'e1b94bde%');
      
    if (problemError) {
      console.error('❌ Error searching for problematic facility:', problemError);
    } else if (problematicFacility && problematicFacility.length > 0) {
      const facility = problematicFacility[0];
      console.log('✅ Found the problematic facility:');
      console.log(`   ID: ${facility.id}`);
      console.log(`   Name: "${facility.name || 'EMPTY/NULL'}"`);
      console.log(`   Contact Email: ${facility.contact_email}`);
      console.log(`   Address: ${facility.address}`);
      console.log(`   Created: ${new Date(facility.created_at).toLocaleString()}`);
      
      if (!facility.name || facility.name.trim() === '') {
        console.log('   ❌ PROBLEM IDENTIFIED: Name field is empty!');
        console.log('   🔧 SOLUTION: Update this facility with name "CareBridge Living"');
      } else {
        console.log(`   ℹ️ Current name: "${facility.name}"`);
        console.log('   🔧 SOLUTION: Update name to "CareBridge Living"');
      }
    } else {
      console.log('❌ No facility found with ID starting with "e1b94bde"');
    }
    
    // Check trips associated with any facilities
    console.log('');
    console.log('3️⃣ Checking recent trips to identify which facility needs updating...');
    
    const { data: recentTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id, facility_id, pickup_address, created_at')
      .not('facility_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
    } else {
      console.log(`Found ${recentTrips.length} recent trips with facility_id:`);
      
      const facilityUsage = {};
      recentTrips.forEach(trip => {
        if (!facilityUsage[trip.facility_id]) {
          facilityUsage[trip.facility_id] = 0;
        }
        facilityUsage[trip.facility_id]++;
      });
      
      Object.entries(facilityUsage).forEach(([facilityId, count]) => {
        console.log(`   Facility ${facilityId.slice(0, 8)}: ${count} trips`);
        
        if (facilityId.startsWith('e1b94bde')) {
          console.log('     ⭐ THIS is the facility that needs "CareBridge Living" name');
        }
      });
    }
    
    console.log('');
    console.log('🎯 DIAGNOSIS SUMMARY:');
    console.log('=====================================');
    
    const targetFacility = allFacilities.find(f => f.id.startsWith('e1b94bde'));
    
    if (targetFacility) {
      if (!targetFacility.name || targetFacility.name.trim() === '') {
        console.log('❌ PROBLEM: Facility exists but name field is EMPTY');
        console.log('📝 ROOT CAUSE: Facility settings form is not saving the name properly');
        console.log('');
        console.log('🔧 IMMEDIATE FIX NEEDED:');
        console.log(`1. Update facility ${targetFacility.id} with name "CareBridge Living"`);
        console.log('2. Fix the facility settings form to save names properly');
        console.log('3. Test the fix by updating and checking dispatcher');
      } else {
        console.log(`ℹ️ FOUND: Facility has name "${targetFacility.name}"`);
        console.log('❓ QUESTION: Should this be "CareBridge Living" instead?');
        console.log('');
        console.log('🔧 POSSIBLE FIX:');
        console.log(`Update facility name from "${targetFacility.name}" to "CareBridge Living"`);
      }
    } else {
      console.log('❌ PROBLEM: Cannot find the facility that should be "CareBridge Living"');
      console.log('🔧 SOLUTION: Need to identify which facility ID is being referenced');
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigateFacilitiesTable().catch(console.error);
