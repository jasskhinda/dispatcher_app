import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// This is a Server Component
export default async function InvoicesPage() {
    console.log('Invoices page server component executing');
    
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

        // Fetch all invoices
        const { data: invoices, error: invoicesError } = await supabase
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false });

        if (invoicesError) {
            console.error('Error fetching invoices:', invoicesError);
        }

        // For each invoice, get the client information
        const invoicesWithClients = await Promise.all((invoices || []).map(async (invoice) => {
            const { data: client, error: clientError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', invoice.user_id)
                .single();

            if (clientError) {
                console.error(`Error fetching client for invoice ${invoice.id}:`, clientError);
                return {
                    ...invoice,
                    client: {
                        id: invoice.user_id,
                        first_name: 'Unknown',
                        last_name: 'Client'
                    }
                };
            }

            return {
                ...invoice,
                client
            };
        }));

        const InvoicesView = require('./InvoicesView').default;
        
        return <InvoicesView user={session.user} userProfile={userProfile} invoices={invoicesWithClients} />;
    } catch (error) {
        console.error('Error in invoices page:', error);
        redirect('/login?error=server_error');
    }
}