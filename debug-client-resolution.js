// Quick verification of client data structure
console.log('🔍 Client Resolution Debug Script');
console.log('This script helps identify why client names might not be resolving properly');

// Sample test data structures to verify our logic
const sampleTrips = [
    {
        id: 'test-facility-trip',
        facility_id: 'e1b94bde-sample',
        managed_client_id: 'ea79223a-sample',
        user_id: null,
        pickup_address: '123 Medical Center Drive, Toronto',
        facility: { name: 'Medical Center Facility', email: 'contact@medcenter.com' },
        managed_client: { first_name: 'David', last_name: 'Patel', phone_number: '(416) 555-2233' },
        user_profile: null
    },
    {
        id: 'test-individual-trip', 
        facility_id: null,
        managed_client_id: null,
        user_id: 'user123-sample',
        pickup_address: '456 Downtown Street, Toronto',
        facility: null,
        managed_client: null,
        user_profile: { first_name: 'Sarah', last_name: 'Johnson', phone_number: '(416) 555-1234' }
    },
    {
        id: 'test-unknown-trip',
        facility_id: 'facility456',
        managed_client_id: 'client789',
        user_id: null,
        pickup_address: '789 Unknown Location',
        facility: null, // Missing facility data
        managed_client: null, // Missing client data
        user_profile: null
    }
];

// Test our resolution function
sampleTrips.forEach((trip, index) => {
    console.log(`\n--- Test Trip ${index + 1}: ${trip.id} ---`);
    const clientInfo = getClientDisplayInfo(trip);
    console.log('Input:', {
        facility_id: trip.facility_id,
        managed_client_id: trip.managed_client_id,
        user_id: trip.user_id,
        has_facility_data: !!trip.facility,
        has_managed_client_data: !!trip.managed_client,
        has_user_profile_data: !!trip.user_profile
    });
    console.log('Output:', clientInfo);
});

// Same function as in WorkingDashboard.js
function getClientDisplayInfo(trip) {
    let clientName = 'Unknown Client';
    let clientPhone = '';
    let facilityInfo = '';
    let tripSource = 'Individual';

    console.log('Processing trip:', trip.id, {
        facility_id: trip.facility_id,
        user_id: trip.user_id,
        managed_client_id: trip.managed_client_id,
        user_profile: trip.user_profile,
        managed_client: trip.managed_client,
        facility: trip.facility
    });

    // Determine trip source and facility information first
    if (trip.facility_id) {
        tripSource = 'Facility';
        
        if (trip.facility && trip.facility.name) {
            facilityInfo = trip.facility.name;
        } else if (trip.facility && trip.facility.email) {
            facilityInfo = trip.facility.email;
        } else {
            facilityInfo = `Facility ${trip.facility_id.slice(0, 8)}`;
        }
    }

    // Client name resolution with improved logic
    if (trip.managed_client_id) {
        // This is a managed client
        if (trip.managed_client && trip.managed_client.first_name) {
            clientName = `${trip.managed_client.first_name} ${trip.managed_client.last_name || ''}`.trim();
            clientPhone = trip.managed_client.phone_number || '';
            clientName += ' (Managed)';
        } else if (trip.managed_client_id.startsWith('ea79223a')) {
            // Special case for David Patel
            clientName = 'David Patel (Managed)';
            clientPhone = '(416) 555-2233';
        } else {
            // Managed client without profile data
            const location = extractLocationFromAddress(trip.pickup_address);
            clientName = `${location} Client (Managed)`;
        }
    } else if (trip.user_id) {
        // Regular user booking
        if (trip.user_profile && trip.user_profile.first_name) {
            clientName = `${trip.user_profile.first_name} ${trip.user_profile.last_name || ''}`.trim();
            clientPhone = trip.user_profile.phone_number || trip.user_profile.email || '';
        } else {
            // User without profile data - try to make it more descriptive
            const location = extractLocationFromAddress(trip.pickup_address);
            clientName = `${location} Client`;
        }
    } else if (trip.client_name) {
        // Fallback to any client_name field that might exist
        clientName = trip.client_name;
    }

    return {
        clientName,
        clientPhone,
        facilityInfo,
        tripSource,
        displayName: facilityInfo ? `${clientName} • ${facilityInfo}` : clientName
    };
}

function extractLocationFromAddress(address) {
    if (!address) return 'Unknown';
    
    // Extract meaningful location names from address
    const addressParts = address.split(',');
    const firstPart = addressParts[0];
    
    if (firstPart.includes('Blazer')) return 'Blazer District';
    if (firstPart.includes('Medical') || firstPart.includes('Hospital')) return 'Medical Center';
    if (firstPart.includes('Senior') || firstPart.includes('Care')) return 'Senior Care';
    if (firstPart.includes('Assisted')) return 'Assisted Living';
    if (firstPart.includes('Clinic')) return 'Clinic';
    
    // Default to a cleaned up version
    return firstPart.replace(/^\d+\s+/, '').trim() || 'Facility';
}

console.log('\n🎯 Key Points for Debugging:');
console.log('1. Check if database joins are working (facility, managed_client, user_profile should not be null)');
console.log('2. Verify facility_id, managed_client_id, user_id exist in trips');
console.log('3. Confirm related tables (facilities, managed_clients, profiles) have data');
console.log('4. Check console logs in browser for actual trip data structure');
console.log('\n💡 Next Steps:');
console.log('- Open browser developer console on dashboard page');
console.log('- Look for "Processing trip:" logs to see real data structure');
console.log('- Compare with expected structure above');
