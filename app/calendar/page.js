import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// This is a Server Component
export default async function CalendarPage() {
    console.log('Calendar page server component executing');
    
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

        // Fetch trips for calendar
        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .order('pickup_time', { ascending: true });

        if (tripsError) {
            console.error('Error fetching trips for calendar:', tripsError);
        }
        
        // Fetch all drivers for filtering
        const { data: drivers, error: driversError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('role', 'driver');
            
        if (driversError) {
            console.error('Error fetching drivers:', driversError);
        }
        
        // Get all user IDs, facility IDs, managed client IDs, and driver IDs from trips to fetch their information
        const userIds = [...new Set((trips || []).map(trip => trip.user_id).filter(Boolean))];
        const facilityIds = [...new Set((trips || []).map(trip => trip.facility_id).filter(Boolean))];
        const managedClientIds = [...new Set((trips || []).map(trip => trip.managed_client_id).filter(Boolean))];
        const driverIds = [...new Set((trips || []).map(trip => trip.driver_id).filter(Boolean))];
        
        console.log('📊 Found unique IDs to fetch:', {
            userIds: userIds.length,
            facilityIds: facilityIds.length,
            managedClientIds: managedClientIds.length,
            driverIds: driverIds.length
        });
        console.log('🏥 Facility IDs to fetch:', facilityIds);
        
        // Fetch user profiles
        let userProfiles = {};
        if (userIds.length > 0) {
            try {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, phone_number, email')
                    .in('id', userIds);
                
                // Create lookup object by ID
                userProfiles = (profiles || []).reduce((acc, profile) => {
                    acc[profile.id] = profile;
                    return acc;
                }, {});
            } catch (error) {
                console.error('Error fetching user profiles:', error);
            }
        }
        
        // Fetch facility information
        let facilityProfiles = {};
        if (facilityIds.length > 0) {
            try {
                const { data: facilities, error: facilitiesError } = await supabase
                    .from('facilities')
                    .select('id, name, contact_email, phone_number')
                    .in('id', facilityIds);
                
                if (facilitiesError) {
                    console.error('❌ Error fetching facilities:', facilitiesError);
                } else {
                    // Create lookup object by ID
                    facilityProfiles = (facilities || []).reduce((acc, facility) => {
                        acc[facility.id] = facility;
                        return acc;
                    }, {});
                }
            } catch (error) {
                console.error('Error fetching facilities:', error);
            }
        }
        
        // Fetch managed clients information
        let managedClientProfiles = {};
        if (managedClientIds.length > 0) {
            try {
                const { data: managedClients } = await supabase
                    .from('facility_managed_clients')
                    .select('id, first_name, last_name, phone_number, email, facility_id')
                    .in('id', managedClientIds);
                
                // Create lookup object by ID
                managedClientProfiles = (managedClients || []).reduce((acc, client) => {
                    acc[client.id] = client;
                    return acc;
                }, {});
            } catch (error) {
                console.error('Error fetching managed clients:', error);
            }
        }
        
        // Fetch driver information
        let driverProfiles = {};
        if (driverIds.length > 0) {
            try {
                const { data: driverData } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, phone_number, email')
                    .eq('role', 'driver')
                    .in('id', driverIds);
                
                // Create lookup object by ID
                driverProfiles = (driverData || []).reduce((acc, driver) => {
                    acc[driver.id] = driver;
                    return acc;
                }, {});
            } catch (error) {
                console.error('Error fetching driver profiles:', error);
            }
        }
        
        // Process trips with user profiles and facility information
        const processedTrips = (trips || []).map(trip => {
            let clientName = trip.client_name;
            let facilityName = null;
            let clientInfo = null;
            let facilityInfo = null;
            let managedClientInfo = null;
            let driverInfo = null;
            
            // Handle facility information
            if (trip.facility_id && facilityProfiles[trip.facility_id]) {
                facilityInfo = facilityProfiles[trip.facility_id];
                facilityName = facilityInfo.name;
            }
            
            // Handle managed client trips (facility clients)
            if (trip.managed_client_id && managedClientProfiles[trip.managed_client_id]) {
                managedClientInfo = managedClientProfiles[trip.managed_client_id];
                if (!clientName && (managedClientInfo.first_name || managedClientInfo.last_name)) {
                    clientName = `${managedClientInfo.first_name || ''} ${managedClientInfo.last_name || ''}`.trim();
                }
            }
            
            // Handle individual client trips
            if (trip.user_id && userProfiles[trip.user_id]) {
                clientInfo = userProfiles[trip.user_id];
                if (!clientName && (clientInfo.first_name || clientInfo.last_name)) {
                    clientName = `${clientInfo.first_name || ''} ${clientInfo.last_name || ''}`.trim();
                }
            }
            
            // Handle driver information
            if (trip.driver_id && driverProfiles[trip.driver_id]) {
                driverInfo = driverProfiles[trip.driver_id];
            }
            
            // Fall back to other methods if we still don't have a client name
            if (!clientName) {
                if (trip.managed_client_id) {
                    clientName = `Managed Client ${trip.managed_client_id.substring(0, 6)}`;
                } else if (trip.facility_id && facilityName) {
                    clientName = facilityName;
                } else if (trip.user_id) {
                    clientName = `Client ${trip.user_id.substring(0, 6)}`;
                } else {
                    clientName = 'Unknown Client';
                }
            }
            
            // Get driver name with fallback
            let driverName = null;
            if (driverInfo && (driverInfo.first_name || driverInfo.last_name)) {
                driverName = `${driverInfo.first_name || ''} ${driverInfo.last_name || ''}`.trim();
            } else if (trip.driver_name) {
                driverName = trip.driver_name;
            }
                
            return {
                ...trip,
                // Map database fields to what the UI expects
                pickup_location: trip.pickup_address || trip.pickup_location,
                dropoff_location: trip.destination_address || trip.dropoff_location,
                client_name: clientName,
                facility_name: facilityName,
                client_info: clientInfo,
                facility_info: facilityInfo,
                managed_client_info: managedClientInfo,
                driver_name: driverName,
                driver_info: driverInfo
            };
        });

        const { CalendarView } = require('../components/CalendarView');
        
        return <CalendarView 
            user={session.user} 
            userProfile={userProfile} 
            trips={processedTrips} 
            drivers={drivers || []} 
        />;
    } catch (error) {
        console.error('Error in calendar page:', error);
        redirect('/login?error=server_error');
    }
}