'use client';

import { DriversView } from '@/app/components/DriversView';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function DispatcherDriversPage() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, userProfile } = useAuth();

    useEffect(() => {
        async function loadDrivers() {
            try {
                // Check if user is authenticated through context
                if (!user || !userProfile) {
                    setLoading(false);
                    return;
                }

                // First, let's check what profiles exist
                const { data: allProfiles } = await supabase
                    .from('profiles')
                    .select('id, role, email, full_name')
                    .limit(20);
                
                console.log('Sample profiles in database:', allProfiles?.map(p => ({ role: p.role, email: p.email })));
                
                // Fetch drivers
                console.log('Fetching drivers from profiles table...');
                const { data: driverProfiles, error: driversError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'driver')
                    .order('created_at', { ascending: false });
                
                console.log('Driver query result:', { driverProfiles, driversError });
                
                if (driversError) {
                    console.error('Error fetching drivers:', driversError);
                    setDrivers([]);
                    return;
                }
                
                const driversData = driverProfiles || [];
                console.log(`Found ${driversData.length} drivers`);
                
                // Get trip statistics for all drivers
                let driversWithTrips = driversData.map(driver => ({
                    ...driver,
                    trips: [],
                    trip_count: 0,
                    completed_trips: 0,
                    last_trip: null,
                    vehicle: null
                }));

                if (driversData.length > 0) {
                    // Get all trips for all drivers in one query
                    const driverIds = driversData.map(d => d.id);
                    const { data: allTrips } = await supabase
                        .from('trips')
                        .select('id, driver_id, status, created_at, pickup_time')
                        .in('driver_id', driverIds)
                        .order('created_at', { ascending: false });

                    if (allTrips) {
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

                    // Get vehicle data
                    const { data: vehicles } = await supabase
                        .from('vehicles')
                        .select('*')
                        .in('driver_id', driverIds);

                    if (vehicles) {
                        const vehiclesByDriver = {};
                        vehicles.forEach(vehicle => {
                            vehiclesByDriver[vehicle.driver_id] = vehicle;
                        });

                        driversWithTrips = driversWithTrips.map(driver => ({
                            ...driver,
                            vehicle: vehiclesByDriver[driver.id] || null
                        }));
                    }
                }
                
                setDrivers(driversWithTrips);
                
            } catch (error) {
                console.error('Error loading drivers:', error);
                setDrivers([]);
            } finally {
                setLoading(false);
            }
        }
        
        loadDrivers();
    }, [user, userProfile]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading drivers...</div>
            </div>
        );
    }

    return <DriversView user={user} userProfile={userProfile} drivers={drivers} loading={loading} />;
}