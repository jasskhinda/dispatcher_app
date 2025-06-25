/**
 * Browser Console Script to Check and Fix Facility Name
 * 
 * Instructions:
 * 1. Open https://facility.compassionatecaretransportation.com/dashboard/facility-settings
 * 2. Press F12 to open browser console
 * 3. Paste this entire script and press Enter
 * 4. Follow the instructions in the console output
 */

async function checkAndFixFacilityName() {
    console.log('🔍 FACILITY NAME DIAGNOSTIC TOOL');
    console.log('===============================');
    console.log('');
    
    // Check if we have Supabase available in the browser context
    if (typeof window === 'undefined' || !window.location.hostname.includes('facility.compassionatecaretransportation.com')) {
        console.error('❌ This script must be run on the facility app page');
        console.log('   Go to: https://facility.compassionatecaretransportation.com/dashboard/facility-settings');
        return;
    }
    
    try {
        // Get the Supabase client from the page context
        const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
        
        // Create Supabase client
        const { createClient } = supabase;
        const client = createClient(supabaseUrl, supabaseKey);
        
        console.log('1️⃣ Checking current session...');
        const { data: { session } } = await client.auth.getSession();
        
        if (!session) {
            console.error('❌ No active session found. Please log in first.');
            return;
        }
        
        console.log('✅ Session found for user:', session.user.email);
        
        console.log('2️⃣ Getting user profile...');
        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('role, facility_id')
            .eq('id', session.user.id)
            .single();
            
        if (profileError) {
            console.error('❌ Error getting profile:', profileError);
            return;
        }
        
        if (profile.role !== 'facility') {
            console.error('❌ User is not a facility user. Role:', profile.role);
            return;
        }
        
        if (!profile.facility_id) {
            console.error('❌ No facility_id associated with this user');
            return;
        }
        
        console.log('✅ User is facility admin for facility ID:', profile.facility_id);
        
        console.log('3️⃣ Checking current facility data...');
        const { data: facility, error: facilityError } = await client
            .from('facilities')
            .select('*')
            .eq('id', profile.facility_id)
            .single();
            
        if (facilityError) {
            console.error('❌ Error getting facility:', facilityError);
            return;
        }
        
        console.log('🏥 Current facility data:');
        console.log('   ID:', facility.id);
        console.log('   Name:', facility.name || '(EMPTY/NULL)');
        console.log('   Contact Email:', facility.contact_email || '(EMPTY/NULL)');
        console.log('   Phone:', facility.phone_number || '(EMPTY/NULL)');
        console.log('   Address:', facility.address || '(EMPTY/NULL)');
        console.log('');
        
        // Check if name is already "FacilityGroupB"
        if (facility.name === 'FacilityGroupB') {
            console.log('✅ GREAT! Facility name is already set to "FacilityGroupB"');
            console.log('');
            console.log('🔍 The issue might be elsewhere. Let\'s check the dispatcher query...');
            
            // Test the dispatcher query
            console.log('4️⃣ Testing dispatcher app query...');
            const { data: trips, error: tripsError } = await client
                .from('trips')
                .select(`
                    id,
                    facility_id,
                    pickup_address,
                    facility:facilities(id, name, contact_email, phone_number)
                `)
                .eq('facility_id', facility.id)
                .limit(2);
                
            if (tripsError) {
                console.error('❌ Dispatcher query failed:', tripsError);
                console.log('');
                console.log('🔧 SOLUTION: There\'s a database query issue');
                console.log('   The dispatcher app query is failing to join facility data');
            } else {
                console.log(`✅ Dispatcher query works! Found ${trips.length} trips with facility data`);
                if (trips.length > 0) {
                    console.log('   Sample facility data:', trips[0].facility);
                }
                console.log('');
                console.log('💭 If the dispatcher still shows "Facility e1b94bde", try:');
                console.log('   1. Hard refresh the dispatcher app (Ctrl+Shift+R)');
                console.log('   2. Clear browser cache');
                console.log('   3. Wait a few minutes for data to propagate');
            }
            
        } else {
            console.log('❌ PROBLEM FOUND: Facility name is not "FacilityGroupB"');
            console.log(`   Current: "${facility.name || '(null/empty)'}"`);
            console.log(`   Expected: "FacilityGroupB"`);
            console.log('');
            
            // Option to auto-fix
            console.log('🔧 AUTOMATIC FIX AVAILABLE');
            console.log('   Would you like to automatically update the facility name?');
            console.log('');
            console.log('   To fix automatically, run:');
            console.log('   fixFacilityName()');
            console.log('');
            console.log('   Or manually:');
            console.log('   1. Fill in "Facility Name" field with: FacilityGroupB');
            console.log('   2. Click "Save Settings"');
            
            // Create a global function for fixing
            window.fixFacilityName = async () => {
                console.log('🔧 Updating facility name to "FacilityGroupB"...');
                
                const { error: updateError } = await client
                    .from('facilities')
                    .update({ name: 'FacilityGroupB' })
                    .eq('id', facility.id);
                    
                if (updateError) {
                    console.error('❌ Failed to update facility name:', updateError);
                } else {
                    console.log('✅ SUCCESS! Facility name updated to "FacilityGroupB"');
                    console.log('');
                    console.log('🎉 Next steps:');
                    console.log('   1. Refresh this page to see the change');
                    console.log('   2. Go to dispatcher app and hard refresh');
                    console.log('   3. Check if trips now show "🏥 FacilityGroupB"');
                    
                    // Auto-refresh the page
                    setTimeout(() => {
                        console.log('🔄 Auto-refreshing page in 3 seconds...');
                        setTimeout(() => location.reload(), 3000);
                    }, 2000);
                }
            };
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Auto-run the diagnostic
checkAndFixFacilityName();
