'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * SuperSimpleMap - Just show a route between two addresses
 * Fixed for dynamic import compatibility
 */
export default function SuperSimpleMap({ 
  origin, 
  destination, 
  onRouteCalculated = null,
  className = "w-full h-64 rounded-lg border border-gray-200"
}) {
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  // Use layoutEffect to ensure DOM is ready
  useLayoutEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !origin || !destination) {
      setIsLoading(false);
      return;
    }

    console.log('SuperSimpleMap: Starting route calculation for', origin, 'to', destination);
    setIsLoading(true);
    setError('');
    setRouteInfo(null);

    const initMapWithRetry = (retryCount = 0) => {
      console.log('SuperSimpleMap: Attempting to initialize map (attempt', retryCount + 1, ')');
      
      // First check if Google Maps API is available
      if (!window.google || !window.google.maps) {
        console.log('SuperSimpleMap: Google Maps API not ready, will retry...');
        
        if (retryCount < 30) { // Wait up to 15 seconds for Google Maps API
          const delay = 500; // Check every 500ms
          setTimeout(() => {
            initMapWithRetry(retryCount + 1);
          }, delay);
        } else {
          console.error('SuperSimpleMap: Google Maps API failed to load after', retryCount + 1, 'attempts');
          setError('Google Maps API failed to load. Please refresh the page and try again.');
          setIsLoading(false);
        }
        return;
      }
      
      // Then check if component is mounted and map container is ready
      if (!isMounted || !mapRef.current) {
        console.log('SuperSimpleMap: Map container not ready, will retry...');
        
        // Retry up to 10 times with shorter delays for DOM readiness
        if (retryCount < 40) { // Total 20 second timeout
          const delay = 100; // Check every 100ms for DOM readiness
          setTimeout(() => {
            initMapWithRetry(retryCount + 1);
          }, delay);
        } else {
          console.error('SuperSimpleMap: Map container still not ready after', retryCount + 1, 'attempts');
          setError('Map container failed to initialize. The component may not be fully loaded yet.');
          setIsLoading(false);
        }
        return;
      }

      console.log('SuperSimpleMap: Both Google Maps API and container ready, proceeding with initialization');

      try {
        // Create the map
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 13,
          center: { lat: 39.9612, lng: -82.9988 }, // Columbus, OH
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        console.log('SuperSimpleMap: Map created successfully');

        // Create directions service and renderer
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 4,
          },
        });

        directionsRenderer.setMap(map);
        console.log('SuperSimpleMap: Directions renderer ready');

        // Calculate route
        const request = {
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        };

        console.log('SuperSimpleMap: Calculating route...');
        directionsService.route(request, (result, status) => {
          console.log('SuperSimpleMap: Route calculation result:', status);
          
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Extract route info
            const route = result.routes[0];
            const leg = route.legs[0];
            
            const info = {
              distance: {
                text: leg.distance.text,
                value: leg.distance.value,
                miles: Math.round((leg.distance.value * 0.000621371) * 100) / 100
              },
              duration: {
                text: leg.duration.text,
                value: leg.duration.value
              }
            };
            
            console.log('SuperSimpleMap: Route calculated successfully:', info);
            setRouteInfo(info);
            if (onRouteCalculated) {
              onRouteCalculated(info);
            }
            
            setIsLoading(false);
            setError('');
          } else {
            console.error('SuperSimpleMap: Route calculation failed:', status);
            setError(`Could not calculate route: ${status}`);
            setIsLoading(false);
          }
        });

      } catch (err) {
        console.error('SuperSimpleMap: Error initializing map:', err);
        setError(`Failed to load map: ${err.message}`);
        setIsLoading(false);
      }
    };

    // Start initialization process
    initMapWithRetry();

  }, [origin, destination, onRouteCalculated, isMounted]);

  // Don't render anything if not mounted (prevents SSR issues)
  if (!isMounted) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-center">
            <div className="animate-pulse h-8 w-8 bg-gray-300 rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center p-4">
            <div className="text-red-600 mb-2">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 text-sm font-medium mb-3">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setError('');
                  setIsLoading(true);
                  setIsMounted(false);
                  // Force re-initialization by resetting mount state
                  setTimeout(() => {
                    setIsMounted(true);
                  }, 100);
                }}
                className="px-4 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors block mx-auto"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors block mx-auto"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="relative mx-auto mb-3">
              <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-blue-600 text-sm font-medium">Loading route map...</p>
            <p className="text-blue-500 text-xs mt-1">Calculating best route between locations</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={className}>
        <div ref={mapRef} className="w-full h-full rounded-lg" />
      </div>
      
      {routeInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-800">{routeInfo.distance.text}</div>
                <div className="text-xs text-green-600">({routeInfo.distance.miles} miles)</div>
              </div>
              <div className="h-8 w-px bg-green-300"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-800">{routeInfo.duration.text}</div>
                <div className="text-xs text-green-600">driving time</div>
              </div>
            </div>
            <div className="text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
