// One-time script to create the missing CareBridge Living facility record
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

// Use service role key for write operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMissingFacility() {
    console.log('🏥 CREATING MISSING CAREBRIDGE LIVING FACILITY RECORD');
    console.log('====================================================');
    
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    try {
        // First check if facility already exists
        console.log('🔍 Checking if facility already exists...');
        const { data: existingFacility, error: checkError } = await supabase
            .from('facilities')
            .select('id, name')
            .eq('id', facilityId)
            .single();
        
        if (existingFacility) {
            console.log('✅ Facility already exists:', existingFacility);
            return;
        }
        
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ Error checking facility:', checkError);
            return;
        }
        
        console.log('📝 Facility not found, creating new record...');
        
        // Create the facility record
        const facilityData = {
            id: facilityId,
            name: 'CareBridge Living',
            contact_email: 'admin@carebridge.com',
            billing_email: 'billing@carebridge.com',
            phone_number: '(416) 555-0199',
            address: '123 Care Bridge Drive, Toronto, ON M1A 1A1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data: newFacility, error: createError } = await supabase
            .from('facilities')
            .insert([facilityData])
            .select()
            .single();
        
        if (createError) {
            console.error('❌ Error creating facility:', createError);
            return;
        }
        
        console.log('✅ Successfully created facility:', newFacility);
        
        // Verify by checking trips with this facility_id
        console.log('🔍 Checking trips associated with this facility...');
        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('id, pickup_time, status')
            .eq('facility_id', facilityId)
            .limit(5);
        
        if (tripsError) {
            console.error('❌ Error checking trips:', tripsError);
        } else {
            console.log(`📊 Found ${trips.length} trips associated with this facility`);
            trips.forEach(trip => {
                console.log(`   - Trip ${trip.id}: ${trip.pickup_time} (${trip.status})`);
            });
        }
        
        console.log('');
        console.log('🎉 FACILITY CREATION COMPLETE!');
        console.log('The monthly invoice page should now work properly.');
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

// Run the facility creation
createMissingFacility();
