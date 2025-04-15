import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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

        // Fetch clients (users with role 'client')
        const { data: clients, error: clientsError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'client')
            .order('created_at', { ascending: false });

        if (clientsError) {
            console.error('Error fetching clients:', clientsError);
        }

        // For each client, get their trips
        const clientsWithTrips = await Promise.all((clients || []).map(async (client) => {
            const { data: trips, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .eq('user_id', client.id)
                .order('created_at', { ascending: false });

            if (tripsError) {
                console.error(`Error fetching trips for client ${client.id}:`, tripsError);
                return {
                    ...client,
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
                trips: trips || [],
                trip_count: tripCount,
                last_trip: lastTrip,
                recent_status: lastTrip?.status || null
            };
        }));

        const ClientsView = require('./ClientsView').default;
        
        return <ClientsView user={session.user} userProfile={userProfile} clients={clientsWithTrips} />;
    } catch (error) {
        console.error('Error in clients page:', error);
        redirect('/login?error=server_error');
    }
}