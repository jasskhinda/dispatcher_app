'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps-loader';

export default function GoogleMapsAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter address",
  className = "",
  required = false,
  name = "",
  onPlaceSelected = null
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const initializeAutocomplete = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Wait for Google Maps to load
        await loadGoogleMaps();

        if (!mounted) return;

        // Check if Google Maps is available
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          throw new Error('Google Maps Places API not available');
        }

        // Initialize autocomplete
        if (inputRef.current) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            inputRef.current,
            {
              types: ['address'],
              componentRestrictions: { country: 'us' },
              fields: ['formatted_address', 'geometry', 'name']
            }
          );

          // Set up place changed listener
          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();
            
            if (place.formatted_address) {
              onChange(place.formatted_address);
              
              // Call onPlaceSelected if provided
              if (onPlaceSelected) {
                onPlaceSelected(place);
              }
            }
          });

          console.log('Google Maps Autocomplete initialized successfully');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Google Maps Autocomplete:', err);
        if (mounted) {
          setError('Address autocomplete unavailable');
          setIsLoading(false);
        }
      }
    };

    initializeAutocomplete();

    return () => {
      mounted = false;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange, onPlaceSelected]);

  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`${className} ${isLoading ? 'bg-gray-50' : ''}`}
        required={required}
        name={name}
        autoComplete="off"
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
        </div>
      )}
      
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}