#!/usr/bin/env node

// Comprehensive billing system test
// Tests the complete workflow from trip completion to invoice creation

console.log('🧪 BILLING SYSTEM COMPREHENSIVE TEST');
console.log('====================================');

async function testBillingSystem() {
    try {
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = 'https://iyzipkwwtzeymbklkwkf.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5emlwa3d3dHpleW1ia2xrd2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTk3MTkxMywiZXhwIjoyMDQ3NTQ3OTEzfQ.iX8VKmr4ftkWBp1aXRGUj0iqwhKfCCuIUXHVdZa_R98';
        
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('1️⃣ TESTING DATABASE SCHEMA');
        console.log('==========================');
        
        // Test invoices table structure
        console.log('\n📋 Checking invoices table schema...');
        const { data: invoicesSchema, error: schemaError } = await supabase
            .from('invoices')
            .select('*')
            .limit(1);
        
        if (schemaError) {
            console.error('❌ Invoices table error:', schemaError.message);
            console.log('   This indicates the table may not exist or has permissions issues');
        } else {
            console.log('✅ Invoices table accessible');
            if (invoicesSchema && invoicesSchema.length > 0) {
                console.log('   Columns:', Object.keys(invoicesSchema[0]));
            } else {
                console.log('   Table exists but is empty');
            }
        }

        console.log('\n2️⃣ TESTING TRIP DATA AVAILABILITY');
        console.log('==================================');
        
        // Check for completed trips that can be invoiced
        const { data: completedTrips, error: tripsError } = await supabase
            .from('trips')
            .select(`
                id,
                user_id,
                pickup_address,
                destination_address,
                pickup_time,
                price,
                status,
                invoice_id,
                profiles!user_id (
                    id,
                    first_name,
                    last_name,
                    email,
                    role
                )
            `)
            .eq('status', 'completed')
            .not('price', 'is', null)
            .gt('price', 0)
            .is('invoice_id', null)
            .limit(5);
        
        if (tripsError) {
            console.error('❌ Error fetching trips:', tripsError.message);
        } else {
            console.log(`✅ Found ${completedTrips?.length || 0} billable completed trips`);
            
            if (completedTrips && completedTrips.length > 0) {
                console.log('\n📊 Sample billable trips:');
                completedTrips.forEach(trip => {
                    const clientName = trip.profiles ? 
                        `${trip.profiles.first_name} ${trip.profiles.last_name}` : 
                        'Unknown Client';
                    console.log(`   • ${clientName}: $${trip.price} (${trip.pickup_address?.substring(0, 30)}...)`);
                });
            }
        }

        console.log('\n3️⃣ TESTING API ENDPOINTS');
        console.log('=========================');
        
        // Test invoice creation API (simulate POST request)
        if (completedTrips && completedTrips.length > 0) {
            const testTrip = completedTrips[0];
            console.log(`\n🧪 Testing invoice creation for trip ${testTrip.id}...`);
            
            // Generate test invoice data
            const testInvoiceData = {
                user_id: testTrip.user_id,
                trip_id: testTrip.id,
                amount: parseFloat(testTrip.price),
                description: `Transportation service: ${testTrip.pickup_address} → ${testTrip.destination_address}`,
                notes: 'Test invoice created by billing system validation'
            };

            console.log('📄 Test invoice data:', {
                client: testTrip.profiles ? `${testTrip.profiles.first_name} ${testTrip.profiles.last_name}` : 'Unknown',
                amount: testInvoiceData.amount,
                trip_date: new Date(testTrip.pickup_time).toLocaleDateString()
            });

            // Try to create invoice directly in database (simulating API behavior)
            try {
                // Generate invoice number
                const date = new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const invoice_number = `TEST-${year}${month}${day}-${random}`;
                
                const due_date = new Date();
                due_date.setDate(due_date.getDate() + 30);

                const { data: testInvoice, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        user_id: testInvoiceData.user_id,
                        trip_id: testInvoiceData.trip_id,
                        invoice_number,
                        amount: testInvoiceData.amount,
                        status: 'pending',
                        issue_date: new Date().toISOString(),
                        due_date: due_date.toISOString(),
                        description: testInvoiceData.description,
                        notes: testInvoiceData.notes
                    })
                    .select()
                    .single();

                if (invoiceError) {
                    console.error('❌ Invoice creation failed:', invoiceError.message);
                    console.log('   This indicates schema mismatch or permission issues');
                } else {
                    console.log('✅ Test invoice created successfully!');
                    console.log(`   Invoice #: ${testInvoice.invoice_number}`);
                    console.log(`   Amount: $${testInvoice.amount}`);
                    
                    // Clean up test invoice
                    await supabase
                        .from('invoices')
                        .delete()
                        .eq('id', testInvoice.id);
                    console.log('🧹 Test invoice cleaned up');
                }
            } catch (error) {
                console.error('❌ Error during invoice creation test:', error.message);
            }
        }

        console.log('\n4️⃣ TESTING FACILITY BILLING');
        console.log('============================');
        
        // Check facility invoices system
        const { data: facilityInvoices, error: facilityError } = await supabase
            .from('invoices')
            .select(`
                *,
                facilities!facility_id (
                    id,
                    name,
                    billing_email
                )
            `)
            .not('facility_id', 'is', null)
            .limit(5);
        
        if (facilityError) {
            console.log('⚠️ Facility invoices may use different schema:', facilityError.message);
        } else {
            console.log(`✅ Found ${facilityInvoices?.length || 0} facility invoices`);
            
            if (facilityInvoices && facilityInvoices.length > 0) {
                console.log('📋 Sample facility invoices:');
                facilityInvoices.forEach(invoice => {
                    console.log(`   • ${invoice.invoice_number}: $${invoice.total_amount || invoice.amount} (${invoice.facilities?.name || 'Unknown Facility'})`);
                });
            }
        }

        console.log('\n5️⃣ DISPATCHER PERMISSIONS TEST');
        console.log('==============================');
        
        // Check if there are dispatcher users
        const { data: dispatchers, error: dispatcherError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role')
            .eq('role', 'dispatcher')
            .limit(3);
        
        if (dispatcherError) {
            console.error('❌ Error fetching dispatchers:', dispatcherError.message);
        } else {
            console.log(`✅ Found ${dispatchers?.length || 0} dispatcher users`);
            
            if (dispatchers && dispatchers.length > 0) {
                dispatchers.forEach(dispatcher => {
                    console.log(`   • ${dispatcher.first_name} ${dispatcher.last_name} (${dispatcher.email})`);
                });
            }
        }

        console.log('\n6️⃣ FINAL ASSESSMENT');
        console.log('===================');
        
        const issues = [];
        const successes = [];
        
        if (schemaError) {
            issues.push('Invoices table schema issues');
        } else {
            successes.push('Invoices table accessible');
        }
        
        if (tripsError) {
            issues.push('Cannot access trips data');
        } else if (completedTrips && completedTrips.length > 0) {
            successes.push(`${completedTrips.length} billable trips available`);
        } else {
            issues.push('No billable trips found');
        }
        
        if (dispatcherError) {
            issues.push('Cannot access dispatcher profiles');
        } else if (dispatchers && dispatchers.length > 0) {
            successes.push(`${dispatchers.length} dispatcher users found`);
        } else {
            issues.push('No dispatcher users found');
        }

        console.log('\n✅ SUCCESSES:');
        successes.forEach(success => console.log(`   • ${success}`));
        
        if (issues.length > 0) {
            console.log('\n⚠️ ISSUES TO ADDRESS:');
            issues.forEach(issue => console.log(`   • ${issue}`));
        }

        console.log('\n🎯 RECOMMENDATIONS:');
        
        if (issues.length === 0) {
            console.log('   ✅ Billing system appears to be fully functional!');
            console.log('   ✅ Ready for production testing');
            console.log('   ✅ Create Invoice button should work in dispatcher dashboard');
        } else {
            console.log('   🔧 Fix the identified issues above');
            console.log('   🔧 Verify database schema matches API expectations');
            console.log('   🔧 Ensure RLS policies allow dispatcher access');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testBillingSystem();
