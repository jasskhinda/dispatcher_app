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

        // Get facility ID from request body
        const { facilityId } = await request.json();
        
        if (!facilityId) {
            return NextResponse.json({ error: 'Facility ID is required' }, { status: 400 });
        }

        console.log(`Starting deletion process for facility: ${facilityId}`);

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

        // Get facility details to verify it exists
        const { data: facility, error: facilityError } = await adminSupabase
            .from('facilities')
            .select('*')
            .eq('id', facilityId)
            .single();

        if (facilityError) {
            console.error('Error fetching facility:', facilityError);
            return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
        }

        console.log(`Facility validation passed. Proceeding with deletion for: ${facility.name}`);

        // Check for pending trips that would prevent deletion
        const { data: pendingTrips, error: tripsError } = await adminSupabase
            .from('trips')
            .select('id, status')
            .eq('facility_id', facilityId)
            .in('status', ['pending', 'upcoming', 'in_progress']);

        if (tripsError) {
            console.error('Error checking pending trips:', tripsError);
        }

        if (pendingTrips && pendingTrips.length > 0) {
            return NextResponse.json({ 
                error: `Cannot delete facility with ${pendingTrips.length} pending/upcoming trips. Please complete or cancel these trips first.`,
                pendingTrips: pendingTrips.length 
            }, { status: 400 });
        }

        // Get all facility administrators
        const { data: facilityAdmins, error: adminsError } = await adminSupabase
            .from('profiles')
            .select('id, email')
            .eq('role', 'facility')
            .eq('facility_id', facilityId);

        if (adminsError) {
            console.error('Error fetching facility admins:', adminsError);
        }

        // Get all facility clients
        const { data: facilityClients, error: clientsError } = await adminSupabase
            .from('profiles')
            .select('id, email')
            .eq('role', 'client')
            .eq('facility_id', facilityId);

        if (clientsError) {
            console.error('Error fetching facility clients:', clientsError);
        }

        // Get all managed clients
        const { data: managedClients, error: managedError } = await adminSupabase
            .from('facility_managed_clients')
            .select('id, email')
            .eq('facility_id', facilityId);

        if (managedError) {
            console.log('Note: Could not fetch managed clients (table may not exist):', managedError);
        }

        console.log(`Found ${facilityAdmins?.length || 0} facility admins, ${facilityClients?.length || 0} facility clients, ${managedClients?.length || 0} managed clients`);

        // Collect all user IDs that will be deleted
        const allUserIds = [
            ...(facilityAdmins || []).map(admin => admin.id),
            ...(facilityClients || []).map(client => client.id)
        ];

        // Step 1: Delete all trips for this facility
        const { error: tripsDeleteError } = await adminSupabase
            .from('trips')
            .delete()
            .eq('facility_id', facilityId);

        if (tripsDeleteError) {
            console.error('Error deleting facility trips:', tripsDeleteError);
            // Continue with deletion
        } else {
            console.log('Successfully deleted facility trips');
        }

        // Step 2: Delete all invoices for facility users (if table exists)
        if (allUserIds.length > 0) {
            try {
                const { error: invoicesDeleteError } = await adminSupabase
                    .from('invoices')
                    .delete()
                    .in('user_id', allUserIds);

                if (invoicesDeleteError) {
                    console.log('Note: Could not delete invoices (table may not exist):', invoicesDeleteError);
                } else {
                    console.log('Successfully deleted invoices for facility users');
                }
            } catch (error) {
                console.log('Invoices table does not exist, skipping');
            }
        }

        // Step 3: Delete managed client records
        if (managedClients && managedClients.length > 0) {
            try {
                const { error: managedDeleteError } = await adminSupabase
                    .from('facility_managed_clients')
                    .delete()
                    .eq('facility_id', facilityId);

                if (managedDeleteError) {
                    console.error('Error deleting managed clients:', managedDeleteError);
                } else {
                    console.log('Successfully deleted managed client records');
                }
            } catch (error) {
                console.log('Managed clients table does not exist, skipping');
            }
        }

        // Step 4: Delete facility client and admin profiles
        if (allUserIds.length > 0) {
            const { error: profilesDeleteError } = await adminSupabase
                .from('profiles')
                .delete()
                .in('id', allUserIds);

            if (profilesDeleteError) {
                console.error('Error deleting facility user profiles:', profilesDeleteError);
                return NextResponse.json({ error: 'Failed to delete facility user profiles' }, { status: 500 });
            }

            console.log('Successfully deleted facility user profiles');

            // Step 5: Delete auth users for facility clients and admins
            for (const userId of allUserIds) {
                try {
                    const { error: userDeleteError } = await adminSupabase.auth.admin.deleteUser(userId);
                    if (userDeleteError) {
                        console.error(`Error deleting auth user ${userId}:`, userDeleteError);
                    } else {
                        console.log(`Successfully deleted auth user: ${userId}`);
                    }
                } catch (error) {
                    console.error(`Exception deleting auth user ${userId}:`, error);
                }
            }
        }

        // Step 6: Finally delete the facility record
        const { error: facilityDeleteError } = await adminSupabase
            .from('facilities')
            .delete()
            .eq('id', facilityId);

        if (facilityDeleteError) {
            console.error('Error deleting facility record:', facilityDeleteError);
            return NextResponse.json({ error: 'Failed to delete facility record' }, { status: 500 });
        }

        console.log('Successfully deleted facility record');
        console.log(`Facility deletion completed successfully for: ${facility.name}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Facility deleted successfully',
            deletedFacility: facility.name,
            deletedUsers: allUserIds.length,
            deletedManagedClients: managedClients?.length || 0
        });

    } catch (error) {
        console.error('Unexpected error during facility deletion:', error);
        return NextResponse.json({ 
            error: 'Internal server error during deletion',
            details: error.message 
        }, { status: 500 });
    }
}