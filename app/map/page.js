'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

// Set default map container style
const mapContainerStyle = {
  width: '100%',
  height: '700px',
};

// Default center for the map (can be adjusted)
const defaultCenter = {
  lat: 37.7749, // San Francisco coordinates as an example
  lng: -122.4194,
};

export default function DriverMap() {
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  
  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Ensure user has dispatcher role
    if (!isDispatcher()) {
      signOut();
      router.push('/login?error=Access denied. This application is only for dispatchers.');
      return;
    }

    // Function to fetch active drivers
    async function fetchActiveDrivers() {
      try {
        // First, get all trips that are in_progress
        const { data: activeTrips, error: tripsError } = await supabase
          .from('trips')
          .select('*, driver:driver_id(*)')
          .eq('status', 'in_progress');

        if (tripsError) throw tripsError;
        
        // Now get the current locations for these drivers
        const driverIds = activeTrips.map(trip => trip.driver_id).filter(Boolean);
        
        if (driverIds.length === 0) {
          setActiveDrivers([]);
          setLoading(false);
          return;
        }

        const { data: driverLocations, error: locationsError } = await supabase
          .from('driver_locations')
          .select('*')
          .in('driver_id', driverIds)
          .order('updated_at', { ascending: false });

        if (locationsError) throw locationsError;

        // Combine trip data with location data
        const driversWithLocations = activeTrips
          .filter(trip => trip.driver && trip.driver_id)
          .map(trip => {
            const location = driverLocations.find(loc => loc.driver_id === trip.driver_id);
            return {
              tripId: trip.id,
              driverId: trip.driver_id,
              driverName: trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unknown Driver',
              clientName: trip.client_name,
              pickup: trip.pickup_location,
              dropoff: trip.dropoff_location,
              location: location ? {
                lat: location.latitude,
                lng: location.longitude,
                updatedAt: location.updated_at
              } : null
            };
          })
          .filter(driver => driver.location); // Only include drivers with locations

        setActiveDrivers(driversWithLocations);
      } catch (error) {
        console.error('Error fetching active drivers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchActiveDrivers();
    
    // Set up real-time subscription to driver_locations table
    const subscription = supabase
      .channel('driver-locations-changes')
      .on('postgres_changes', 
        {
          event: 'UPDATE', 
          schema: 'public', 
          table: 'driver_locations'
        }, 
        () => {
          // Refresh data when locations update
          fetchActiveDrivers();
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [user, router, isDispatcher, signOut]);

  const handleMarkerClick = (driver) => {
    setSelectedDriver(driver);
  };

  const closeInfoWindow = () => {
    setSelectedDriver(null);
  };

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-screen">Loading Maps...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Active Drivers Map</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Driver Locations</h2>
            <div className="text-sm text-gray-600">
              {activeDrivers.length} active drivers
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading driver data...</div>
          ) : activeDrivers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No active drivers found</div>
          ) : (
            <div className="rounded-lg overflow-hidden">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={activeDrivers.length > 0 ? activeDrivers[0].location : defaultCenter}
                zoom={12}
              >
                {activeDrivers.map((driver) => (
                  <Marker
                    key={driver.driverId}
                    position={driver.location}
                    onClick={() => handleMarkerClick(driver)}
                  />
                ))}

                {selectedDriver && (
                  <InfoWindow
                    position={selectedDriver.location}
                    onCloseClick={closeInfoWindow}
                  >
                    <div className="p-2">
                      <h3 className="font-bold text-sm">{selectedDriver.driverName}</h3>
                      <p className="text-xs mt-1">Client: {selectedDriver.clientName}</p>
                      <p className="text-xs mt-1">From: {selectedDriver.pickup}</p>
                      <p className="text-xs mt-1">To: {selectedDriver.dropoff}</p>
                      <p className="text-xs mt-1 text-gray-500">
                        Last updated: {new Date(selectedDriver.location.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </div>
          )}
        </div>
        
        {/* Driver list for quick reference */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Driver Details</h3>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading driver data...</div>
          ) : activeDrivers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No active drivers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeDrivers.map((driver) => (
                    <tr key={driver.driverId} 
                        className={`${selectedDriver?.driverId === driver.driverId ? 'bg-blue-50' : ''} 
                                   hover:bg-gray-50 cursor-pointer`}
                        onClick={() => handleMarkerClick(driver)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {driver.driverName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {driver.clientName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {driver.pickup} → {driver.dropoff}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(driver.location.updatedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}