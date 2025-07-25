import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import AssignTripView from './AssignTripView';

// Helper function to process client information for a trip
async function processClientInfo(trip, supabase, supabaseAdmin) {
    console.log(`Processing client info for trip ${trip.id}`);
    
    // Same client lookup logic as admin app
    if (trip.user_id) {
        try {
            const { data: clientProfile } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, full_name, email, phone_number, role')
                .eq('id', trip.user_id)
                .single();
            
            if (clientProfile) {
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
    
    // Try managed_client_id if user_id didn't work
    if (!trip.profiles && trip.managed_client_id) {
        // For facility trips, try facility_managed_clients table first
        if (trip.facility_id) {
            try {
                const { data: facilityClient } = await supabase
                    .from('facility_managed_clients')
                    .select('id, first_name, last_name, email, phone_number')
                    .eq('id', trip.managed_client_id)
                    .single();
                
                if (facilityClient) {
                    trip.profiles = {
                        id: facilityClient.id,
                        first_name: facilityClient.first_name,
                        last_name: facilityClient.last_name,
                        full_name: `${facilityClient.first_name} ${facilityClient.last_name}`,
                        email: facilityClient.email,
                        phone_number: facilityClient.phone_number,
                        role: 'facility_client'
                    };
                }
            } catch (facilityClientError) {
                console.warn('Could not fetch facility managed client, trying profiles table');
            }
        }
        
        // If not found in facility_managed_clients, try profiles table with managed_client_id
        if (!trip.profiles) {
            try {
                const { data: clientProfile } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, full_name, email, phone_number, role')
                    .eq('id', trip.managed_client_id)
                    .single();
                
                if (clientProfile) {
                    trip.profiles = clientProfile;
                }
            } catch (clientError) {
                console.warn('Could not fetch client from profiles table');
            }
        }
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
    
    // Get email from auth if still no email found in profile
    if (trip.profiles && !trip.profiles.email && supabaseAdmin) {
        const idToTry = trip.user_id || trip.managed_client_id;
        if (idToTry) {
            try {
                const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(idToTry);
                if (authUser?.email) {
                    trip.profiles.email = authUser.email;
                }
            } catch (authError) {
                console.warn(`Could not fetch auth email for trip ${trip.id}`);
            }
        }
    }
    
    // Create fallback profile if needed
    if (!trip.profiles || !trip.profiles.full_name) {
        let fallbackName = trip.client_name || trip.passenger_name || 'Unknown Client';
        let fallbackEmail = trip.client_email || 'No email available';
        
        if (!fallbackName || fallbackName === 'Unknown Client') {
            if (trip.facility_id && trip.managed_client_id) {
                fallbackName = `Facility Client (ID: ${trip.managed_client_id.substring(0, 8)}...)`;
                fallbackEmail = 'Contact facility for client details';
            } else if (trip.user_id) {
                fallbackName = `Individual Client (ID: ${trip.user_id.substring(0, 8)}...)`;
            }
        }
        
        trip.profiles = {
            full_name: fallbackName,
            email: fallbackEmail,
            first_name: fallbackName.split(' ')[0],
            last_name: fallbackName.split(' ').slice(1).join(' ') || '',
            role: trip.facility_id ? 'facility_client' : 'client',
            ...(trip.profiles || {})
        };
    }
}

// This is a Server Component
export default async function AssignTripPage({ params }) {
    const { id: driverId } = params;
    
    try {
        // Create server client
        const supabase = await createClient();
        
        // Check user - always use getUser for security
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // Redirect to login if there's no user
        if (userError || !user) {
            console.error('Auth error:', userError);
            redirect('/login');
        }

        // Get user profile and verify it has dispatcher role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'dispatcher') {
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

        // Get email from auth if not in profile
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin && !driver.email) {
            try {
                const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(driverId);
                if (authUser?.email) {
                    driver.email = authUser.email;
                }
            } catch (error) {
                console.error('Error fetching email for driver:', driverId);
            }
        }

        // Fetch all trips (not just available ones) to show different statuses
        let availableTrips = [];
        let allTrips = [];
        let tripsFetchError = null;
        
        try {
            // First, try to get all trips without joins to see if table exists
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
                    console.log(`\n=== Processing trip ${trip.id} ===`);
                    console.log('Trip fields:', {
                        user_id: trip.user_id,
                        managed_client_id: trip.managed_client_id,
                        facility_id: trip.facility_id,
                        status: trip.status,
                        bill_to: trip.bill_to
                    });

                    // Process client information
                    await processClientInfo(trip, supabase, supabaseAdmin);
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
            for (let trip of assignedTrips) {
                await processClientInfo(trip, supabase, supabaseAdmin);
            }
            processedAssignedTrips = assignedTrips;
        }

        // Process waiting trips with client information
        let processedWaitingTrips = [];
        if (waitingTrips && waitingTrips.length > 0) {
            for (let trip of waitingTrips) {
                await processClientInfo(trip, supabase, supabaseAdmin);
            }
            processedWaitingTrips = waitingTrips;
        }

        // Process rejected trips with client information
        let processedRejectedTrips = [];
        if (rejectedTrips && rejectedTrips.length > 0) {
            for (let trip of rejectedTrips) {
                await processClientInfo(trip, supabase, supabaseAdmin);
            }
            processedRejectedTrips = rejectedTrips;
        }

        // Fetch all drivers for reference
        const { data: allDrivers } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email, status')
            .eq('role', 'driver')
            .order('first_name');

        // Get emails for drivers
        if (supabaseAdmin && allDrivers) {
            for (let driver of allDrivers) {
                if (!driver.email && driver.id) {
                    try {
                        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(driver.id);
                        if (authUser?.email) {
                            driver.email = authUser.email;
                        }
                    } catch (error) {
                        console.error('Error fetching email for driver:', driver.id);
                    }
                }
            }
        }
        
        console.log(`✨ FINAL RESULT: Processed ${availableTrips.length} trips`);

        return (
            <AssignTripView 
                user={user}
                userProfile={profile}
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