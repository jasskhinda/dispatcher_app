import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// This is a Server Component
export default async function MapPage() {
    console.log('Map page server component executing');
    
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

        // Import the MapView component
        const { MapView } = require('../components/MapView');
        
        // Fetch drivers with locations - simplify the query to avoid potential issues
        const { data: drivers, error: driversError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'driver');
            
        if (driversError) {
            console.error('Error fetching drivers:', driversError);
        }
        
        // Create a simpler version of drivers data to avoid any schema issues
        const simplifiedDrivers = (drivers || []).map(driver => ({
            id: driver.id,
            first_name: driver.first_name || '',
            last_name: driver.last_name || '',
            full_name: driver.full_name || '',
            email: driver.email || '',
            phone_number: driver.phone_number || '',
            role: driver.role || 'driver',
            status: driver.status || 'offline',
            // Add fallback for missing position data
            current_position: driver.current_position || null
        }));
        
        // Fetch only in-progress trips
        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('status', 'in_progress');
            
        if (tripsError) {
            console.error('Error fetching trips:', tripsError);
        }
        
        // Process trip data directly without additional queries
        const processedTrips = (trips || []).map(trip => {
            // Add a default client_name if not available
            if (!trip.client_name) {
                if (trip.user_id) {
                    trip.client_name = `Client ${trip.user_id.substring(0, 8)}`;
                } else {
                    trip.client_name = 'Unknown Client';
                }
            }
            return trip;
        });
        
        return <MapView user={session.user} userProfile={userProfile} drivers={simplifiedDrivers} trips={processedTrips} />;
    } catch (error) {
        console.error('Error in map page:', error);
        redirect('/login?error=server_error');
    }
}