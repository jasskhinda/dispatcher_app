/**
 * Check the actual facility data in the database to see what information we have
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFacilityData() {
    console.log('🔍 CHECKING FACILITY DATA FOR CAREBRIDGE LIVING');
    console.log('==============================================');
    
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // Try to get the specific facility
    console.log('1️⃣ Looking for specific facility ID:', facilityId);
    const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', facilityId)
        .single();
    
    if (facilityError) {
        console.error('❌ Error fetching facility:', facilityError);
        
        // Try to find all facilities
        console.log('\n2️⃣ Looking for all facilities...');
        const { data: allFacilities, error: allError } = await supabase
            .from('facilities')
            .select('*')
            .limit(10);
        
        if (allError) {
            console.error('❌ Error fetching all facilities:', allError);
        } else {
            console.log(`Found ${allFacilities.length} facilities:`);
            allFacilities.forEach((f, i) => {
                console.log(`   ${i+1}. "${f.name}" (ID: ${f.id})`);
                if (f.id.startsWith('e1b94bde')) {
                    console.log('      ⭐ THIS MATCHES THE TARGET FACILITY!');
                }
            });
        }
    } else {
        console.log('✅ Found facility:');
        console.log('   ID:', facility.id);
        console.log('   Name:', facility.name);
        console.log('   Address:', facility.address);
        console.log('   Phone:', facility.phone_number);
        console.log('   Contact Email:', facility.contact_email);
        console.log('   Billing Email:', facility.billing_email);
        console.log('   Facility Type:', facility.facility_type);
        
        console.log('\n🎯 RECOMMENDED INVOICE DISPLAY:');
        console.log('Facility Name:', facility.name || 'CareBridge Living');
        console.log('Address:', facility.address || '123 Main Street, Your City, State 12345');
        console.log('Phone:', facility.phone_number || '(555) 123-4567');
        console.log('Contact Email:', facility.contact_email || 'contact@CareBridgeLiving.com');
        console.log('Billing Email:', facility.billing_email || 'billing@CareBridgeLiving.com');
    }
}

checkFacilityData().catch(console.error);
