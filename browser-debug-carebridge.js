/**
 * BROWSER CONSOLE SCRIPT - Run this on the dispatcher dashboard
 * 
 * Instructions:
 * 1. Go to: https://dispatch.compassionatecaretransportation.com/dashboard
 * 2. Open browser console (F12)
 * 3. Paste this entire script and press Enter
 */

async function debugCareBridgeFacility() {
    console.log('🔍 DEBUGGING CAREBRIDGE LIVING FACILITY NAME');
    console.log('===========================================');
    console.log('Expected: "🏥 CareBridge Living"');
    console.log('Current: "🏥 Facility e1b94bde"');
    console.log('');
    
    // Check if we're on the right page
    if (!window.location.hostname.includes('dispatch.compassionatecaretransportation.com')) {
        console.error('❌ Please run this script on the dispatcher dashboard page:');
        console.log('   https://dispatch.compassionatecaretransportation.com/dashboard');
        return;
    }
    
    try {
        // Create Supabase client
        const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
        
        const { createClient } = supabase;
        const client = createClient(supabaseUrl, supabaseKey);
        
        console.log('1️⃣ Looking for CareBridge Living facility...');
        
        // Find the facility with CareBridge Living name
        const { data: facilities, error: facilitiesError } = await client
            .from('facilities')
            .select('*')
            .eq('name', 'CareBridge Living');
            
        if (facilitiesError) {
            console.error('❌ Error fetching facilities:', facilitiesError);
            return;
        }
        
        if (!facilities || facilities.length === 0) {
            console.log('❌ No facility found with name "CareBridge Living"');
            console.log('   Checking all facilities...');
            
            const { data: allFacilities } = await client
                .from('facilities')
                .select('id, name')
                .limit(10);
                
            console.log('Available facilities:');
            allFacilities.forEach(f => {
                console.log(`   - "${f.name}" (ID: ${f.id.slice(0, 8)})`);
            });
            return;
        }
        
        const carebridge = facilities[0];
        console.log('✅ Found CareBridge Living:');
        console.log('   ID:', carebridge.id);
        console.log('   Name:', carebridge.name);
        console.log('   Contact:', carebridge.contact_email);
        
        console.log('');
        console.log('2️⃣ Checking trips for this facility...');
        
        const { data: trips, error: tripsError } = await client
            .from('trips')
            .select('id, facility_id, pickup_address, status, created_at')
            .eq('facility_id', carebridge.id)
            .order('created_at', { ascending: false })
            .limit(3);
            
        if (tripsError) {
            console.error('❌ Error fetching trips:', tripsError);
            return;
        }
        
        console.log(`Found ${trips.length} trips for CareBridge Living:`);
        trips.forEach((trip, index) => {
            console.log(`   ${index + 1}. ${trip.id.slice(0, 8)} - ${trip.status} - ${new Date(trip.created_at).toLocaleDateString()}`);
        });
        
        console.log('');
        console.log('3️⃣ Testing EXACT dispatcher query...');
        
        // This is the EXACT query from WorkingDashboard.js
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
            console.error('❌ DISPATCHER QUERY FAILED:', dispatcherError);
            console.log('   This explains why facility name is not showing!');
            console.log('   Error details:', JSON.stringify(dispatcherError, null, 2));
            return;
        }
        
        console.log(`✅ Dispatcher query works! Found ${dispatcherTrips.length} trips:`);
        
        dispatcherTrips.forEach((trip, index) => {
            console.log(`   Trip ${index + 1}: ${trip.id.slice(0, 8)}`);
            console.log(`     Facility ID: ${trip.facility_id}`);
            console.log(`     Facility Data:`, trip.facility);
            
            if (trip.facility?.name === 'CareBridge Living') {
                console.log('     ✅ FACILITY NAME IS CORRECT!');
            } else if (trip.facility?.name) {
                console.log(`     ⚠️ Facility name is: "${trip.facility.name}"`);
            } else {
                console.log('     ❌ NO FACILITY NAME FOUND');
            }
        });
        
        console.log('');
        console.log('4️⃣ Simulating display logic...');
        
        if (dispatcherTrips.length > 0) {
            const trip = dispatcherTrips[0];
            let displayResult = '';
            
            if (trip.facility) {
                if (trip.facility.name) {
                    displayResult = `🏥 ${trip.facility.name}`;
                    console.log('✅ Should display:', displayResult);
                } else if (trip.facility.contact_email) {
                    displayResult = `🏥 ${trip.facility.contact_email}`;
                    console.log('⚠️ Would fallback to:', displayResult);
                } else {
                    displayResult = `🏥 Facility ${trip.facility_id.slice(0, 8)}`;
                    console.log('❌ Would show ID fallback:', displayResult);
                }
            } else {
                displayResult = `🏥 Facility ${trip.facility_id.slice(0, 8)}`;
                console.log('❌ No facility data, showing:', displayResult);
            }
        }
        
        console.log('');
        console.log('5️⃣ Checking what the current page shows...');
        
        // Try to find facility display elements on the page
        const facilityElements = document.querySelectorAll('[data-testid*="facility"], .facility, *:contains("🏥")');
        console.log(`Found ${facilityElements.length} potential facility display elements on page`);
        
        // Look for the specific problematic text
        const bodyText = document.body.innerText;
        if (bodyText.includes('Facility e1b94bde')) {
            console.log('❌ CONFIRMED: Page still shows "Facility e1b94bde"');
        }
        if (bodyText.includes('CareBridge Living')) {
            console.log('✅ GOOD: Page shows "CareBridge Living"');
        }
        
        console.log('');
        console.log('🎯 CONCLUSION:');
        
        if (dispatcherTrips.length > 0 && dispatcherTrips[0].facility?.name === 'CareBridge Living') {
            console.log('✅ DATABASE IS PERFECT: CareBridge Living is stored and queryable correctly');
            console.log('❌ FRONTEND CACHING: The dispatcher app is not using the latest data');
            console.log('');
            console.log('🔧 SOLUTIONS TO TRY:');
            console.log('   1. Hard refresh this page (Cmd+Shift+R or Ctrl+Shift+R)');
            console.log('   2. Clear browser cache completely');
            console.log('   3. Open an incognito/private window');
            console.log('   4. Wait for the app to auto-deploy latest changes');
        } else {
            console.log('❌ DATABASE ISSUE: Query is failing or data is inconsistent');
            console.log('   Need to check database relationships and RLS policies');
        }
        
        console.log('');
        console.log('🚀 NEXT: Try refreshing the page and running this script again');
        
    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

// Auto-run the debugging
debugCareBridgeFacility();
