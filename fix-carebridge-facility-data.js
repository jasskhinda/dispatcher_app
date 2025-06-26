/**
 * Fix CareBridge Living Facility Data
 * 
 * This script updates the CareBridge Living facility record with the correct
 * address and contact information to fix the facility overview page display.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjU3NDU4MiwiZXhwIjoyMDQ4MTUwNTgyfQ.7HejPGEE2Ev6VSVq8Bw3u91SgG-AwYXLOFB5lYJILY8';

async function fixCareBridgeFacilityData() {
    console.log('🔧 FIXING CAREBRIDGE LIVING FACILITY DATA');
    console.log('========================================');
    
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // First, let's find the CareBridge Living facility
        console.log('1️⃣ Finding CareBridge Living facility...');
        
        const { data: facilities, error: findError } = await supabase
            .from('facilities')
            .select('*')
            .eq('name', 'CareBridge Living');
        
        if (findError) {
            console.error('❌ Error finding facility:', findError);
            return;
        }
        
        if (!facilities || facilities.length === 0) {
            console.log('❌ CareBridge Living facility not found by name');
            
            // Try to find by ID pattern
            const { data: allFacilities, error: allError } = await supabase
                .from('facilities')
                .select('*')
                .limit(10);
            
            if (allError) {
                console.error('❌ Error fetching all facilities:', allError);
                return;
            }
            
            console.log('\nAvailable facilities:');
            allFacilities.forEach(f => {
                console.log(`  - "${f.name}" (${f.id})`);
            });
            
            // Find the one that starts with e1b94bde
            const carebridge = allFacilities.find(f => f.id.startsWith('e1b94bde'));
            if (carebridge) {
                console.log(`\n✅ Found CareBridge facility by ID pattern: ${carebridge.id}`);
                await updateFacilityData(supabase, carebridge.id);
            } else {
                console.log('❌ No facility found with ID starting with e1b94bde');
            }
            return;
        }
        
        const carebridge = facilities[0];
        console.log(`✅ Found CareBridge Living: ${carebridge.id}`);
        console.log('Current data:');
        console.log(`   Name: ${carebridge.name}`);
        console.log(`   Address: ${carebridge.address || 'NULL'}`);
        console.log(`   Contact Email: ${carebridge.contact_email || 'NULL'}`);
        console.log(`   Phone: ${carebridge.phone_number || 'NULL'}`);
        console.log(`   Billing Email: ${carebridge.billing_email || 'NULL'}`);
        
        await updateFacilityData(supabase, carebridge.id);
        
    } catch (error) {
        console.error('💥 Script failed:', error);
    }
}

async function updateFacilityData(supabase, facilityId) {
    console.log('\n2️⃣ Updating facility data...');
    
    const updateData = {
        name: 'CareBridge Living',
        address: '5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017',
        contact_email: 'contact@carebridgeliving.com',
        billing_email: 'billing@carebridgeliving.com',
        phone_number: '(614) 555-0123',
        facility_type: 'Assisted Living'
    };
    
    console.log('Updating with data:');
    console.log(`   Name: ${updateData.name}`);
    console.log(`   Address: ${updateData.address}`);
    console.log(`   Contact Email: ${updateData.contact_email}`);
    console.log(`   Phone: ${updateData.phone_number}`);
    console.log(`   Billing Email: ${updateData.billing_email}`);
    
    const { data: updatedFacility, error: updateError } = await supabase
        .from('facilities')
        .update(updateData)
        .eq('id', facilityId)
        .select()
        .single();
    
    if (updateError) {
        console.error('❌ Error updating facility:', updateError);
        return;
    }
    
    console.log('\n✅ Facility updated successfully!');
    console.log('Updated data:');
    console.log(`   Name: ${updatedFacility.name}`);
    console.log(`   Address: ${updatedFacility.address}`);
    console.log(`   Contact Email: ${updatedFacility.contact_email}`);
    console.log(`   Phone: ${updatedFacility.phone_number}`);
    console.log(`   Billing Email: ${updatedFacility.billing_email}`);
    
    console.log('\n🎉 SUCCESS! The facility overview page should now show:');
    console.log('   ✅ "5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017" instead of "Address not available"');
    console.log('   ✅ "📧 contact@carebridgeliving.com" instead of "📧 Email not available"');
    console.log('\n🔄 Please refresh the facility overview page to see the changes.');
}

// Run the fix
fixCareBridgeFacilityData();
