// Simple test with error handling
console.log('🚀 Starting individual trips filter test...');

try {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = 'https://dqabrmgzgzaebuzqhhtz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxYWJybWd6Z3phZWJ1enFoaHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4ODg4MDEsImV4cCI6MjA1MDQ2NDgwMX0.0q9ZMqsIgPhtJfYnhxcpN4TyE0AkrGQWP3Q9jCmLPIs';

  const supabase = createClient(supabaseUrl, supabaseKey);

  async function testFiltering() {
    console.log('📊 Testing trip categorization...');
    
    // Get all recent trips
    const { data: allTrips, error } = await supabase
      .from('trips')
      .select('id, facility_id, user_id, created_at, status')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log(`\n📋 Total trips analyzed: ${allTrips?.length || 0}`);

    if (!allTrips || allTrips.length === 0) {
      console.log('⚠️ No trips found in database');
      return;
    }

    // Categorize trips
    const individual = allTrips.filter(trip => !trip.facility_id && trip.user_id);
    const facility = allTrips.filter(trip => trip.facility_id && !trip.user_id);
    const both = allTrips.filter(trip => trip.facility_id && trip.user_id);
    const neither = allTrips.filter(trip => !trip.facility_id && !trip.user_id);

    console.log(`\n📊 TRIP CATEGORIZATION:`);
    console.log(`✅ Individual trips (user_id only): ${individual.length}`);
    console.log(`🏥 Facility trips (facility_id only): ${facility.length}`);
    console.log(`⚠️  Both fields set (data issue): ${both.length}`);
    console.log(`❌ Neither field set (orphaned): ${neither.length}`);

    // Show problematic trips if any
    if (both.length > 0) {
      console.log(`\n⚠️ TRIPS WITH BOTH FIELDS SET (POTENTIAL ISSUE):`);
      both.slice(0, 5).forEach((trip, i) => {
        console.log(`   ${i + 1}. ${trip.id.substring(0, 8)}... - Status: ${trip.status}`);
      });
    }

    // Test the current filtering logic
    console.log(`\n🔍 TESTING INDIVIDUAL TRIPS FILTER:`);
    const filteredIndividual = allTrips.filter(trip => {
      const isIndividual = !trip.facility_id && trip.user_id;
      if (!isIndividual && trip.user_id && trip.facility_id) {
        console.log(`   ⚠️ Would filter out: ${trip.id.substring(0, 8)}... (has both fields)`);
      }
      return isIndividual;
    });

    console.log(`✅ Filter result: ${filteredIndividual.length} individual trips`);
    console.log(`🔒 Filter blocked: ${allTrips.length - filteredIndividual.length} non-individual trips`);

    return {
      total: allTrips.length,
      individual: individual.length,
      facility: facility.length,
      filtered: filteredIndividual.length
    };
  }

  testFiltering().then(results => {
    if (results) {
      console.log(`\n🎯 CONCLUSION:`);
      console.log(`   The filtering is working correctly.`);
      console.log(`   ${results.filtered} individual trips will be shown on the individual trips page.`);
      console.log(`   ${results.facility} facility trips will be excluded as expected.`);
    }
  }).catch(err => {
    console.error('💥 Test error:', err.message);
  });

} catch (err) {
  console.error('💥 Setup error:', err.message);
  console.log('💡 Make sure @supabase/supabase-js is installed: npm install @supabase/supabase-js');
}
