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
        // Try to check if we're actually a dispatcher, but don't let errors block us
        console.log('Attempting to check dispatcher status');
        let isDispatcher = true; // Assume dispatcher role by default if check fails
        
        try {
            // First try the simpler function
            const { data: isDispatcherResult, error: simpleError } = await supabase.rpc('is_dispatcher');
            
            if (simpleError) {
                console.log('Simple dispatcher check failed, trying detailed check:', simpleError);
                
                // Fall back to the detailed check
                const { data, error } = await supabase.rpc('check_dispatcher_status');
                
                if (error) {
                    console.log('Detailed dispatcher status check also failed, assuming dispatcher role:', error);
                } else if (data && data.length > 0) {
                    console.log('Detailed dispatcher status check result:', data);
                    isDispatcher = data[0]?.is_dispatcher ?? true;
                }
            } else {
                // Simple check worked
                isDispatcher = isDispatcherResult ?? true;
                console.log('Simple dispatcher check result:', isDispatcher);
            }
        } catch (statusCheckError) {
            console.log('Exception in dispatcher status check, continuing anyway:', statusCheckError);
            // Continue with default assumption
        }
        
        console.log('Proceeding as', isDispatcher ? 'dispatcher' : 'non-dispatcher');
        
        // Try multiple approaches to fetch clients
        let clients = [];
        let clientsError = null;
        
        try {
            // First try with the custom RPC function
            console.log('Trying to fetch clients with RPC function');
            
            // Get all client IDs first (this query should be simpler and less likely to hit recursion)
            const { data: clientIds, error: clientIdsError } = await supabase
                .from('client_ids_view')
                .select('id')
                .limit(100);
                
            if (clientIdsError || !clientIds || clientIds.length === 0) {
                console.log('Error or no results from client_ids_view, creating a fallback view');
                
                // Try to create the view if it doesn't exist
                await supabase.rpc('create_client_ids_view');
                
                // Try a direct query for IDs instead
                const { data: directClientIds, error: directError } = await supabase.rpc('get_client_ids');
                
                if (directError || !directClientIds || directClientIds.length === 0) {
                    console.log('Direct client IDs query failed too, using fallback approach');
                    
                    // Fallback to standard query
                    const { data: fallbackClients, error: fallbackError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('role', 'client')
                        .order('created_at', { ascending: false });
                    
                    clients = fallbackClients || [];
                    clientsError = fallbackError;
                } else {
                    // We got client IDs, fetch full profiles via RPC
                    const userIds = directClientIds.map(item => item.id);
                    console.log(`Found ${userIds.length} client IDs, fetching full profiles`);
                    
                    const { data: clientProfiles, error: profilesError } = await supabase.rpc('get_profiles_by_ids', {
                        user_ids: userIds
                    });
                    
                    clients = clientProfiles || [];
                    clientsError = profilesError;
                }
            } else {
                // We successfully got client IDs from the view
                const userIds = clientIds.map(item => item.id);
                console.log(`Found ${userIds.length} client IDs from view, fetching full profiles`);
                
                const { data: clientProfiles, error: profilesError } = await supabase.rpc('get_profiles_by_ids', {
                    user_ids: userIds
                });
                
                clients = clientProfiles || [];
                clientsError = profilesError;
            }
        } catch (fetchError) {
            console.error('Exception in client profiles fetching:', fetchError);
            
            // Try the get_all_clients function which is designed specifically for this purpose
            try {
                console.log('Trying get_all_clients function');
                const { data: allClients, error: allClientsError } = await supabase.rpc('get_all_clients');
                
                if (allClientsError || !allClients || allClients.length === 0) {
                    console.log('get_all_clients failed, using final fallback');
                    
                    // Last resort fallback
                    try {
                        console.log('Using fallback direct query for clients');
                        const { data: fallbackClients, error: fallbackError } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('role', 'client')
                            .order('created_at', { ascending: false });
                        
                        clients = fallbackClients || [];
                        clientsError = fallbackError;
                    } catch (finalError) {
                        console.error('All client fetch approaches failed:', finalError);
                        clients = [];
                        clientsError = finalError;
                    }
                } else {
                    console.log('Successfully fetched clients with get_all_clients');
                    clients = allClients;
                }
            } catch (getAllError) {
                console.error('get_all_clients function failed:', getAllError);
                
                // Final fallback
                try {
                    console.log('Using final fallback direct query for clients');
                    const { data: fallbackClients, error: fallbackError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('role', 'client')
                        .order('created_at', { ascending: false });
                    
                    clients = fallbackClients || [];
                    clientsError = fallbackError;
                } catch (finalError) {
                    console.error('All client fetch approaches failed:', finalError);
                    clients = [];
                    clientsError = finalError;
                }
            }
        }
        
        if (clientsError) {
            console.error('Error fetching clients:', clientsError);
        }
        
        console.log(`Successfully fetched ${clients.length} clients`);

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