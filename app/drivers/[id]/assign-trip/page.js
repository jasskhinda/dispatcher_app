import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import AssignTripView from './AssignTripView';

// Helper function to process client information for a trip
async function processClientInfo(trip, supabase) {
    console.log(`Processing client info for trip ${trip.id}`);
    
    // Handle individual clients from BookingCCT app
    if (trip.user_id) {
        try {
            const { data: clientProfile } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, full_name, email, phone_number, role')
                .eq('id', trip.user_id)
                .single();
            
            if (clientProfile) {
                console.log(`✅ SUCCESS: Found profile for user_id ${trip.user_id}:`, clientProfile);
                trip.profiles = {
                    id: clientProfile.id,
                    first_name: clientProfile.first_name,
                    last_name: clientProfile.last_name,
                    full_name: clientProfile.full_name || `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim(),
                    email: clientProfile.email,
                    phone_number: clientProfile.phone_number,
                    role: clientProfile.role
                };
            }
        } catch (clientError) {
            console.warn(`Could not fetch client for trip ${trip.id}:`, clientError.message);
        }
    }
    // Handle facility managed clients from facility_app
    else if (trip.managed_client_id) {
        try {
            const { data: managedClient } = await supabase
                .from('facility_managed_clients')
                .select('id, first_name, last_name, email, phone_number')
                .eq('id', trip.managed_client_id)
                .single();
            
            if (managedClient) {
                trip.profiles = {
                    id: managedClient.id,
                    first_name: managedClient.first_name,
                    last_name: managedClient.last_name,
                    full_name: `${managedClient.first_name || ''} ${managedClient.last_name || ''}`.trim(),
                    email: managedClient.email,
                    phone_number: managedClient.phone_number,
                    role: 'facility_client'
                };
            }
        } catch (clientError) {
            console.warn(`Could not fetch managed client for trip ${trip.id}:`, clientError.message);
        }
    }
    
    // Create fallback profile if needed
    if (!trip.profiles || !trip.profiles.full_name) {
        let fallbackName = trip.client_name || trip.passenger_name || 'Unknown Client';
        let fallbackEmail = trip.client_email || 'No email available';
        
        trip.profiles = {
            full_name: fallbackName,
            email: fallbackEmail,
            first_name: fallbackName.split(' ')[0],
            last_name: fallbackName.split(' ').slice(1).join(' ') || '',
            role: trip.facility_id ? 'facility_client' : 'client',
            ...(trip.profiles || {})
        };
    }

    // Fetch facility information
    if (trip.facility_id) {
        try {
            const { data: facilityData } = await supabase
                .from('facilities')
                .select('id, name, address, phone_number, contact_email')
                .eq('id', trip.facility_id)
                .single();
            
            if (facilityData) {
                trip.facility = facilityData;
            }
        } catch (facilityError) {
            console.warn(`Could not fetch facility for trip ${trip.id}`);
        }
    }
}

// This is a Server Component
export default async function AssignTripPage({ params }) {
    const { id: driverId } = params;
    
    try {
        // Create server component client
        const supabase = createServerComponentClient({ cookies });

        // This will refresh the session if needed
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Auth session check result:', session ? 'Session exists' : 'No session found');

        // Redirect to login if there's no session
        if (!session) {
            console.log('No session, redirecting to login');
            redirect('/login');
        }

        // Get user profile
        let userProfile = null;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.log('Note: Unable to fetch user profile, using session data');
                userProfile = {
                    id: session.user.id,
                    email: session.user.email,
                    role: 'dispatcher'
                };
            } else {
                userProfile = data;
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            userProfile = {
                id: session.user.id,
                email: session.user.email,
                role: 'dispatcher'
            };
        }

        // Check if user has dispatcher role
        if (userProfile.role !== 'dispatcher') {
            redirect('/login?error=Access%20denied.%20Dispatcher%20privileges%20required.');
        }
        
        // Fetch driver details
        const { data: driver, error: driverError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', driverId)
            .eq('role', 'driver')
            .single();
            
        if (driverError || !driver) {
            redirect('/drivers?error=Driver%20not%20found');
        }

        // Fetch all trips to show different statuses
        let availableTrips = [];
        let allTrips = [];
        let tripsFetchError = null;
        
        try {
            const { data: allTripsData, error: allTripsError } = await supabase
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false });

            if (allTripsError) {
                console.error('Error fetching all trips:', allTripsError);
                tripsFetchError = allTripsError;
            } else if (allTripsData) {
                allTrips = allTripsData;
                console.log(`🚀 ASSIGN-TRIP PAGE LOADED: Found ${allTrips.length} total trips in database at ${new Date().toISOString()}`);
                
                // Show all trips (not just assignable ones) so dispatcher can see pending/cancelled too
                availableTrips = allTrips;
                console.log(`Showing ${availableTrips.length} total trips for assignment view`);
                
                // Enhanced client information fetching
                for (let trip of availableTrips) {
                    await processClientInfo(trip, supabase);
                }
            }
        } catch (error) {
            console.warn('Could not fetch trips:', error.message);
            tripsFetchError = error;
        }

        // Fetch trips assigned to this specific driver
        const { data: assignedTrips, error: assignedTripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', driverId)
            .in('status', ['in_progress', 'upcoming'])
            .order('created_at', { ascending: false });

        // Fetch trips awaiting driver acceptance for this specific driver
        const { data: waitingTrips, error: waitingTripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('driver_id', driverId)
            .eq('status', 'awaiting_driver_acceptance')
            .order('created_at', { ascending: false });

        // Fetch trips rejected by this specific driver
        const { data: rejectedTrips, error: rejectedTripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('status', 'rejected')
            .eq('rejected_by_driver_id', driverId)
            .order('created_at', { ascending: false })
            .limit(10);

        // Process assigned trips with client information
        let processedAssignedTrips = [];
        if (assignedTrips && assignedTrips.length > 0) {
            console.log(`Found ${assignedTrips.length} assigned trips for driver ${driverId}`);
            
            for (let trip of assignedTrips) {
                await processClientInfo(trip, supabase);
            }
            
            processedAssignedTrips = assignedTrips;
        }

        // Process waiting trips with client information
        let processedWaitingTrips = [];
        if (waitingTrips && waitingTrips.length > 0) {
            console.log(`Found ${waitingTrips.length} waiting trips for driver ${driverId}`);
            
            for (let trip of waitingTrips) {
                await processClientInfo(trip, supabase);
            }
            processedWaitingTrips = waitingTrips;
        }

        // Process rejected trips with client information
        let processedRejectedTrips = [];
        if (rejectedTrips && rejectedTrips.length > 0) {
            console.log(`Found ${rejectedTrips.length} rejected trips for driver ${driverId}`);
            
            for (let trip of rejectedTrips) {
                await processClientInfo(trip, supabase);
            }
            processedRejectedTrips = rejectedTrips;
        }

        // Fetch all drivers for reference
        const { data: allDrivers } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email, status')
            .eq('role', 'driver')
            .order('first_name');
        
        console.log(`✨ FINAL RESULT: Processed ${availableTrips.length} trips`);

        return (
            <AssignTripView 
                user={session.user}
                userProfile={userProfile}
                driver={driver}
                availableTrips={availableTrips}
                allTrips={allTrips}
                assignedTrips={processedAssignedTrips}
                waitingTrips={processedWaitingTrips}
                rejectedTrips={processedRejectedTrips}
                allDrivers={allDrivers || []}
                tripsFetchError={tripsFetchError}
            />
        );
    } catch (error) {
        console.error('Error in assign trip page:', error);
        redirect('/drivers?error=server_error');
    }
}