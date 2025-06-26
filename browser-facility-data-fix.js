/**
 * Browser Console Script - Run this in the browser console on the facility monthly invoice page
 * to check and fix the facility data
 */

// Browser-safe facility data checker and updater
async function checkAndUpdateFacilityData() {
    console.log('🔍 CHECKING FACILITY DATA FOR INVOICE');
    console.log('====================================');
    
    // Check if we're on the right page
    if (!window.location.pathname.includes('/invoice/facility-monthly/')) {
        console.error('❌ Please run this on the facility monthly invoice page');
        return;
    }
    
    // Extract facility ID from URL
    const urlParts = window.location.pathname.split('/');
    const facilityMonth = urlParts[urlParts.length - 1];
    const facilityId = facilityMonth.split('-').slice(0, -2).join('-');
    
    console.log('📍 Facility ID from URL:', facilityId);
    
    // Get Supabase client (assuming it's available globally)
    let supabase;
    try {
        // Try to get supabase from window or create it
        if (window.supabase) {
            supabase = window.supabase;
        } else {
            console.log('⚠️ Supabase client not found in window');
            return;
        }
        
        console.log('✅ Supabase client available');
        
        // Query the facility
        console.log('🔍 Querying facility data...');
        const { data: facility, error } = await supabase
            .from('facilities')
            .select('*')
            .eq('id', facilityId)
            .single();
        
        if (error) {
            console.error('❌ Error querying facility:', error);
            
            // Try to get all facilities to see what's available
            const { data: allFacilities } = await supabase
                .from('facilities')
                .select('id, name')
                .limit(10);
            
            console.log('Available facilities:');
            allFacilities?.forEach(f => {
                console.log(`   - "${f.name}" (${f.id})`);
            });
            
            return;
        }
        
        console.log('✅ Current facility data:');
        console.log('   Name:', facility.name || 'NULL');
        console.log('   Address:', facility.address || 'NULL');
        console.log('   Phone:', facility.phone_number || 'NULL');
        console.log('   Contact Email:', facility.contact_email || 'NULL');
        console.log('   Billing Email:', facility.billing_email || 'NULL');
        
        // Check if data needs updating
        const needsUpdate = !facility.name || 
                           !facility.address || 
                           !facility.phone_number || 
                           !facility.contact_email || 
                           !facility.billing_email;
        
        if (needsUpdate) {
            console.log('\n🔧 UPDATING FACILITY DATA...');
            
            const updateData = {
                name: facility.name || 'CareBridge Living',
                address: facility.address || '123 Main Street, Your City, State 12345',
                phone_number: facility.phone_number || '(555) 123-4567',
                contact_email: facility.contact_email || 'contact@CareBridgeLiving.com',
                billing_email: facility.billing_email || 'billing@CareBridgeLiving.com',
                facility_type: facility.facility_type || 'Nursing Home'
            };
            
            const { data: updatedFacility, error: updateError } = await supabase
                .from('facilities')
                .update(updateData)
                .eq('id', facilityId)
                .select()
                .single();
            
            if (updateError) {
                console.error('❌ Error updating facility:', updateError);
            } else {
                console.log('✅ Facility updated successfully:');
                console.log('   Name:', updatedFacility.name);
                console.log('   Address:', updatedFacility.address);
                console.log('   Phone:', updatedFacility.phone_number);
                console.log('   Contact Email:', updatedFacility.contact_email);
                console.log('   Billing Email:', updatedFacility.billing_email);
                
                console.log('\n🔄 Please refresh the page to see the updated facility information');
            }
        } else {
            console.log('\n✅ Facility data looks complete - no update needed');
            console.log('🔄 If the invoice still shows incorrect data, try refreshing the page');
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

// Run the check
checkAndUpdateFacilityData();
