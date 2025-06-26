// Comprehensive Trip Filtering Diagnosis
// This script will analyze the actual trip data to identify why facility trips
// might be appearing on the individual trips page

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensiveDiagnosis() {
  try {
    console.log('🔍 COMPREHENSIVE TRIP FILTERING DIAGNOSIS');
    console.log('=========================================\n');

    // 1. Get overall trip statistics
    console.log('1️⃣ Overall Trip Statistics');
    console.log('---------------------------');
    
    const { data: allTrips, error: allError } = await supabase
      .from('trips')
      .select('id, facility_id, user_id, created_at, pickup_address, status')
      .order('created_at', { ascending: false })
      .limit(100);

    if (allError) {
      console.error('❌ Error fetching trips:', allError);
      return;
    }

    console.log(`📊 Total recent trips analyzed: ${allTrips.length}`);

    // 2. Categorize trips by facility_id and user_id presence
    console.log('\n2️⃣ Trip Categorization Analysis');
    console.log('--------------------------------');

    const categories = {
      facilityOnly: allTrips.filter(trip => trip.facility_id && !trip.user_id),
      userOnly: allTrips.filter(trip => !trip.facility_id && trip.user_id),
      both: allTrips.filter(trip => trip.facility_id && trip.user_id),
      neither: allTrips.filter(trip => !trip.facility_id && !trip.user_id)
    };

    console.log(`🏥 Facility only (facility_id ✓, user_id ✗): ${categories.facilityOnly.length} trips`);
    console.log(`👤 User only (facility_id ✗, user_id ✓): ${categories.userOnly.length} trips`);
    console.log(`⚠️  BOTH (facility_id ✓, user_id ✓): ${categories.both.length} trips`);
    console.log(`❌ Neither (facility_id ✗, user_id ✗): ${categories.neither.length} trips`);

    // 3. Test the exact individual trips query
    console.log('\n3️⃣ Individual Trips Query Test');
    console.log('-------------------------------');

    const { data: individualTrips, error: individualError } = await supabase
      .from('trips')
      .select('id, facility_id, user_id, created_at, pickup_address, status')
      .is('facility_id', null)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (individualError) {
      console.error('❌ Individual trips query error:', individualError);
    } else {
      console.log(`✅ Individual trips query returned: ${individualTrips.length} trips`);
      
      // Check if any have facility_id (shouldn't happen)
      const wrongTrips = individualTrips.filter(trip => trip.facility_id);
      if (wrongTrips.length > 0) {
        console.log(`❌ PROBLEM: ${wrongTrips.length} trips with facility_id in individual results!`);
        wrongTrips.forEach(trip => {
          console.log(`   - Trip ${trip.id}: facility_id=${trip.facility_id}, user_id=${trip.user_id}`);
        });
      } else {
        console.log('✅ GOOD: No facility trips in individual results');
      }
    }

    // 4. Test the exact facility trips query
    console.log('\n4️⃣ Facility Trips Query Test');
    console.log('-----------------------------');

    const { data: facilityTrips, error: facilityError } = await supabase
      .from('trips')
      .select('id, facility_id, user_id, created_at, pickup_address, status')
      .not('facility_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (facilityError) {
      console.error('❌ Facility trips query error:', facilityError);
    } else {
      console.log(`✅ Facility trips query returned: ${facilityTrips.length} trips`);
    }

    // 5. Analyze the problematic trips (both facility_id and user_id)
    if (categories.both.length > 0) {
      console.log('\n5️⃣ PROBLEMATIC TRIPS ANALYSIS');
      console.log('------------------------------');
      console.log(`⚠️  Found ${categories.both.length} trips with BOTH facility_id AND user_id`);
      console.log('These trips might appear on both pages, causing confusion.\n');

      console.log('Sample problematic trips:');
      categories.both.slice(0, 5).forEach((trip, index) => {
        console.log(`${index + 1}. Trip ID: ${trip.id}`);
        console.log(`   Facility ID: ${trip.facility_id}`);
        console.log(`   User ID: ${trip.user_id}`);
        console.log(`   Status: ${trip.status}`);
        console.log(`   Pickup: ${trip.pickup_address?.substring(0, 50)}...`);
        console.log(`   Created: ${new Date(trip.created_at).toLocaleDateString()}\n`);
      });
    }

    // 6. Summary and recommendations
    console.log('\n6️⃣ DIAGNOSIS SUMMARY');
    console.log('=====================');

    if (categories.both.length > 0) {
      console.log('❌ ISSUE IDENTIFIED: Data inconsistency');
      console.log(`   ${categories.both.length} trips have both facility_id AND user_id`);
      console.log('   This violates the expected data model where trips should be either:');
      console.log('   - Individual trips (user_id only)');
      console.log('   - Facility trips (facility_id only)\n');
      
      console.log('🔧 RECOMMENDED FIXES:');
      console.log('   1. Clean up data: Decide whether each trip is individual or facility');
      console.log('   2. Add stricter filtering to individual page to exclude any trip with facility_id');
      console.log('   3. Add data validation to prevent future dual assignments\n');
      
      console.log('💡 IMMEDIATE SOLUTION:');
      console.log('   Update individual trips query to be more explicit:');
      console.log('   .is("facility_id", null)');
      console.log('   .not("user_id", "is", null)');
      console.log('   // This should already exclude facility trips');
    } else {
      console.log('✅ NO DATA ISSUES FOUND');
      console.log('   Trip categorization is clean - no overlapping data');
      console.log('   The issue might be elsewhere (caching, deployment, etc.)');
    }

    // 7. Check recent trips to see what's actually being created
    console.log('\n7️⃣ RECENT TRIP CREATION ANALYSIS');
    console.log('---------------------------------');
    
    const recentTrips = allTrips.slice(0, 10);
    console.log('Most recent 10 trips:');
    recentTrips.forEach((trip, index) => {
      const type = trip.facility_id && trip.user_id ? 'BOTH' :
                   trip.facility_id ? 'FACILITY' :
                   trip.user_id ? 'INDIVIDUAL' : 'NEITHER';
      console.log(`${index + 1}. ${type} - Created: ${new Date(trip.created_at).toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

comprehensiveDiagnosis();
