/**
 * CAREBRIDGE LIVING FACILITY NAME FIX
 * This script will diagnose and fix the facility name display issue
 */

console.log('🔧 CAREBRIDGE LIVING FACILITY NAME DIAGNOSTIC & FIX');
console.log('==================================================');

// Test if the exact browser debugging works
async function diagnoseCarebrideIssue() {
    try {
        // Use the global supabase from the app
        const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
        
        // Import or use existing supabase client
        let client;
        if (typeof window !== 'undefined' && window.supabase) {
            const { createClient } = window.supabase;
            client = createClient(supabaseUrl, supabaseKey);
        } else {
            console.log('❌ Supabase not available in browser');
            return;
        }
        
        console.log('1️⃣ Finding CareBridge Living facility...');
        
        // Step 1: Find the CareBridge Living facility
        const { data: facilities, error: facilityError } = await client
            .from('facilities')
            .select('*')
            .eq('name', 'CareBridge Living');
            
        if (facilityError) {
            console.error('❌ Failed to fetch facilities:', facilityError);
            return;
        }
        
        if (!facilities || facilities.length === 0) {
            console.log('❌ CareBridge Living facility not found');
            return;
        }
        
        const carebridge = facilities[0];
        console.log('✅ Found CareBridge Living:', carebridge.id);
        
        console.log('');
        console.log('2️⃣ Testing dispatcher query for this facility...');
        
        // Step 2: Test the exact dispatcher query
        const { data: dispatcherTrips, error: dispatcherError } = await client
            .from('trips')
            .select(`
                *,
                user_profile:profiles(first_name, last_name, phone_number),
                facility:facilities(id, name, contact_email, phone_number)
            `)
            .eq('facility_id', carebridge.id)
            .order('created_at', { ascending: false })
            .limit(3);
            
        if (dispatcherError) {
            console.error('❌ Dispatcher query failed:', dispatcherError);
            console.log('');
            console.log('🔧 TRYING FALLBACK QUERY...');
            
            // Fallback: Try without JOIN
            const { data: basicTrips, error: basicError } = await client
                .from('trips')
                .select('*')
                .eq('facility_id', carebridge.id)
                .limit(3);
                
            if (!basicError && basicTrips?.length > 0) {
                console.log('✅ Basic query works - JOIN is the problem');
                console.log('🔧 SOLUTION: Fix foreign key relationship or RLS policies');
                
                // Manually add facility data
                const enhancedTrips = basicTrips.map(trip => ({
                    ...trip,
                    facility: {
                        id: carebridge.id,
                        name: carebridge.name,
                        contact_email: carebridge.contact_email,
                        phone_number: carebridge.phone_number
                    }
                }));
                
                console.log('✅ Manual enhancement works:');
                enhancedTrips.forEach((trip, index) => {
                    console.log(`   Trip ${index + 1}: Would show "🏥 ${trip.facility.name}"`);
                });
                
                return { issue: 'JOIN_FAILURE', solution: 'Fix database relationships' };
            } else {
                console.log('❌ No trips found for this facility');
                return { issue: 'NO_TRIPS', solution: 'Create test trip' };
            }
        }
        
        console.log(`✅ Found ${dispatcherTrips.length} trips for CareBridge Living`);
        
        // Step 3: Test what would be displayed
        dispatcherTrips.forEach((trip, index) => {
            console.log(`');
            console.log(`Trip ${index + 1}:`);
            console.log(`   ID: ${trip.id.slice(0, 8)}`);
            console.log(`   Facility Data:`, trip.facility);
            
            let displayResult = '';
            if (trip.facility?.name) {
                displayResult = `🏥 ${trip.facility.name}`;
                console.log(`   ✅ CORRECT: Would display "${displayResult}"`);
            } else if (trip.facility?.contact_email) {
                displayResult = `🏥 ${trip.facility.contact_email}`;
                console.log(`   ⚠️ FALLBACK: Would display "${displayResult}"`);
            } else {
                displayResult = `🏥 Facility ${trip.facility_id.slice(0, 8)}`;
                console.log(`   ❌ ERROR: Would display "${displayResult}"`);
            }
        });
        
        // Step 4: Check if the page shows the correct data
        console.log('');
        console.log('3️⃣ Checking current page display...');
        
        const pageText = document.body.innerText;
        if (pageText.includes('🏥 CareBridge Living')) {
            console.log('✅ Page already shows "🏥 CareBridge Living" - Issue resolved!');
            return { issue: 'RESOLVED', solution: 'Already working' };
        } else if (pageText.includes('🏥 Facility e1b94bde')) {
            console.log('❌ Page still shows "🏥 Facility e1b94bde"');
            console.log('🔧 ISSUE: Frontend cache or display logic problem');
            return { issue: 'DISPLAY_CACHE', solution: 'Force frontend refresh' };
        } else {
            console.log('ℹ️ CareBridge Living trips not visible on current page');
            return { issue: 'NOT_VISIBLE', solution: 'Check if trips are on page' };
        }
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
        return { issue: 'DIAGNOSTIC_FAILED', error: error.message };
    }
}

// Run the diagnostic
diagnoseCarebrideIssue().then(result => {
    console.log('');
    console.log('🎯 FINAL RESULT:', result);
    
    if (result?.issue === 'DISPLAY_CACHE') {
        console.log('');
        console.log('🔧 APPLYING CACHE FIX...');
        
        // Force clear cache and reload
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
        }
        
        console.log('✅ Cache cleared - reloading page...');
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    }
}).catch(error => {
    console.error('❌ Diagnostic error:', error);
});
