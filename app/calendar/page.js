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
        
        // Get all user IDs and facility IDs from trips to fetch their information
        const userIds = (trips || []).map(trip => trip.user_id).filter(Boolean);
        const facilityIds = (trips || []).map(trip => trip.facility_id).filter(Boolean);
        
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
                const { data: facilities } = await supabase
                    .from('facilities')
                    .select('id, name, contact_email, contact_phone')
                    .in('id', facilityIds);
                
                // Create lookup object by ID
                facilityProfiles = (facilities || []).reduce((acc, facility) => {
                    acc[facility.id] = facility;
                    return acc;
                }, {});
            } catch (error) {
                console.error('Error fetching facilities:', error);
            }
        }
        
        // Process trips with user profiles and facility information
        const processedTrips = (trips || []).map(trip => {
            let clientName = trip.client_name;
            let facilityName = null;
            let clientInfo = null;
            let facilityInfo = null;
            
            // Handle facility trips
            if (trip.facility_id && facilityProfiles[trip.facility_id]) {
                facilityInfo = facilityProfiles[trip.facility_id];
                facilityName = facilityInfo.name;
                
                // For facility trips, use facility name as primary identifier
                if (!clientName) {
                    clientName = facilityName;
                }
            }
            
            // Handle individual client trips
            if (trip.user_id && userProfiles[trip.user_id]) {
                clientInfo = userProfiles[trip.user_id];
                if (!clientName && (clientInfo.first_name || clientInfo.last_name)) {
                    clientName = `${clientInfo.first_name || ''} ${clientInfo.last_name || ''}`.trim();
                }
            }
            
            // Fall back to other methods if we still don't have a name
            if (!clientName) {
                if (trip.facility_id) {
                    clientName = `Facility ${trip.facility_id.substring(0, 6)}`;
                } else if (trip.user_id) {
                    clientName = `Client ${trip.user_id.substring(0, 6)}`;
                } else {
                    clientName = 'Unknown Client';
                }
            }
            
            // Use driver_name from the trip if available
            let driverName = trip.driver_name || null;
                
            return {
                ...trip,
                // Map database fields to what the UI expects
                pickup_location: trip.pickup_address || trip.pickup_location,
                dropoff_location: trip.destination_address || trip.dropoff_location,
                client_name: clientName,
                facility_name: facilityName,
                client_info: clientInfo,
                facility_info: facilityInfo,
                driver_name: driverName
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