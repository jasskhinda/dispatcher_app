import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// This is a Server Component
export default async function NewInvoicePage({ searchParams }) {
    const trip_id = searchParams?.trip_id;
    
    try {
        // Create server component client
        const supabase = createServerComponentClient({ cookies });

        // This will refresh the session if needed
        const { data: { session } } = await supabase.auth.getSession();

        // Redirect to login if there's no session
        if (!session) {
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
                console.log('Unable to fetch user profile, using session data');
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

        // Initialize tripData and clientData
        let tripData = null;
        let clientData = null;

        // If there's a trip_id, fetch the trip data
        if (trip_id) {
            const { data: trip, error: tripError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', trip_id)
                .single();

            if (tripError) {
                console.error('Error fetching trip:', tripError);
            } else {
                tripData = trip;

                // Fetch client data for this trip
                if (trip.user_id) {
                    const { data: client, error: clientError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', trip.user_id)
                        .single();

                    if (clientError) {
                        console.error('Error fetching client:', clientError);
                    } else {
                        clientData = client;
                    }
                }
            }
        }

        // Render the new invoice form
        const NewInvoiceForm = require('./NewInvoiceForm').default;
        
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border p-6">
                    <h1 className="text-2xl font-bold mb-6">Create New Invoice</h1>
                    <NewInvoiceForm 
                        user={session.user} 
                        userProfile={userProfile} 
                        trip={tripData} 
                        client={clientData} 
                    />
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error in new invoice page:', error);
        redirect('/login?error=server_error');
    }
}