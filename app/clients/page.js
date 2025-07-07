import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// This is a Server Component
export default async function ClientsPage() {
    console.log('Clients page server component executing');
    
    try {
        // Create server component client
        const supabase = createServerComponentClient({ cookies });
        console.log('Server supabase client created');

        // This will refresh the session if needed
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Auth session check result:', session ? 'Session exists' : 'No session found');

        // Redirect to login if there's no session
        if (!session) {
            console.log('No session, redirecting to login');
            redirect('/login');
        }

        // Get user profile and verify it has dispatcher role
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

        // Fetch individual clients (users with role 'client' from booking app)
        console.log('Fetching individual clients...');
        let individualClients = [];
        try {
            const { data: clients, error: clientsError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'client')
                .order('first_name', { ascending: true });

            if (clientsError) {
                console.error('Error fetching individual clients:', clientsError);
            } else {
                individualClients = clients || [];
                console.log(`Found ${individualClients.length} individual clients`);
            }
        } catch (error) {
            console.error('Exception fetching individual clients:', error);
        }

        // Fetch facilities
        console.log('Fetching facilities...');
        let facilities = [];
        try {
            const { data: facilitiesData, error: facilitiesError } = await supabase
                .from('facilities')
                .select('*')
                .order('name', { ascending: true });

            if (facilitiesError) {
                console.error('Error fetching facilities:', facilitiesError);
            } else {
                facilities = facilitiesData || [];
                console.log(`Found ${facilities.length} facilities`);
            }
        } catch (error) {
            console.error('Exception fetching facilities:', error);
        }

        // Fetch managed clients from facility app
        console.log('Fetching managed clients...');
        let managedClients = [];
        try {
            const { data: managedClientsData, error: managedError } = await supabase
                .from('facility_managed_clients')
                .select('*')
                .order('first_name', { ascending: true });

            if (managedError) {
                console.log('Error fetching from facility_managed_clients, trying managed_clients table...');
                // Fallback to legacy table
                const { data: fallbackClients, error: fallbackError } = await supabase
                    .from('managed_clients')
                    .select('*')
                    .order('first_name', { ascending: true });

                if (!fallbackError && fallbackClients) {
                    managedClients = fallbackClients;
                    console.log(`Found ${managedClients.length} managed clients from fallback table`);
                }
            } else {
                managedClients = managedClientsData || [];
                console.log(`Found ${managedClients.length} managed clients`);
            }
        } catch (error) {
            console.error('Exception fetching managed clients:', error);
        }

        // Get trip counts for all clients
        console.log('Fetching trip counts...');
        
        // For individual clients, get their trips
        const individualClientsWithTrips = await Promise.all((individualClients || []).map(async (client) => {
            const { data: trips, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .eq('user_id', client.id)
                .order('created_at', { ascending: false });

            if (tripsError) {
                console.error(`Error fetching trips for individual client ${client.id}:`, tripsError);
                return {
                    ...client,
                    client_type: 'individual',
                    trips: [],
                    trip_count: 0,
                    last_trip: null,
                    recent_status: null
                };
            }

            const tripCount = trips?.length || 0;
            const lastTrip = trips && trips.length > 0 ? trips[0] : null;

            return {
                ...client,
                client_type: 'individual',
                trips: trips || [],
                trip_count: tripCount,
                last_trip: lastTrip,
                recent_status: lastTrip?.status || null
            };
        }));

        // For managed clients, get their trips
        const managedClientsWithTrips = await Promise.all((managedClients || []).map(async (client) => {
            const { data: trips, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .eq('managed_client_id', client.id)
                .order('created_at', { ascending: false });

            if (tripsError) {
                console.error(`Error fetching trips for managed client ${client.id}:`, tripsError);
                return {
                    ...client,
                    client_type: 'managed',
                    trips: [],
                    trip_count: 0,
                    last_trip: null,
                    recent_status: null
                };
            }

            const tripCount = trips?.length || 0;
            const lastTrip = trips && trips.length > 0 ? trips[0] : null;

            return {
                ...client,
                client_type: 'managed',
                trips: trips || [],
                trip_count: tripCount,
                last_trip: lastTrip,
                recent_status: lastTrip?.status || null
            };
        }));

        console.log(`Total: ${individualClientsWithTrips.length} individual clients and ${managedClientsWithTrips.length} managed clients`);

        const ClientsView = require('./ClientsView').default;
        
        return <ClientsView 
            user={session.user} 
            userProfile={userProfile} 
            individualClients={individualClientsWithTrips}
            managedClients={managedClientsWithTrips}
            facilities={facilities}
        />;
    } catch (error) {
        console.error('Error in clients page:', error);
        redirect('/login?error=server_error');
    }
}