import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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
        
        // Get all user IDs from trips to fetch their profiles
        const userIds = (trips || []).map(trip => trip.user_id).filter(Boolean);
        
        // If we have user IDs, fetch their profiles
        let userProfiles = {};
        if (userIds.length > 0) {
            try {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name')
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
        
        // Process trips with user profiles
        const processedTrips = (trips || []).map(trip => {
            let clientName = trip.client_name;
            
            // Try to get name from user profiles
            if (!clientName && trip.user_id && userProfiles[trip.user_id]) {
                const profile = userProfiles[trip.user_id];
                if (profile.first_name || profile.last_name) {
                    clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                }
            }
            
            // Fall back to other methods if we still don't have a name
            if (!clientName) {
                clientName = trip.user_id ? `Client ${trip.user_id.substring(0, 4)}` : 'Unknown Client';
            }
                
            return {
                ...trip,
                client_name: clientName
            };
        });

        const { CalendarView } = require('../components/CalendarView');
        
        return <CalendarView user={session.user} userProfile={userProfile} trips={processedTrips} />;
    } catch (error) {
        console.error('Error in calendar page:', error);
        redirect('/login?error=server_error');
    }
}