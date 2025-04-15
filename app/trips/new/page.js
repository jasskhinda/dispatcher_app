import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// This is a Server Component
export default async function NewTripPage() {
    console.log('New Trip page server component executing');
    
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

        // Fetch clients for trip creation
        const { data: clients, error: clientsError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'client')
            .order('created_at', { ascending: false });

        if (clientsError) {
            console.error('Error fetching clients:', clientsError);
        }

        // Import the NewTripForm component
        const { NewTripForm } = require('../../components/NewTripForm');
        
        return <NewTripForm user={session.user} userProfile={userProfile} clients={clients || []} />;
    } catch (error) {
        console.error('Error in new trip page:', error);
        redirect('/login?error=server_error');
    }
}