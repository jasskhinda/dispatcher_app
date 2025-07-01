'use client';

/**
 * Global Google Maps loader
 * Ensures Google Maps is loaded only once and provides a way for components
 * to check if it's ready or wait for it to load.
 */

let isGoogleMapsLoaded = false;
let isGoogleMapsLoading = false;
let googleMapsLoadPromise = null;

const API_KEY = 'AIzaSyDylwCsypHOs6T9e-JnTA7AoqOMrc3hbhE';

// Global callback function for Google Maps - only define in browser
if (typeof window !== 'undefined') {
  window.initGoogleMapsGlobal = function() {
    console.log('Google Maps loaded globally');
    isGoogleMapsLoaded = true;
    isGoogleMapsLoading = false;
    
    // Dispatch a custom event to notify components
    window.dispatchEvent(new CustomEvent('googleMapsLoaded'));
  };
}

export function loadGoogleMaps() {
  // Return early if not in browser
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  console.log('loadGoogleMaps called, current state:', {
    isLoaded: isGoogleMapsLoaded,
    isLoading: isGoogleMapsLoading,
    windowGoogle: !!window.google
  });

  // Already loaded
  if (isGoogleMapsLoaded || (window.google && window.google.maps && window.google.maps.places)) {
    console.log('Google Maps already loaded');
    return Promise.resolve();
  }

  // Already loading
  if (isGoogleMapsLoading && googleMapsLoadPromise) {
    console.log('Google Maps already loading, returning existing promise');
    return googleMapsLoadPromise;
  }

  // Check if script already exists
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    console.log('Google Maps script exists, waiting for load');
    isGoogleMapsLoading = true;
    googleMapsLoadPromise = new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkInterval);
          isGoogleMapsLoaded = true;
          isGoogleMapsLoading = false;
          console.log('Google Maps detected as loaded');
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        console.log('Timeout waiting for existing Google Maps script');
        isGoogleMapsLoading = false;
        resolve(); // Resolve anyway to prevent hanging
      }, 10000);
    });
    return googleMapsLoadPromise;
  }

  // Start loading
  console.log('Starting to load Google Maps script');
  isGoogleMapsLoading = true;
  
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initGoogleMapsGlobal`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      isGoogleMapsLoading = false;
      reject(new Error('Failed to load Google Maps'));
    };
    
    // The callback will handle success
    window.addEventListener('googleMapsLoaded', () => {
      console.log('Google Maps loaded event received');
      resolve();
    }, { once: true });
    
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

export function isGoogleMapsReady() {
  if (typeof window === 'undefined') {
    return false;
  }
  return isGoogleMapsLoaded || (window.google && window.google.maps && window.google.maps.places);
}

export function waitForGoogleMaps() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  
  if (isGoogleMapsReady()) {
    return Promise.resolve();
  }
  
  return loadGoogleMaps();
}
