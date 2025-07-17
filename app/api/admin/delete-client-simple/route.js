import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function DELETE(request) {
    try {
        // Create server component client for auth
        const supabase = createServerComponentClient({ cookies });
        
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError) {
            console.error('Auth error:', authError);
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
        }

        // Verify user has dispatcher role
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            return NextResponse.json({ error: 'Failed to verify user profile' }, { status: 500 });
        }

        if (!userProfile || userProfile.role !== 'dispatcher') {
            return NextResponse.json({ error: 'Unauthorized - Dispatcher access required' }, { status: 403 });
        }

        // Get client ID from request body
        const { clientId } = await request.json();
        
        if (!clientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        console.log(`Starting deletion process for client: ${clientId}`);

        // Create admin client for deletion operations
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Get client details to verify they exist and have correct role
        const { data: clientProfile, error: clientError } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError) {
            console.error('Error fetching client profile:', clientError);
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        if (!clientProfile || clientProfile.role !== 'client') {
            return NextResponse.json({ error: 'Invalid client - must have client role' }, { status: 400 });
        }

        // Check for pending trips that would prevent deletion
        const { data: pendingTrips, error: tripsError } = await adminSupabase
            .from('trips')
            .select('id, status')
            .eq('user_id', clientId)
            .in('status', ['pending', 'upcoming', 'in_progress']);

        if (tripsError) {
            console.error('Error checking pending trips:', tripsError);
        }

        if (pendingTrips && pendingTrips.length > 0) {
            return NextResponse.json({ 
                error: `Cannot delete client with ${pendingTrips.length} pending/upcoming trips. Please complete or cancel these trips first.`,
                pendingTrips: pendingTrips.length 
            }, { status: 400 });
        }

        console.log(`Client validation passed. Proceeding with deletion for: ${clientProfile.email}`);

        // Step 1: Delete related trips
        const { error: tripsDeleteError } = await adminSupabase
            .from('trips')
            .delete()
            .eq('user_id', clientId);

        if (tripsDeleteError) {
            console.error('Error deleting trips:', tripsDeleteError);
            // Continue with deletion - trips may not exist
        } else {
            console.log('Successfully deleted trips for client');
        }

        // Step 2: Delete related invoices (if table exists)
        try {
            const { error: invoicesDeleteError } = await adminSupabase
                .from('invoices')
                .delete()
                .eq('user_id', clientId);

            if (invoicesDeleteError) {
                console.log('Note: Could not delete invoices (table may not exist):', invoicesDeleteError);
            } else {
                console.log('Successfully deleted invoices for client');
            }
        } catch (error) {
            console.log('Invoices table does not exist, skipping');
        }

        // Step 3: Delete managed client records if they exist
        try {
            const { error: managedClientError } = await adminSupabase
                .from('facility_managed_clients')
                .delete()
                .eq('email', clientProfile.email);

            if (managedClientError) {
                console.log('Note: Could not delete managed client records:', managedClientError);
            } else {
                console.log('Successfully deleted managed client records');
            }
        } catch (error) {
            console.log('Managed clients table does not exist, skipping');
        }

        // Step 4: Delete the profile
        const { error: profileDeleteError } = await adminSupabase
            .from('profiles')
            .delete()
            .eq('id', clientId);

        if (profileDeleteError) {
            console.error('Error deleting profile:', profileDeleteError);
            return NextResponse.json({ error: 'Failed to delete client profile' }, { status: 500 });
        }

        console.log('Successfully deleted client profile');

        // Step 5: Delete the auth user
        const { error: userDeleteError } = await adminSupabase.auth.admin.deleteUser(clientId);

        if (userDeleteError) {
            console.error('Error deleting auth user:', userDeleteError);
            return NextResponse.json({ error: 'Failed to delete user authentication' }, { status: 500 });
        }

        console.log('Successfully deleted auth user');
        console.log(`Client deletion completed successfully for: ${clientProfile.email}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Client deleted successfully',
            deletedEmail: clientProfile.email 
        });

    } catch (error) {
        console.error('Unexpected error during client deletion:', error);
        return NextResponse.json({ 
            error: 'Internal server error during deletion',
            details: error.message 
        }, { status: 500 });
    }
}