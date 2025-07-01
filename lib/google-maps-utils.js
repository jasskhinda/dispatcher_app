'use client';

/**
 * Utility to manually load Google Maps API
 * 
 * This can be used in any component or page when the automatic
 * loading of Google Maps API fails.
 */

export function loadGoogleMapsApi(callback) {
  // Check if already loaded
  if (window.google && window.google.maps) {
    console.log('Google Maps already loaded');
    if (callback) callback();
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('Google Maps API key is missing');
    return;
  }
  
  // Remove any existing script to avoid conflicts
  const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
  existingScripts.forEach(script => {
    document.head.removeChild(script);
  });
  
  // Create new script
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  
  script.onload = () => {
    console.log('Google Maps loaded successfully via utility');
    if (callback) callback();
  };
  
  script.onerror = (error) => {
    console.error('Error loading Google Maps:', error);
  };
  
  document.head.appendChild(script);
}

export function checkGoogleMapsStatus() {
  return {
    windowExists: typeof window !== 'undefined',
    googleExists: typeof window !== 'undefined' && !!window.google,
    mapsExists: typeof window !== 'undefined' && !!window.google && !!window.google.maps,
    placesExists: typeof window !== 'undefined' && !!window.google && !!window.google.maps && !!window.google.maps.places,
    apiKeyExists: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  };
}

export default { loadGoogleMapsApi, checkGoogleMapsStatus };
