// Browser Console Verification Script
// Run this in the browser console on the dispatcher app dashboard
// to verify the foreign key relationship fix is working

console.log('🔧 VERIFYING FOREIGN KEY RELATIONSHIP FIX');
console.log('==========================================');

if (!window.supabase) {
  console.error('❌ Supabase not available. Make sure you\'re on the dispatcher app dashboard.');
} else {
  console.log('✅ Supabase client found. Testing query...\n');

  // Test the fixed query syntax
  window.supabase
    .from('trips')
    .select(`
      id,
      pickup_address,
      facility_id,
      user_id,
      user_profile:profiles(first_name, last_name),
      facility:facilities(id, name, contact_email)
    `)
    .order('created_at', { ascending: false })
    .limit(5)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Query failed:', error.message);
        console.log('⚠️ This means the foreign key fix may need additional work');
      } else {
        console.log(`✅ Query succeeded! Found ${data.length} trips\n`);
        
        let facilitiesWithNames = 0;
        let facilitiesFound = 0;
        
        data.forEach((trip, index) => {
          const facilityDisplay = trip.facility?.name || 
                                  (trip.facility_id ? `Facility ${trip.facility_id.substring(0, 8)}` : 'No facility');
          const clientDisplay = trip.user_profile ? 
                                `${trip.user_profile.first_name} ${trip.user_profile.last_name}` : 
                                'No client';
          const pickupShort = trip.pickup_address?.substring(0, 40) + '...';
          
          console.log(`${index + 1}. 🏥 ${facilityDisplay}`);
          console.log(`   👤 ${clientDisplay}`);
          console.log(`   📍 ${pickupShort}\n`);
          
          if (trip.facility) facilitiesFound++;
          if (trip.facility?.name && trip.facility.name !== trip.facility.id) facilitiesWithNames++;
        });
        
        console.log('📊 RESULTS SUMMARY:');
        console.log(`   Trips analyzed: ${data.length}`);
        console.log(`   Trips with facility data: ${facilitiesFound}`);
        console.log(`   Facilities with actual names: ${facilitiesWithNames}`);
        
        if (facilitiesWithNames > 0) {
          console.log('\n🎉 SUCCESS: Foreign key relationship fix is working!');
          console.log('✅ Facility names are loading correctly');
          console.log('✅ You should see actual facility names instead of IDs');
        } else if (facilitiesFound > 0) {
          console.log('\n⚠️ PARTIAL: Facility data loading but names may be missing');
          console.log('💡 Check if facility records have proper name values');
        } else {
          console.log('\n❌ NO FACILITY DATA: The join may still have issues');
          console.log('💡 Check the query syntax and database relationships');
        }
        
        // Check specifically for FacilityGroupB
        const facilityGroupB = data.find(trip => trip.facility?.name === 'FacilityGroupB');
        if (facilityGroupB) {
          console.log('\n🎯 SPECIFIC SUCCESS: Found FacilityGroupB trip!');
          console.log('✅ The fix is working for the target facility');
        }
      }
    })
    .catch(err => {
      console.error('💥 Unexpected error:', err);
    });
}

console.log('\n📋 What to look for:');
console.log('✅ GOOD: "🏥 FacilityGroupB" or other actual facility names');
console.log('❌ BAD: "🏥 Facility e1b94bde" or similar ID-based names');
console.log('\nIf you see actual facility names, the fix is working! 🎉');
