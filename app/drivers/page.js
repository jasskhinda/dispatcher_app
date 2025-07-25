import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// This is a Server Component
export default async function DriversPage() {
    console.log('Drivers page server component executing');
    
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

        // Fetch drivers (users with role 'driver')
        const { data: drivers, error: driversError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'driver')
            .order('created_at', { ascending: false });

        if (driversError) {
            console.error('Error fetching drivers:', driversError);
        }

        const { DriversView } = require('../components/DriversView');
        
        return <DriversView user={session.user} userProfile={userProfile} drivers={drivers || []} />;
    } catch (error) {
        console.error('Error in drivers page:', error);
        redirect('/login?error=server_error');
    }
}