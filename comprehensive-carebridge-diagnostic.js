/**
 * COMPREHENSIVE CAREBRIDGE LIVING DIAGNOSTIC
 * Run this in browser console on the dispatcher dashboard
 * This will give us detailed information about what's happening
 */

async function comprehensiveCarebrdigeDiagnostic() {
    console.log('🔍 COMPREHENSIVE CAREBRIDGE LIVING DIAGNOSTIC');
    console.log('==============================================');
    console.log('Current URL:', window.location.href);
    console.log('Timestamp:', new Date().toISOString());
    console.log('');
    
    try {
        // Check if we're on the right page
        if (!window.location.href.includes('dispatch')) {
            console.error('❌ Please run this on the dispatcher dashboard');
            return;
        }
        
        // Load Supabase if not available
        if (typeof window.supabase === 'undefined') {
            console.log('📦 Loading Supabase...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                setTimeout(reject, 10000);
            });
        }
        
        const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';
        
        const { createClient } = window.supabase;
        const client = createClient(supabaseUrl, supabaseKey);
        
        console.log('✅ Supabase client ready');
        console.log('');
        
        // STEP 1: Verify CareBridge Living exists in database
        console.log('1️⃣ VERIFYING CAREBRIDGE LIVING IN DATABASE');
        console.log('------------------------------------------');
        
        const { data: facilities, error: facilitiesError } = await client
            .from('facilities')
            .select('*')
            .eq('name', 'CareBridge Living');
            
        if (facilitiesError) {
            console.error('❌ Error fetching facilities:', facilitiesError);
            return;
        }
        
        if (!facilities || facilities.length === 0) {
            console.log('❌ CareBridge Living not found in database!');
            
            // Show all facilities
            const { data: allFacilities } = await client
                .from('facilities')
                .select('id, name')
                .limit(10);
                
            console.log('Available facilities:');
            allFacilities?.forEach(f => {
                console.log(`   - "${f.name}" (${f.id.slice(0, 8)})`);
            });
            return;
        }
        
        const carebridge = facilities[0];
        console.log('✅ CareBridge Living found:');
        console.log(`   ID: ${carebridge.id}`);
        console.log(`   Name: "${carebridge.name}"`);
        console.log(`   Contact: ${carebridge.contact_email}`);
        console.log(`   Phone: ${carebridge.phone_number}`);
        console.log('');
        
        // STEP 2: Test the exact dispatcher main query
        console.log('2️⃣ TESTING DISPATCHER MAIN QUERY');
        console.log('----------------------------------');
        
        const { data: mainQueryTrips, error: mainQueryError } = await client
            .from('trips')
            .select(`
                *,
                user_profile:profiles(first_name, last_name, phone_number),
                facility:facilities(id, name, contact_email, phone_number)
            `)
            .eq('facility_id', carebridge.id)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (mainQueryError) {
            console.error('❌ Main query failed:', mainQueryError);
            console.log('   This means the JOIN is failing');
        } else {
            console.log(`✅ Main query succeeded - found ${mainQueryTrips.length} trips`);
            
            mainQueryTrips.forEach((trip, index) => {
                console.log(`   Trip ${index + 1}:`);
                console.log(`     ID: ${trip.id.slice(0, 8)}`);
                console.log(`     Facility ID: ${trip.facility_id.slice(0, 8)}`);
                console.log(`     Facility data:`, trip.facility);
                
                if (trip.facility?.name === 'CareBridge Living') {
                    console.log('     ✅ CORRECT: Has CareBridge Living name');
                } else {
                    console.log('     ❌ PROBLEM: Missing CareBridge Living name');
                }
            });
        }
        console.log('');
        
        // STEP 3: Test manual enhancement (fallback query)
        console.log('3️⃣ TESTING MANUAL ENHANCEMENT QUERY');
        console.log('------------------------------------');
        
        const { data: basicTrips, error: basicError } = await client
            .from('trips')
            .select('*')
            .eq('facility_id', carebridge.id)
            .limit(3);
            
        if (basicError) {
            console.error('❌ Basic query failed:', basicError);
        } else {
            console.log(`✅ Basic query succeeded - found ${basicTrips.length} trips`);
            
            // Simulate manual enhancement
            const { data: facilityData } = await client
                .from('facilities')
                .select('id, name, contact_email, phone_number')
                .eq('id', carebridge.id);
                
            const enhancedTrips = basicTrips.map(trip => ({
                ...trip,
                facility: facilityData?.[0] || null
            }));
            
            console.log('Manual enhancement result:');
            enhancedTrips.forEach((trip, index) => {
                console.log(`   Trip ${index + 1}:`);
                console.log(`     Enhanced facility:`, trip.facility);
                
                if (trip.facility?.name === 'CareBridge Living') {
                    console.log('     ✅ MANUAL ENHANCEMENT WORKS');
                } else {
                    console.log('     ❌ MANUAL ENHANCEMENT FAILED');
                }
            });
        }
        console.log('');
        
        // STEP 4: Check what's actually displayed on the page
        console.log('4️⃣ CHECKING CURRENT PAGE DISPLAY');
        console.log('----------------------------------');
        
        const pageText = document.body.innerText;
        
        if (pageText.includes('🏥 CareBridge Living')) {
            console.log('✅ Page shows "🏥 CareBridge Living" - WORKING!');
        } else if (pageText.includes('CareBridge Living')) {
            console.log('⚠️ Page shows "CareBridge Living" but not with 🏥 icon');
        } else if (pageText.includes('🏥 Facility e1b94bde')) {
            console.log('❌ Page shows "🏥 Facility e1b94bde" - NOT WORKING');
        } else if (pageText.includes('Facility e1b94bde')) {
            console.log('❌ Page shows "Facility e1b94bde" - NOT WORKING');
        } else {
            console.log('ℹ️ CareBridge Living content not found on page');
        }
        
        // Find facility display elements
        const facilityElements = Array.from(document.querySelectorAll('*'))
            .filter(el => el.textContent && el.textContent.includes('🏥'))
            .map(el => el.textContent.trim())
            .filter(text => text.includes('Facility') || text.includes('CareBridge'));
            
        if (facilityElements.length > 0) {
            console.log('🏥 Facility displays found on page:');
            facilityElements.forEach(text => {
                console.log(`   "${text}"`);
            });
        } else {
            console.log('ℹ️ No facility displays found on page');
        }
        console.log('');
        
        // STEP 5: Final diagnosis
        console.log('5️⃣ FINAL DIAGNOSIS');
        console.log('-------------------');
        
        if (mainQueryTrips && mainQueryTrips.length > 0 && mainQueryTrips[0].facility?.name === 'CareBridge Living') {
            if (pageText.includes('🏥 CareBridge Living')) {
                console.log('✅ EVERYTHING IS WORKING CORRECTLY!');
                console.log('   Database ✅ | Query ✅ | Display ✅');
            } else {
                console.log('❌ DATABASE IS CORRECT BUT PAGE NOT UPDATED');
                console.log('   Database ✅ | Query ✅ | Display ❌');
                console.log('🔧 SOLUTION: Hard refresh or cache issue');
            }
        } else if (enhancedTrips && enhancedTrips.length > 0 && enhancedTrips[0].facility?.name === 'CareBridge Living') {
            console.log('⚠️ MAIN QUERY FAILING BUT MANUAL ENHANCEMENT WORKS');
            console.log('   Database ✅ | Main Query ❌ | Fallback ✅');
            console.log('🔧 SOLUTION: Fix JOIN query or RLS policies');
        } else {
            console.log('❌ FUNDAMENTAL DATABASE OR QUERY ISSUE');
            console.log('   Database ? | Query ❌ | Display ❌');
            console.log('🔧 SOLUTION: Check database relationships and permissions');
        }
        
        console.log('');
        console.log('🎯 NEXT STEPS:');
        if (pageText.includes('🏥 Facility e1b94bde')) {
            console.log('1. Hard refresh this page (Cmd+Shift+R or Ctrl+Shift+R)');
            console.log('2. Open incognito/private window');
            console.log('3. Clear browser cache completely');
            console.log('4. Check console for enhanced debugging output');
        } else {
            console.log('1. Run this script again in 30 seconds');
            console.log('2. Check if trips for CareBridge Living exist');
            console.log('3. Verify the facility app is booking trips correctly');
        }
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
    }
}

// Auto-run the diagnostic
console.log('🚀 Starting CareBridge Living diagnostic...');
comprehensiveCarebrdigeDiagnostic();
