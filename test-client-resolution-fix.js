#!/usr/bin/env node

// Test script to verify client name resolution fixes
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function testClientResolution() {
    console.log('🧪 TESTING CLIENT NAME RESOLUTION FIXES');
    console.log('======================================');
    
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Get recent trips with managed client IDs
        console.log('\n1️⃣ Fetching recent trips with managed clients...');
        
        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('id, managed_client_id, facility_id, pickup_address, created_at')
            .not('managed_client_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (tripsError) {
            console.error('❌ Error fetching trips:', tripsError.message);
            return;
        }
        
        console.log(`✅ Found ${trips.length} trips with managed clients`);
        
        if (trips.length === 0) {
            console.log('⚠️ No trips with managed client IDs found for testing');
            return;
        }

        // 2. Get unique managed client IDs
        const managedClientIds = [...new Set(trips.map(t => t.managed_client_id))];
        console.log(`\n2️⃣ Testing resolution for ${managedClientIds.length} unique managed client IDs:`);
        
        managedClientIds.forEach((id, index) => {
            console.log(`   ${index + 1}. ${id.slice(0, 8)}...`);
        });

        // 3. Test facility_managed_clients table
        console.log('\n3️⃣ Testing facility_managed_clients table...');
        
        const { data: facilityManagedClients, error: fmcError } = await supabase
            .from('facility_managed_clients')
            .select('id, first_name, last_name, phone_number, email')
            .in('id', managedClientIds);

        if (fmcError) {
            console.log('❌ facility_managed_clients error:', fmcError.message);
        } else {
            console.log(`✅ Found ${facilityManagedClients.length} records in facility_managed_clients`);
            facilityManagedClients.forEach((client, index) => {
                console.log(`   ${index + 1}. ${client.first_name} ${client.last_name} - ${client.phone_number || 'No phone'}`);
            });
        }

        // 4. Test managed_clients table as fallback
        console.log('\n4️⃣ Testing managed_clients table (fallback)...');
        
        const { data: managedClients, error: mcError } = await supabase
            .from('managed_clients')
            .select('id, first_name, last_name, phone_number, email')
            .in('id', managedClientIds);

        if (mcError) {
            console.log('❌ managed_clients error:', mcError.message);
        } else {
            console.log(`✅ Found ${managedClients.length} records in managed_clients`);
            managedClients.forEach((client, index) => {
                console.log(`   ${index + 1}. ${client.first_name || 'No first'} ${client.last_name || 'No last'} - ${client.phone_number || 'No phone'}`);
            });
        }

        // 5. Test enhanced trip query (similar to dispatcher app)
        console.log('\n5️⃣ Testing enhanced trip query...');
        
        const { data: enhancedTrips, error: enhancedError } = await supabase
            .from('trips')
            .select(`
                id,
                managed_client_id,
                facility_id,
                pickup_address,
                user_profile:profiles!trips_user_id_fkey(first_name, last_name, phone_number, email),
                facility:facilities(id, name, email, contact_email, phone_number, address, facility_type)
            `)
            .not('managed_client_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(3);

        if (enhancedError) {
            console.log('❌ Enhanced query error:', enhancedError.message);
        } else {
            console.log(`✅ Enhanced query returned ${enhancedTrips.length} trips`);
            
            // 6. Simulate client name resolution
            console.log('\n6️⃣ Simulating client name resolution...');
            
            for (const trip of enhancedTrips) {
                console.log(`\n   Trip ${trip.id.slice(0, 8)}:`);
                console.log(`   - Managed Client ID: ${trip.managed_client_id?.slice(0, 8) || 'None'}`);
                console.log(`   - Facility: ${trip.facility?.name || trip.facility?.contact_email || 'Unknown'}`);
                
                // Try to match with the fetched managed clients
                const matchedClient = facilityManagedClients?.find(c => c.id === trip.managed_client_id) ||
                                    managedClients?.find(c => c.id === trip.managed_client_id);
                
                if (matchedClient) {
                    const clientName = `${matchedClient.first_name} ${matchedClient.last_name} (Managed)`;
                    const clientPhone = matchedClient.phone_number;
                    console.log(`   ✅ RESOLVED: ${clientName} - ${clientPhone || 'No phone'}`);
                } else {
                    // Enhanced fallback logic
                    const location = extractLocationFromAddress(trip.pickup_address);
                    const shortId = trip.managed_client_id?.slice(0, 8) || 'unknown';
                    console.log(`   ⚠️ FALLBACK: ${location} Client (Managed) - ${shortId}`);
                }
            }
        }

        console.log('\n🎯 SUMMARY:');
        const totalResolved = (facilityManagedClients?.length || 0) + (managedClients?.length || 0);
        const totalIds = managedClientIds.length;
        console.log(`   - Total managed client IDs: ${totalIds}`);
        console.log(`   - Successfully resolved: ${totalResolved}`);
        console.log(`   - Resolution rate: ${Math.round((totalResolved / totalIds) * 100)}%`);

        if (totalResolved === 0) {
            console.log('\n❌ NO CLIENT NAMES RESOLVED - Need to add test data');
            console.log('💡 Next steps:');
            console.log('   1. Run facility app and create managed clients');
            console.log('   2. Or run: node add-test-managed-clients.js');
            console.log('   3. Check database permissions for dispatcher app');
        } else {
            console.log('\n✅ CLIENT RESOLUTION WORKING - Dispatcher should show proper names');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

function extractLocationFromAddress(address) {
    if (!address) return 'Unknown';
    
    const addressParts = address.split(',');
    const firstPart = addressParts[0];
    
    if (firstPart.includes('Blazer')) return 'Blazer District';
    if (firstPart.includes('Medical') || firstPart.includes('Hospital')) return 'Medical Center';
    if (firstPart.includes('Senior') || firstPart.includes('Care')) return 'Senior Care';
    if (firstPart.includes('Assisted')) return 'Assisted Living';
    if (firstPart.includes('Clinic')) return 'Clinic';
    
    return firstPart.replace(/^\d+\s+/, '').trim() || 'Facility';
}

// Run the test
testClientResolution();
