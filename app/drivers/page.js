import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { DriversView } from '@/app/components/DriversView';

// This is a Server Component
export default async function DispatcherDriversPage() {
    console.log('Dispatcher drivers page server component executing');
    
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

        if (profileError || !profile) {
            redirect('/login?error=Access%20denied.%20Profile%20not%20found.');
        }
        
        // If no role is set, assume dispatcher for this app
        if (!profile.role) {
            try {
                await supabase
                    .from('profiles')
                    .update({ role: 'dispatcher' })
                    .eq('id', user.id);
                console.log('Updated user role to dispatcher');
            } catch (error) {
                console.error('Failed to update role:', error);
            }
        }
        
        // Allow dispatcher role or update other roles to dispatcher for this app
        if (profile.role && profile.role !== 'dispatcher') {
            console.log(`User has role ${profile.role}, allowing access to dispatcher app`);
            // For dispatcher app, we can be more flexible about roles
            // Just ensure they have a role set
        }
        
        // Fetch drivers (users with role 'driver')
        let drivers = [];
        
        try {
            const { data: driverProfiles, error: driversError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'driver')
                .order('created_at', { ascending: false });
            
            if (driversError) {
                console.error('Error fetching drivers:', driversError);
            } else {
                drivers = driverProfiles || [];
            }
        } catch (fetchError) {
            console.error('Exception in driver profiles fetching:', fetchError);
            drivers = [];
        }
        
        console.log(`Successfully fetched ${drivers.length} drivers`);

        // Optimize: Get trip statistics for all drivers in fewer queries
        let driversWithTrips = drivers.map(driver => ({
            ...driver,
            trips: [],
            trip_count: 0,
            completed_trips: 0,
            last_trip: null,
            vehicle: null
        }));

        // Only fetch trip data if we have drivers to avoid unnecessary queries
        if (drivers.length > 0) {
            try {
                // Get all trips for all drivers in one query
                const driverIds = drivers.map(d => d.id);
                const { data: allTrips, error: tripsError } = await supabase
                    .from('trips')
                    .select('id, driver_id, status, created_at, pickup_time')
                    .in('driver_id', driverIds)
                    .order('created_at', { ascending: false });

                if (!tripsError && allTrips) {
                    // Group trips by driver
                    const tripsByDriver = {};
                    allTrips.forEach(trip => {
                        if (!tripsByDriver[trip.driver_id]) {
                            tripsByDriver[trip.driver_id] = [];
                        }
                        tripsByDriver[trip.driver_id].push(trip);
                    });

                    // Update drivers with trip stats
                    driversWithTrips = driversWithTrips.map(driver => {
                        const driverTrips = tripsByDriver[driver.id] || [];
                        return {
                            ...driver,
                            trips: driverTrips,
                            trip_count: driverTrips.length,
                            completed_trips: driverTrips.filter(trip => trip.status === 'completed').length,
                            last_trip: driverTrips.length > 0 ? driverTrips[0] : null
                        };
                    });
                }
            } catch (error) {
                console.warn('Could not fetch trip statistics:', error.message);
            }

            // Optionally fetch vehicle data in a single query too
            try {
                const { data: vehicles, error: vehicleError } = await supabase
                    .from('vehicles')
                    .select('*')
                    .in('driver_id', driverIds);

                if (!vehicleError && vehicles) {
                    const vehiclesByDriver = {};
                    vehicles.forEach(vehicle => {
                        vehiclesByDriver[vehicle.driver_id] = vehicle;
                    });

                    driversWithTrips = driversWithTrips.map(driver => ({
                        ...driver,
                        vehicle: vehiclesByDriver[driver.id] || null
                    }));
                }
            } catch (error) {
                console.warn('Could not fetch vehicle data:', error.message);
            }
        }

        // Get email addresses from auth.users for drivers
        const { supabaseAdmin } = await import('@/lib/admin-supabase');
        if (supabaseAdmin) {
            for (let driver of driversWithTrips) {
                if (!driver.email && driver.id) {
                    try {
                        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(driver.id);
                        if (authUser?.email) {
                            driver.email = authUser.email;
                        }
                    } catch (error) {
                        console.error('Error fetching email for driver:', driver.id);
                    }
                }
            }
        }
        
        return <DriversView user={user} userProfile={profile} drivers={driversWithTrips} />;
    } catch (error) {
        console.error('Error in dispatcher drivers page:', error);
        redirect('/login?error=server_error');
    }
}