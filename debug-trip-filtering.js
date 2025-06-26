const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔍 DEBUGGING TRIP FILTERING FOR INDIVIDUAL TRIPS PAGE...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.log('Expected:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL=https://btzfgasugkycbavcwvnx.supabase.co');
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('🔗 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTripFiltering() {
  try {
    console.log('🧪 Testing trip filtering logic...\n');
    
    // 1. Check all recent trips
    console.log('1️⃣ Fetching all recent trips...');
    const { data: allTrips, error: allError } = await supabase
      .from('trips')
      .select('id, facility_id, user_id, created_at, pickup_address, status')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (allError) {
      console.error('❌ Error fetching all trips:', allError);
      return;
    }
    
    console.log(`✅ Found ${allTrips?.length || 0} recent trips\n`);
    
    // 2. Test the individual trips query (exact same as the page)
    console.log('2️⃣ Testing individual trips query (same as page)...');
    const { data: individualTrips, error: individualError } = await supabase
      .from('trips')
      .select('id, facility_id, user_id, created_at, pickup_address, status')
      .is('facility_id', null)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (individualError) {
      console.error('❌ Error fetching individual trips:', individualError);
      return;
    }
    
    console.log(`✅ Individual trips query returned: ${individualTrips?.length || 0} trips\n`);
    
    // 3. Test facility trips query
    console.log('3️⃣ Testing facility trips query...');
    const { data: facilityTrips, error: facilityError } = await supabase
      .from('trips')
      .select('id, facility_id, user_id, created_at, pickup_address, status')
      .not('facility_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (facilityError) {
      console.error('❌ Error fetching facility trips:', facilityError);
      return;
    }
    
    console.log(`✅ Facility trips query returned: ${facilityTrips?.length || 0} trips\n`);
    
    // 4. Detailed analysis
    console.log('📊 DETAILED ANALYSIS:');
    console.log('===================');
    
    if (allTrips && allTrips.length > 0) {
      console.log('Recent trips breakdown:');
      allTrips.slice(0, 10).forEach((trip, i) => {
        const hasUser = trip.user_id ? '✓' : '✗';
        const hasFacility = trip.facility_id ? '✓' : '✗';
        const category = trip.facility_id ? 'FACILITY' : (trip.user_id ? 'INDIVIDUAL' : 'ORPHAN');
        const wouldAppear = !trip.facility_id && trip.user_id ? 'YES' : 'NO';
        console.log(`  ${i+1}. ${trip.id.slice(0,8)} - User:${hasUser} Facility:${hasFacility} -> ${category} (Individual page: ${wouldAppear})`);
      });
    }
    
    console.log('\n');
    
    // 5. Check for potential data issues
    console.log('🔍 CHECKING FOR DATA ISSUES:');
    console.log('===========================');
    
    // Check for trips with both facility_id AND user_id (potential issue)
    const mixedTrips = allTrips?.filter(trip => trip.facility_id && trip.user_id) || [];
    if (mixedTrips.length > 0) {
      console.log(`⚠️  FOUND ${mixedTrips.length} trips with BOTH facility_id AND user_id:`);
      mixedTrips.forEach(trip => {
        console.log(`   - ${trip.id}: facility_id=${trip.facility_id?.slice(0,8)}, user_id=${trip.user_id?.slice(0,8)}`);
      });
      console.log('   ^ These might cause confusion in filtering!');
    } else {
      console.log('✅ No trips have both facility_id and user_id - data is clean');
    }
    
    // Check for orphan trips (neither facility_id nor user_id)
    const orphanTrips = allTrips?.filter(trip => !trip.facility_id && !trip.user_id) || [];
    if (orphanTrips.length > 0) {
      console.log(`⚠️  FOUND ${orphanTrips.length} orphan trips (no facility_id OR user_id):`);
      orphanTrips.forEach(trip => {
        console.log(`   - ${trip.id}: No user_id or facility_id`);
      });
    } else {
      console.log('✅ No orphan trips found');
    }
    
    // 6. Summary and diagnosis
    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('====================');
    console.log(`   Total trips in database: ${allTrips?.length || 0}`);
    console.log(`   Individual trips (facility_id IS NULL): ${individualTrips?.length || 0}`);
    console.log(`   Facility trips (facility_id NOT NULL): ${facilityTrips?.length || 0}`);
    console.log(`   Mixed trips (both fields set): ${mixedTrips.length}`);
    console.log(`   Orphan trips (neither field set): ${orphanTrips.length}`);
    
    if (individualTrips?.length === 0 && facilityTrips?.length > 0) {
      console.log('\n🚨 ISSUE FOUND: No individual trips exist in database');
      console.log('   The individual trips page should be empty, which is correct behavior.');
      console.log('   All trips appear to be facility trips.');
    } else if (mixedTrips.length > 0) {
      console.log('\n🚨 ISSUE FOUND: Data inconsistency - some trips have both facility_id and user_id');
      console.log('   These trips may be appearing incorrectly on the individual trips page.');
      console.log('   Recommendation: Clean up data or adjust filtering logic.');
    } else if (individualTrips?.length > 0) {
      console.log('\n✅ SYSTEM WORKING: Individual trips found and properly filtered');
      console.log('   The query logic is working correctly.');
    } else {
      console.log('\n✅ SYSTEM WORKING: No individual trips found');
      console.log('   This means all trips are facility trips, which is correct.');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugTripFiltering();
