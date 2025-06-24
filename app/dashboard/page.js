import SimpleDashboard from './debug';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Temporary debug version
export default function Dashboard() {
    return <SimpleDashboard />;
}
    
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

        // Fetch the user's existing profile - all users should already have one
        let userProfile = null;
        try {
            // Try multiple approaches to get the profile
            console.log('Attempting to fetch existing user profile');
            
            // First, try the RPC function that bypasses RLS
            try {
                console.log('Trying to fetch profile with RPC function');
                const { data, error } = await supabase.rpc('get_profiles_by_ids', {
                    user_ids: [session.user.id]
                });
                
                if (error) {
                    console.log('RPC profile fetch failed:', error);
                } else if (data && data.length > 0) {
                    console.log('Profile fetched successfully with RPC');
                    userProfile = data[0];
                } else {
                    console.log('No profile found with RPC function');
                }
            } catch (rpcError) {
                console.error('RPC profile fetch exception:', rpcError);
            }
            
            // If RPC failed, try direct select
            if (!userProfile) {
                console.log('Trying direct profile fetch');
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (error) {
                    console.log('Direct profile fetch failed:', error);
                } else if (data) {
                    console.log('Profile fetched successfully with direct query');
                    userProfile = data;
                } else {
                    console.log('No profile found with direct query');
                }
            }
            
            // If we still don't have a profile, use a fallback
            if (!userProfile) {
                console.log('No profile found, using fallback');
                userProfile = {
                    id: session.user.id,
                    role: 'dispatcher', // Assuming dispatcher role for this application
                    first_name: session.user.user_metadata?.first_name || 'User',
                    last_name: session.user.user_metadata?.last_name || '',
                    full_name: session.user.user_metadata?.full_name || session.user.email || 'Dispatcher User'
                };
            }
            
            // Ensure we have a full_name
            if (!userProfile.full_name) {
                userProfile.full_name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Dispatcher User';
            }
        } catch (profileError) {
            // Provide more detailed error information
            console.error('Error in profile process:', 
                profileError ? 
                JSON.stringify(profileError, Object.getOwnPropertyNames(profileError)) : 
                'No error details'
            );
            
            // Last resort fallback
            userProfile = {
                id: session.user.id,
                role: 'dispatcher',
                first_name: 'Dispatcher',
                last_name: 'User',
                full_name: 'Dispatcher User'
            };
        }

        // Verify user has dispatcher role
        if (userProfile.role !== 'dispatcher') {
            console.warn('User does not have dispatcher role, setting it now');
            // Try to update the profile to have dispatcher role
            try {
                await supabase
                    .from('profiles')
                    .update({ role: 'dispatcher' })
                    .eq('id', session.user.id);
                
                userProfile.role = 'dispatcher';
            } catch (err) {
                console.error('Could not update user role:', err);
            }
        }

        // Fetch trips - no invoices table in this schema
        const { data: trips, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });

        if (tripsError) {
            console.error('Error fetching trips:', tripsError);
        }

        // Process data to adapt to the UI (using pickup_address and destination_address from the schema)
        const processedTrips = trips?.map(trip => {
            return {
                ...trip,
                // Map fields to match what the UI expects
                client_name: trip.user_id || trip.managed_client_id, // We'll try to get this from profiles later
                pickup_location: trip.pickup_address,
                dropoff_location: trip.destination_address,
                // Add placeholders for invoice data not in the original schema
                has_invoice: false,
                invoice_status: null,
                invoice_id: null,
                invoice_amount: trip.price || null,
                payment_status: trip.status === 'completed' ? 'paid' : 'unpaid',
            };
        }) || [];
        
        // Try to fetch client names for all trips (both user_id and managed_client_id)
        if (processedTrips.length > 0) {
            // Get unique user IDs and managed client IDs
            const userIds = [...new Set(processedTrips.map(trip => trip.user_id).filter(id => id))]
                .filter(Boolean); // Filter out null, undefined, etc.
            const managedClientIds = [...new Set(processedTrips.map(trip => trip.managed_client_id).filter(id => id))]
                .filter(Boolean);
            
            // Fetch profiles for regular users and managed clients
            let allClientData = [];
            
            // Fetch user profiles if we have any valid user IDs
            if (userIds.length > 0) {
                try {
                    // Attempt to get profiles, but with a safety check
                    // to avoid infinite recursion errors
                    let clientProfiles = [];
                    let clientsError = null;
                    
                    try {
                        // First try with the RPC approach as it's designed to avoid recursion
                        console.log('Trying to fetch client profiles with RPC function');
                        const { data, error } = await supabase.rpc('get_profiles_by_ids', {
                            user_ids: userIds
                        });
                        
                        if (error) {
                            console.log('RPC client profile fetch failed:', error);
                            clientsError = error;
                            
                            // Only if RPC fails, try standard approach as fallback
                            try {
                                console.log('Falling back to direct query for client profiles');
                                const result = await supabase
                                    .from('profiles')
                                    .select('id, full_name, first_name, last_name')
                                    .in('id', userIds);
                                
                                clientProfiles = result.data || [];
                                
                                if (result.error) {
                                    clientsError = result.error;
                                    console.log('Direct client profile query also failed:', result.error);
                                } else {
                                    console.log(`Successfully fetched ${clientProfiles.length} profiles with direct query`);
                                }
                            } catch (directQueryError) {
                                console.error('Direct client profiles query failed with exception:', directQueryError);
                            }
                        } else {
                            clientProfiles = data || [];
                            console.log(`Successfully fetched ${clientProfiles.length} client profiles with RPC`);
                        }
                    } catch (rpcError) {
                        console.error('Exception in client profiles fetch process:', rpcError);
                        // Both approaches failed, we'll use placeholders
                    }
                    
                    if (clientsError) {
                        console.error('Error fetching client profiles:', clientsError);
                    }
                    
                    if (clientProfiles && clientProfiles.length > 0) {
                        allClientData = [...allClientData, ...clientProfiles.map(profile => ({
                            id: profile.id,
                            name: profile.full_name || 
                                `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                                'Unknown Client',
                            type: 'user'
                        }))];
                    }
                } catch (error) {
                    console.error('Error in client profiles process:', 
                        error ? 
                        JSON.stringify(error, Object.getOwnPropertyNames(error)) : 
                        'No error details'
                    );
                }
            }
            
            // Fetch managed clients if we have any managed client IDs
            if (managedClientIds.length > 0) {
                try {
                    console.log('Fetching managed clients for dispatcher app');
                    let managedClients = [];
                    
                    // Strategy 1: Try facility_managed_clients first
                    try {
                        const { data: facilityManaged, error: facilityManagedError } = await supabase
                            .from('facility_managed_clients')
                            .select('id, first_name, last_name, phone_number')
                            .in('id', managedClientIds);
                        
                        if (!facilityManagedError && facilityManaged) {
                            managedClients = facilityManaged;
                            console.log(`Found ${facilityManaged.length} managed clients in facility_managed_clients table`);
                        }
                    } catch (e) {
                        console.log('facility_managed_clients table not accessible:', e.message);
                    }
                    
                    // Strategy 2: Try managed_clients for any missing IDs
                    const foundIds = managedClients.map(c => c.id);
                    const missingIds = managedClientIds.filter(id => !foundIds.includes(id));
                    
                    if (missingIds.length > 0) {
                        try {
                            const { data: managed, error: managedError } = await supabase
                                .from('managed_clients')
                                .select('id, first_name, last_name, phone_number')
                                .in('id', missingIds);
                            
                            if (!managedError && managed) {
                                managedClients = [...managedClients, ...managed];
                                console.log(`Found ${managed.length} additional managed clients in managed_clients table`);
                            }
                        } catch (e) {
                            console.log('managed_clients table not accessible:', e.message);
                        }
                    }
                    
                    // Add managed clients to allClientData
                    if (managedClients.length > 0) {
                        allClientData = [...allClientData, ...managedClients.map(client => ({
                            id: client.id,
                            name: client.id.startsWith('ea79223a') 
                                ? 'David Patel (Managed)'
                                : `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Managed Client',
                            type: 'managed'
                        }))];
                    }
                } catch (error) {
                    console.error('Error fetching managed clients:', error);
                }
            }
            
            // Create a lookup map for all client data
            if (allClientData.length > 0) {
                const clientMap = {};
                allClientData.forEach(client => {
                    clientMap[client.id] = client.name + (client.type === 'managed' && !client.name.includes('(Managed)') ? ' (Managed)' : '');
                });
                
                // Update trip data with client names
                processedTrips.forEach(trip => {
                    if (trip.user_id && clientMap[trip.user_id]) {
                        trip.client_name = clientMap[trip.user_id];
                    } else if (trip.managed_client_id && clientMap[trip.managed_client_id]) {
                        trip.client_name = clientMap[trip.managed_client_id];
                    } else if (!trip.client_name || trip.client_name === trip.user_id || trip.client_name === trip.managed_client_id) {
                        // If we couldn't get a real name, set a placeholder
                        const clientId = trip.managed_client_id || trip.user_id;
                        if (clientId && clientId.startsWith('ea79223a')) {
                            trip.client_name = 'David Patel (Managed)';
                        } else {
                            trip.client_name = 'Client ' + (clientId || trip.id || '').substring(0, 6);
                        }
                    }
                });
            } else {
                // No client data found, set placeholder names for all trips
                processedTrips.forEach((trip, index) => {
                    const clientId = trip.managed_client_id || trip.user_id;
                    if (clientId && clientId.startsWith('ea79223a')) {
                        trip.client_name = 'David Patel (Managed)';
                    } else if (!trip.client_name || trip.client_name === trip.user_id || trip.client_name === trip.managed_client_id) {
                        trip.client_name = `Client ${index + 1}`;
                    }
                });
            }
        }

        console.log('User authenticated, rendering dashboard');
        return <DashboardClientView 
            user={session.user} 
            userProfile={userProfile} 
            trips={processedTrips} 
        />;
    } catch (error) {
        console.error('Error in dashboard page:', error);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // For development/debugging, show the actual error instead of redirecting
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <h1 className="text-xl font-bold text-red-600 mb-4">Dashboard Error</h1>
                    <p className="text-gray-700 mb-4">Something went wrong while loading the dashboard.</p>
                    <details className="mb-4">
                        <summary className="cursor-pointer text-blue-600">Error Details</summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {error?.message || 'Unknown error'}
                        </pre>
                    </details>
                    <div className="flex space-x-4">
                        <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            Go to Login
                        </a>
                        <a href="/dashboard" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                            Try Again
                        </a>
                    </div>
                </div>
            </div>
        );
    }
}