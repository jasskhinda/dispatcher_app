// URGENT FIX: Browser console script to verify facility data loading
// Copy and paste this into the browser console on the dispatcher app

console.log('🔍 VERIFYING FACILITY DATA LOADING...');
console.log('Database shows: FacilityGroupB ✅');
console.log('Dispatcher shows: Facility e1b94bde ❌');
console.log('');

// Check if the page has the supabase client
if (typeof window !== 'undefined' && window.supabase) {
  console.log('✅ Supabase client found');
  
  // Test the exact query the dispatcher app should use
  window.supabase
    .from('facilities')
    .select('id, name, contact_email, phone_number')
    .eq('id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3')
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Query failed:', error);
        console.log('This is why facility name shows as ID fallback!');
      } else {
        console.log('✅ Query successful:', data);
        console.log('Facility name should be:', data.name);
        if (data.name === 'FacilityGroupB') {
          console.log('🎉 Database query works! Issue is in the app logic.');
        }
      }
    });
} else {
  console.log('❌ Supabase client not found on this page');
  console.log('Make sure you\'re on the dispatcher dashboard page');
}

console.log('');
console.log('🔧 NEXT STEPS:');
console.log('1. Check console logs above');
console.log('2. If query fails: Database query needs fixing');
console.log('3. If query works: App logic needs debugging');
console.log('4. Hard refresh page (Cmd+Shift+R) after fixes deploy');
