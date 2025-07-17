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

        // Get managed client ID from request body
        const { managedClientId } = await request.json();
        
        if (!managedClientId) {
            return NextResponse.json({ error: 'Managed client ID is required' }, { status: 400 });
        }

        console.log(`Starting deletion process for managed client: ${managedClientId}`);

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

        // Get managed client details to verify they exist
        const { data: managedClient, error: clientError } = await adminSupabase
            .from('facility_managed_clients')
            .select('*')
            .eq('id', managedClientId)
            .single();

        if (clientError) {
            console.error('Error fetching managed client:', clientError);
            return NextResponse.json({ error: 'Managed client not found' }, { status: 404 });
        }

        console.log(`Managed client validation passed. Proceeding with deletion for: ${managedClient.email}`);

        // Check for pending trips that would prevent deletion
        const { data: pendingTrips, error: tripsError } = await adminSupabase
            .from('trips')
            .select('id, status')
            .eq('managed_client_id', managedClientId)
            .in('status', ['pending', 'upcoming', 'in_progress']);

        if (tripsError) {
            console.error('Error checking pending trips:', tripsError);
        }

        if (pendingTrips && pendingTrips.length > 0) {
            return NextResponse.json({ 
                error: `Cannot delete managed client with ${pendingTrips.length} pending/upcoming trips. Please complete or cancel these trips first.`,
                pendingTrips: pendingTrips.length 
            }, { status: 400 });
        }

        // Step 1: Delete related trips by managed_client_id
        const { error: tripsDeleteError } = await adminSupabase
            .from('trips')
            .delete()
            .eq('managed_client_id', managedClientId);

        if (tripsDeleteError) {
            console.error('Error deleting trips:', tripsDeleteError);
            // Continue with deletion - trips may not exist
        } else {
            console.log('Successfully deleted trips for managed client');
        }

        // Step 2: Delete related invoices by email (if table exists)
        try {
            const { error: invoicesDeleteError } = await adminSupabase
                .from('invoices')
                .delete()
                .eq('client_email', managedClient.email);

            if (invoicesDeleteError) {
                console.log('Note: Could not delete invoices (table may not exist):', invoicesDeleteError);
            } else {
                console.log('Successfully deleted invoices for managed client');
            }
        } catch (error) {
            console.log('Invoices table does not exist, skipping');
        }

        // Step 3: Delete the managed client record
        const { error: managedClientDeleteError } = await adminSupabase
            .from('facility_managed_clients')
            .delete()
            .eq('id', managedClientId);

        if (managedClientDeleteError) {
            console.error('Error deleting managed client record:', managedClientDeleteError);
            return NextResponse.json({ error: 'Failed to delete managed client record' }, { status: 500 });
        }

        console.log('Successfully deleted managed client record');
        console.log(`Managed client deletion completed successfully for: ${managedClient.email}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Managed client deleted successfully',
            deletedEmail: managedClient.email 
        });

    } catch (error) {
        console.error('Unexpected error during managed client deletion:', error);
        return NextResponse.json({ 
            error: 'Internal server error during deletion',
            details: error.message 
        }, { status: 500 });
    }
}