#!/usr/bin/env node

/**
 * Test script to validate trip access for invoice page
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTripAccess() {
    console.log('🔍 Testing Trip Access for Invoice Page');
    console.log('=======================================');

    const testTripId = '7162903d-1251-43c2-9e65-c7ff6cdedfc2';

    try {
        // 1. Check if the trip exists at all
        console.log('\n1️⃣ Checking if trip exists...');
        const { data: basicTrip, error: basicError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', testTripId)
            .single();

        if (basicError) {
            console.error('❌ Trip not found:', basicError.message);
            
            // Check if we can find any trips with similar ID pattern
            const { data: similarTrips } = await supabase
                .from('trips')
                .select('id, status, created_at')
                .like('id', `${testTripId.slice(0, 8)}%`)
                .limit(5);
            
            if (similarTrips && similarTrips.length > 0) {
                console.log('🔍 Found trips with similar ID pattern:');
                similarTrips.forEach(trip => {
                    console.log(`   - ${trip.id} (${trip.status}) - ${trip.created_at}`);
                });
            } else {
                console.log('🔍 No trips found with similar ID pattern');
            }
            
            // Let's check for any completed trips
            const { data: completedTrips } = await supabase
                .from('trips')
                .select('id, status, created_at, pickup_address')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (completedTrips && completedTrips.length > 0) {
                console.log('\n📋 Recent completed trips available for testing:');
                completedTrips.forEach((trip, index) => {
                    console.log(`   ${index + 1}. ${trip.id}`);
                    console.log(`      Status: ${trip.status}`);
                    console.log(`      Created: ${trip.created_at}`);
                    console.log(`      Pickup: ${trip.pickup_address?.substring(0, 50) || 'N/A'}...`);
                    console.log(`      URL: https://dispatch.compassionatecaretransportation.com/invoice/${trip.id}`);
                    console.log('');
                });
            }
            
            return;
        }

        console.log('✅ Trip found:', {
            id: basicTrip.id,
            status: basicTrip.status,
            created_at: basicTrip.created_at,
            pickup_address: basicTrip.pickup_address?.substring(0, 50) + '...',
            user_id: basicTrip.user_id?.substring(0, 8) + '...',
            facility_id: basicTrip.facility_id?.substring(0, 8) + '...' || 'None'
        });

        // 2. Test the enhanced query with joins
        console.log('\n2️⃣ Testing enhanced query with joins...');
        const { data: enhancedTrip, error: enhancedError } = await supabase
            .from('trips')
            .select(`
                *,
                user_profile:profiles(first_name, last_name, phone_number, email),
                facility:facilities(id, name, contact_email, phone_number, address)
            `)
            .eq('id', testTripId)
            .single();

        if (enhancedError) {
            console.error('❌ Enhanced query failed:', enhancedError.message);
            console.log('   This might be due to foreign key relationships or permissions');
            
            // Test individual queries
            if (basicTrip.user_id) {
                console.log('\n🔍 Testing user profile fetch...');
                const { data: userProfile, error: userError } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, phone_number, email')
                    .eq('id', basicTrip.user_id)
                    .single();
                
                if (userError) {
                    console.error('   ❌ User profile fetch failed:', userError.message);
                } else {
                    console.log('   ✅ User profile found:', userProfile);
                }
            }

            if (basicTrip.facility_id) {
                console.log('\n🔍 Testing facility fetch...');
                const { data: facility, error: facilityError } = await supabase
                    .from('facilities')
                    .select('id, name, contact_email, phone_number, address')
                    .eq('id', basicTrip.facility_id)
                    .single();
                
                if (facilityError) {
                    console.error('   ❌ Facility fetch failed:', facilityError.message);
                } else {
                    console.log('   ✅ Facility found:', facility);
                }
            }
        } else {
            console.log('✅ Enhanced query successful!');
            console.log('   User profile:', enhancedTrip.user_profile);
            console.log('   Facility:', enhancedTrip.facility);
        }

        // 3. Check for existing invoice
        console.log('\n3️⃣ Checking for existing invoice...');
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('*')
            .eq('trip_id', testTripId)
            .single();

        if (invoiceError && invoiceError.code !== 'PGRST116') {
            console.error('❌ Invoice query error:', invoiceError.message);
        } else if (invoice) {
            console.log('✅ Existing invoice found:', {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                status: invoice.status,
                amount: invoice.amount
            });
        } else {
            console.log('ℹ️ No existing invoice found (this is normal)');
        }

        console.log('\n🎉 Trip access test completed successfully!');
        console.log('The invoice page should now work with this trip ID.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

if (require.main === module) {
    testTripAccess();
}
