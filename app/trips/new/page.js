import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

        // Fetch both individual clients and facility managed clients
        console.log('🔍 Fetching clients from both booking app and facility app...');
        
        // Fetch individual clients from booking app (profiles with role 'client')
        const { data: individualClients, error: individualError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone_number, created_at')
            .eq('role', 'client')
            .order('first_name', { ascending: true });

        if (individualError) {
            console.error('Error fetching individual clients:', individualError);
        }

        // Fetch managed clients from facility app
        let managedClients = [];
        let facilities = [];
        
        try {
            // Fetch facilities first
            const { data: facilitiesData, error: facilitiesError } = await supabase
                .from('facilities')
                .select('id, name, contact_email, phone_number')
                .order('name', { ascending: true });
            
            if (!facilitiesError && facilitiesData) {
                facilities = facilitiesData;
                console.log(`✅ Found ${facilities.length} facilities`);
            }

            // Fetch managed clients from facility_managed_clients table
            const { data: managedClientsData, error: managedError } = await supabase
                .from('facility_managed_clients')
                .select('id, first_name, last_name, email, phone_number, facility_id, created_at')
                .order('first_name', { ascending: true });
            
            if (!managedError && managedClientsData) {
                managedClients = managedClientsData;
                console.log(`✅ Found ${managedClients.length} managed clients`);
            } else {
                console.log('⚠️ Could not fetch managed clients, trying fallback table...');
                
                // Fallback to legacy managed_clients table
                const { data: fallbackClients } = await supabase
                    .from('managed_clients')
                    .select('id, first_name, last_name, email, phone_number, facility_id, created_at')
                    .order('first_name', { ascending: true });
                
                if (fallbackClients) {
                    managedClients = fallbackClients;
                    console.log(`✅ Found ${managedClients.length} managed clients from fallback table`);
                }
            }
        } catch (error) {
            console.log('⚠️ Error fetching facility data:', error);
        }

        console.log(`📊 Client summary: ${individualClients?.length || 0} individual + ${managedClients.length} managed = ${(individualClients?.length || 0) + managedClients.length} total clients`);

        // Import the NewTripForm component
        const { NewTripForm } = require('../../components/NewTripForm');
        
        return <NewTripForm 
            user={session.user} 
            userProfile={userProfile} 
            individualClients={individualClients || []}
            managedClients={managedClients || []}
            facilities={facilities || []}
        />;
    } catch (error) {
        console.error('Error in new trip page:', error);
        redirect('/login?error=server_error');
    }
}