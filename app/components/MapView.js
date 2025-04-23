'use client';

import { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const defaultCenter = {
  lat: 37.7749,
  lng: -122.4194
};

const mapOptions = {
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ],
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false
};

export function MapView({ user, userProfile, drivers = [], trips = [] }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  });

  const [map, setMap] = useState(null);

  const onLoad = useCallback(map => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Process drivers data to add default positions if not available
  const processedDrivers = useMemo(() => {
    return drivers ? drivers.map(driver => {
      // Get driver name
      const driverName = driver.full_name || 
                        `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 
                        driver.email || 
                        'Unnamed Driver';
      
      // Default position if not available
      let position = driver.current_position;
      if (!position) {
        // Default to San Francisco with slight random offset for demonstration
        position = { 
          lat: 37.7749 + (Math.random() * 0.04 - 0.02), 
          lng: -122.4194 + (Math.random() * 0.04 - 0.02) 
        };
      }
      
      // Format the status
      let status = driver.status || 'offline';
      
      return {
        id: driver.id,
        name: driverName,
        position,
        status,
        email: driver.email,
        type: 'driver'
      };
    }) : [];
  }, [drivers]);
  
  // Process trips data
  const processedTrips = useMemo(() => {
    return trips ? trips.map(trip => {
      // Get pickup/dropoff coordinates
      let pickup = null;
      let dropoff = null;
      
      try {
        // Try to parse coordinates from stored values
        if (trip.pickup_coordinates) {
          if (typeof trip.pickup_coordinates === 'string') {
            const [lat, lng] = trip.pickup_coordinates.split(',').map(Number);
            pickup = { lat, lng };
          } else if (trip.pickup_coordinates.lat && trip.pickup_coordinates.lng) {
            pickup = trip.pickup_coordinates;
          }
        }
        
        if (trip.dropoff_coordinates) {
          if (typeof trip.dropoff_coordinates === 'string') {
            const [lat, lng] = trip.dropoff_coordinates.split(',').map(Number);
            dropoff = { lat, lng };
          } else if (trip.dropoff_coordinates.lat && trip.dropoff_coordinates.lng) {
            dropoff = trip.dropoff_coordinates;
          }
        }
        
        // If coordinates are not available, extract from addresses using geocoding
        // This would typically use the Google Geocoding API
        
        // For demo, use default values if coordinates are not available
        if (!pickup) {
          // For demo, generate a random position near San Francisco
          pickup = { 
            lat: 37.7749 + (Math.random() * 0.02 - 0.01), 
            lng: -122.4194 + (Math.random() * 0.02 - 0.01) 
          };
        }
        
        if (!dropoff) {
          // Generate a position that's slightly offset from pickup
          dropoff = { 
            lat: pickup.lat + (Math.random() * 0.01 - 0.005), 
            lng: pickup.lng + (Math.random() * 0.01 - 0.005) 
          };
        }
      } catch (error) {
        console.error('Error processing trip coordinates:', error);
        // Default fallback coordinates for San Francisco
        pickup = { lat: 37.7749, lng: -122.4194 };
        dropoff = { lat: 37.7849, lng: -122.4294 };
      }
      
      // Get client name
      let clientName = trip.client_name;
      if (!clientName) {
        clientName = trip.user_id ? `Client ${trip.user_id.substring(0, 4)}` : 'Unknown Client';
      }
      
      return {
        id: trip.id,
        client_name: clientName,
        pickup,
        dropoff,
        status: trip.status || 'upcoming',
        pickup_time: trip.pickup_time,
        driver_id: trip.driver_id,
        pickup_address: trip.pickup_address,
        dropoff_address: trip.dropoff_address
      };
    }) : [];
  }, [trips]);
  
  const driverStatusColors = {
    available: '#34D399', // green
    on_trip: '#F59E0B',  // amber
    offline: '#9CA3AF'    // gray
  };
  
  const tripStatusColors = {
    upcoming: '#3B82F6',  // blue
    in_progress: '#F59E0B', // amber
    completed: '#34D399',  // green
    cancelled: '#EF4444'   // red
  };

  const visibleDrivers = useMemo(() => {
    return processedDrivers.filter(driver => activeFilter === 'all' || activeFilter === driver.status);
  }, [processedDrivers, activeFilter]);

  const visibleTrips = useMemo(() => {
    return processedTrips.filter(trip => activeFilter === 'all' || activeFilter === 'on_trip');
  }, [processedTrips, activeFilter]);

  const formatPickupTime = (pickupTime) => {
    if (!pickupTime) return 'No pickup time specified';
    
    try {
      return new Date(pickupTime).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error('Error formatting pickup time:', e);
      return 'Invalid pickup time';
    }
  };

  if (loadError) {
    return <div className="p-4 text-center">Error loading maps</div>;
  }

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Map Container */}
        <div className="lg:flex-1">
          <div className="bg-brand-card border border-brand-border rounded-lg shadow-md overflow-hidden">
            <div className="flex p-4 justify-between items-center border-b border-brand-border">
              <h2 className="text-lg font-medium">Driver Map</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeFilter === 'all' ? 'bg-brand-accent text-brand-buttonText' : 'bg-brand-border/20 hover:bg-brand-border/30'
                  }`}
                >
                  All
                </button>
                <button 
                  onClick={() => setActiveFilter('available')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeFilter === 'available' ? 'bg-brand-accent text-brand-buttonText' : 'bg-brand-border/20 hover:bg-brand-border/30'
                  }`}
                >
                  Available
                </button>
                <button 
                  onClick={() => setActiveFilter('on_trip')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeFilter === 'on_trip' ? 'bg-brand-accent text-brand-buttonText' : 'bg-brand-border/20 hover:bg-brand-border/30'
                  }`}
                >
                  On Trip
                </button>
                <button 
                  onClick={() => setActiveFilter('offline')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeFilter === 'offline' ? 'bg-brand-accent text-brand-buttonText' : 'bg-brand-border/20 hover:bg-brand-border/30'
                  }`}
                >
                  Offline
                </button>
              </div>
            </div>
            <div className="h-[500px] w-full relative">
              {!isLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-background/60">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-sm">Loading map...</span>
                  </div>
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={defaultCenter}
                  zoom={13}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                  options={mapOptions}
                >
                  {/* Driver Markers */}
                  {visibleDrivers.map(driver => (
                    <Marker
                      key={`driver-${driver.id}`}
                      position={driver.position}
                      title={driver.name}
                      onClick={() => setSelectedMarker({ ...driver, type: 'driver' })}
                      icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: driverStatusColors[driver.status] || '#9CA3AF',
                        fillOpacity: 1,
                        strokeWeight: 1,
                        strokeColor: '#FFFFFF',
                        scale: 10
                      }}
                      zIndex={2}
                    />
                  ))}

                  {/* Trip Markers and Polylines */}
                  {visibleTrips.map(trip => (
                    <div key={`trip-${trip.id}`}>
                      {/* Pickup Marker */}
                      <Marker
                        position={trip.pickup}
                        title={`Pickup: ${trip.client_name}`}
                        onClick={() => setSelectedMarker({ ...trip, type: 'pickup' })}
                        icon={{
                          path: 'M12,2C8.14,2 5,5.14 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.86 -3.14,-7 -7,-7zM12,4c1.1,0 2,0.9 2,2c0,1.11 -0.9,2 -2,2s-2,-0.89 -2,-2c0,-1.1 0.9,-2 2,-2zM12,14c-1.67,0 -3.14,-0.85 -4,-2.15c0.02,-1.32 2.67,-2.05 4,-2.05s3.98,0.73 4,2.05c-0.86,1.3 -2.33,2.15 -4,2.15z',
                          fillColor: tripStatusColors[trip.status] || '#3B82F6',
                          fillOpacity: 1,
                          strokeWeight: 1,
                          strokeColor: '#FFFFFF',
                          scale: 1.5,
                          anchor: new window.google.maps.Point(12, 24)
                        }}
                        zIndex={1}
                      />
                      
                      {/* Dropoff Marker */}
                      <Marker
                        position={trip.dropoff}
                        title={`Dropoff: ${trip.client_name}`}
                        onClick={() => setSelectedMarker({ ...trip, type: 'dropoff' })}
                        icon={{
                          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                          fillColor: '#9CA3AF',
                          fillOpacity: 1,
                          strokeWeight: 1,
                          strokeColor: '#FFFFFF',
                          scale: 1.5,
                          anchor: new window.google.maps.Point(12, 24)
                        }}
                        zIndex={1}
                      />
                      
                      {/* Polyline between pickup and dropoff */}
                      <Polyline
                        path={[trip.pickup, trip.dropoff]}
                        options={{
                          geodesic: true,
                          strokeColor: tripStatusColors[trip.status] || '#3B82F6',
                          strokeOpacity: 0.7,
                          strokeWeight: 3
                        }}
                      />
                    </div>
                  ))}

                  {/* InfoWindow for selected marker */}
                  {selectedMarker && (
                    <InfoWindow
                      position={
                        selectedMarker.type === 'driver' 
                          ? selectedMarker.position 
                          : selectedMarker.type === 'pickup' 
                            ? selectedMarker.pickup 
                            : selectedMarker.dropoff
                      }
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <div className="p-2">
                        {selectedMarker.type === 'driver' ? (
                          <>
                            <strong>{selectedMarker.name}</strong><br />
                            <span className="capitalize">{selectedMarker.status.replace('_', ' ')}</span><br />
                            {selectedMarker.email && <span className="text-sm">{selectedMarker.email}</span>}
                          </>
                        ) : (
                          <>
                            <strong>{selectedMarker.client_name}</strong><br />
                            <span>{selectedMarker.type === 'pickup' ? 'Pickup' : 'Dropoff'}</span><br />
                            {selectedMarker.pickup_time && (
                              <span>at {formatPickupTime(selectedMarker.pickup_time)}</span>
                            )}<br />
                            <span className="capitalize">{selectedMarker.status.replace('_', ' ')}</span>
                          </>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="lg:w-80">
          <div className="bg-brand-card border border-brand-border rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-brand-border">
              <h3 className="font-medium">Active Drivers</h3>
            </div>
            <div className="divide-y divide-brand-border max-h-96 overflow-y-auto">
              {visibleDrivers.length > 0 ? (
                visibleDrivers.map(driver => (
                  <div key={driver.id} className="p-4 hover:bg-brand-border/5">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: driverStatusColors[driver.status] || '#9CA3AF' }}
                      />
                      <span className="font-medium">{driver.name}</span>
                    </div>
                    <div className="mt-1 text-sm opacity-70">
                      {driver.email}
                    </div>
                    <div className="mt-1 text-sm opacity-70 capitalize">
                      {driver.status.replace('_', ' ')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center opacity-70">
                  No drivers available
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-brand-card border border-brand-border rounded-lg shadow-md overflow-hidden mt-4">
            <div className="p-4 border-b border-brand-border">
              <h3 className="font-medium">In-Progress Trips</h3>
            </div>
            <div className="divide-y divide-brand-border max-h-96 overflow-y-auto">
              {processedTrips.length > 0 ? (
                processedTrips.map(trip => (
                  <div key={trip.id} className="p-4 hover:bg-brand-border/5">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: tripStatusColors[trip.status] || '#3B82F6' }}
                      />
                      <span className="font-medium">{trip.client_name}</span>
                    </div>
                    {trip.pickup_time && (
                      <div className="mt-1 text-sm opacity-70">
                        Pickup: {new Date(trip.pickup_time).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    )}
                    <div className="mt-1 text-sm opacity-70">
                      From: {trip.pickup_address ? trip.pickup_address.substring(0, 25) + '...' : 'Unknown location'}
                    </div>
                    <div className="mt-1 text-sm opacity-70">
                      To: {trip.dropoff_address ? trip.dropoff_address.substring(0, 25) + '...' : 'Unknown location'}
                    </div>
                    {trip.driver_id && (
                      <div className="mt-2 text-xs bg-brand-accent/10 text-brand-accent px-2 py-1 rounded-full inline-block">
                        Assigned to driver
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center opacity-70">
                  No in-progress trips
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}