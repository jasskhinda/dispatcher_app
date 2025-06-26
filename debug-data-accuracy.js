/**
 * Data Accuracy Diagnostic Tool
 * Compares facility data between facility app and dispatcher app
 * Identifies discrepancies in trip counts and billing amounts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugDataAccuracy() {
    console.log('🔍 DEBUGGING DATA ACCURACY BETWEEN FACILITY & DISPATCHER APPS');
    console.log('=' * 70);
    
    try {
        // Get CareBridge Living facility ID
        console.log('\n1. 🏥 IDENTIFYING CAREBRIDGE LIVING FACILITY...');
        const { data: facilities, error: facilityError } = await supabase
            .from('facilities')
            .select('*')
            .ilike('name', '%carebridge%');
        
        if (facilityError) {
            console.log('❌ Facility query failed:', facilityError.message);
            console.log('💡 Trying alternative approach...');
            
            // Try to infer from trips
            const { data: allTrips } = await supabase
                .from('trips')
                .select('facility_id, pickup_location, pickup_address')
                .not('facility_id', 'is', null);
            
            const carebridgeTrips = allTrips?.filter(trip => 
                trip.pickup_location?.includes('CareBridge') ||
                trip.pickup_address?.includes('Blazer') ||
                trip.pickup_address?.includes('Dublin')
            );
            
            if (carebridgeTrips?.length > 0) {
                const facilityId = carebridgeTrips[0].facility_id;
                console.log(`✅ Inferred CareBridge facility ID: ${facilityId}`);
                await analyzeTripsData(facilityId);
            } else {
                console.log('❌ Could not identify CareBridge facility');
            }
            return;
        }
        
        if (!facilities || facilities.length === 0) {
            console.log('❌ No CareBridge facility found');
            return;
        }
        
        const carebridge = facilities[0];
        console.log(`✅ Found CareBridge Living: ${carebridge.id}`);
        console.log(`   Name: ${carebridge.name}`);
        console.log(`   Address: ${carebridge.address}`);
        
        await analyzeTripsData(carebridge.id);
        
    } catch (error) {
        console.error('💥 Error in data accuracy check:', error);
    }
}

async function analyzeTripsData(facilityId) {
    console.log(`\n2. 📊 ANALYZING TRIPS DATA FOR FACILITY: ${facilityId}`);
    
    // Get ALL trips for this facility
    const { data: allTrips, error } = await supabase
        .from('trips')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.log('❌ Trips query failed:', error.message);
        return;
    }
    
    console.log(`\n📋 TOTAL TRIPS FOUND: ${allTrips?.length || 0}`);
    
    if (!allTrips || allTrips.length === 0) {
        console.log('❌ No trips found for this facility');
        return;
    }
    
    // Analyze by status
    const statusBreakdown = {
        completed: allTrips.filter(trip => trip.status === 'completed'),
        pending: allTrips.filter(trip => trip.status === 'pending'),
        upcoming: allTrips.filter(trip => trip.status === 'upcoming'),
        confirmed: allTrips.filter(trip => trip.status === 'confirmed'),
        cancelled: allTrips.filter(trip => trip.status === 'cancelled'),
        other: allTrips.filter(trip => !['completed', 'pending', 'upcoming', 'confirmed', 'cancelled'].includes(trip.status))
    };
    
    console.log('\n📊 STATUS BREAKDOWN:');
    Object.entries(statusBreakdown).forEach(([status, trips]) => {
        if (trips.length > 0) {
            console.log(`   ${status.toUpperCase()}: ${trips.length} trips`);
            trips.forEach(trip => {
                console.log(`     - ${trip.id}: $${trip.price || 0} (${trip.pickup_time || 'No time'})`);
            });
        }
    });
    
    // Calculate billing amounts
    console.log('\n💰 BILLING ANALYSIS:');
    
    // Facility app logic: Only DUE trips are billable
    const dueTrips = allTrips.filter(trip => trip.status === 'completed' && trip.price > 0);
    const facilityAppAmount = dueTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
    
    console.log(`🏥 FACILITY APP CALCULATION (DUE trips only):`);
    console.log(`   Billable trips: ${dueTrips.length}`);
    console.log(`   Total amount: $${facilityAppAmount.toFixed(2)}`);
    
    // Dispatcher app logic: All completed trips
    const completedTrips = statusBreakdown.completed;
    const dispatcherAppAmount = completedTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
    
    console.log(`🚗 DISPATCHER APP CALCULATION (all completed):`);
    console.log(`   Completed trips: ${completedTrips.length}`);
    console.log(`   Total amount: $${dispatcherAppAmount.toFixed(2)}`);
    
    // Check for discrepancies
    console.log('\n🔍 DISCREPANCY ANALYSIS:');
    const tripCountDiff = allTrips.length - 14; // Expected from facility app
    const amountDiff = dispatcherAppAmount - 676.80; // Expected from facility app
    
    console.log(`   Trip count difference: ${tripCountDiff} (${allTrips.length} vs 14 expected)`);
    console.log(`   Amount difference: $${amountDiff.toFixed(2)} ($${dispatcherAppAmount.toFixed(2)} vs $676.80 expected)`);
    
    if (Math.abs(tripCountDiff) > 0 || Math.abs(amountDiff) > 0.01) {
        console.log('\n⚠️  DATA INCONSISTENCY DETECTED!');
        console.log('🔧 RECOMMENDED FIXES:');
        console.log('   1. Verify trip filtering logic in dispatcher app');
        console.log('   2. Ensure both apps use same calculation method');
        console.log('   3. Check for duplicate trips or missing records');
        console.log('   4. Verify status field consistency');
    } else {
        console.log('\n✅ Data appears consistent between apps');
    }
    
    // Show detailed trip breakdown for June 2025
    console.log('\n📅 JUNE 2025 TRIPS BREAKDOWN:');
    const juneTrips = allTrips.filter(trip => {
        const tripDate = new Date(trip.pickup_time || trip.created_at);
        return tripDate.getFullYear() === 2025 && tripDate.getMonth() === 5; // June = month 5
    });
    
    console.log(`   June 2025 trips: ${juneTrips.length}`);
    juneTrips.forEach(trip => {
        const date = new Date(trip.pickup_time || trip.created_at).toLocaleDateString();
        console.log(`     ${date}: ${trip.status} - $${trip.price || 0} (${trip.id})`);
    });
}

// Run the diagnostic
debugDataAccuracy();
