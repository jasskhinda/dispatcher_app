import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import DashboardClientView from './DashboardClientView';

// This is a Server Component
export default async function Dashboard() {
    console.log('Dashboard server component executing');
    
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

        // Try to fetch the user's profile and create it if it doesn't exist
        let userProfile = null;
        try {
            // First try to get the profile
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error || !data) {
                console.log('Profile not found, creating one');
                // Create a new profile
                const newProfile = {
                    id: session.user.id,
                    email: session.user.email || '',
                    role: 'dispatcher',
                    first_name: 'Dispatcher',
                    last_name: 'User'
                };
                
                const { data: insertData, error: insertError } = await supabase
                    .from('profiles')
                    .upsert(newProfile)
                    .select()
                    .single();
                
                if (insertError) {
                    console.error('Error creating profile:', insertError);
                    userProfile = {
                        ...newProfile,
                        full_name: 'Dispatcher User'
                    };
                } else if (insertData) {
                    console.log('Profile created successfully');
                    userProfile = insertData;
                    // Make sure we have a full_name if the DB didn't generate it
                    if (!userProfile.full_name) {
                        userProfile.full_name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
                    }
                }
            } else {
                userProfile = data;
                // Make sure we have a full_name
                if (!userProfile.full_name) {
                    userProfile.full_name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
                }
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
                email: session.user.email || '',
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
                client_name: trip.user_id, // We'll try to get this from profiles later
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
        
        // Try to fetch client names for all trips
        if (processedTrips.length > 0) {
            // Get unique user IDs
            const userIds = [...new Set(processedTrips.map(trip => trip.user_id).filter(id => id))]
                .filter(Boolean); // Filter out null, undefined, etc.
            
            // Fetch profiles for these users if we have any valid user IDs
            if (userIds.length > 0) {
                try {
                    const { data: clientProfiles, error: clientsError } = await supabase
                        .from('profiles')
                        .select('id, full_name, first_name, last_name')
                        .in('id', userIds);
                    
                    if (clientsError) {
                        console.error('Error fetching client profiles:', clientsError);
                    }
                    
                    if (clientProfiles && clientProfiles.length > 0) {
                        // Create a lookup map
                        const userMap = {};
                        clientProfiles.forEach(profile => {
                            // Use full_name if available, otherwise construct from first/last name
                            const name = profile.full_name || 
                                `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                                'Unknown Client';
                            
                            userMap[profile.id] = name;
                        });
                        
                        // Update trip data with client names
                        processedTrips.forEach(trip => {
                            if (trip.user_id && userMap[trip.user_id]) {
                                trip.client_name = userMap[trip.user_id];
                            } else if (!trip.client_name || trip.client_name === trip.user_id) {
                                // If we couldn't get a real name, set a placeholder
                                trip.client_name = 'Client ' + (trip.id || '').substring(0, 6);
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error in client profiles process:', 
                        error ? 
                        JSON.stringify(error, Object.getOwnPropertyNames(error)) : 
                        'No error details'
                    );
                }
            } else {
                // No valid user IDs, set placeholder names for all trips
                processedTrips.forEach((trip, index) => {
                    if (!trip.client_name || trip.client_name === trip.user_id) {
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
        redirect('/login?error=server_error');
    }
}