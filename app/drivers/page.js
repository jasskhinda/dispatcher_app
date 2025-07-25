import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { DriversView } from '../components/DriversView';

// This is a Server Component
export default async function DriversPage() {
    console.log('Drivers page server component executing');
    
    try {
        // Create server client
        const supabase = await createClient();
        
        // Check user - always use getUser for security
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // Redirect to login if there's no user
        if (userError || !user) {
            console.error('Auth error:', userError);
            redirect('/login');
        }

        // Get user profile and verify it has dispatcher role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'dispatcher') {
            redirect('/login?error=Access%20denied.%20Dispatcher%20privileges%20required.');
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
        
        return <DriversView user={user} userProfile={profile} drivers={drivers || []} />;
    } catch (error) {
        console.error('Error in drivers page:', error);
        redirect('/login?error=server_error');
    }
}