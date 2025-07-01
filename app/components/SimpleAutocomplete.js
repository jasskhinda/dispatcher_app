'use client';

import { useEffect, useRef, useState } from 'react';
import { waitForGoogleMaps } from '@/lib/google-maps-loader';

export default function SimpleAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  required = false
}) {
  const inputRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    console.log('SimpleAutocomplete: useEffect called');
    
    const initAutocomplete = async () => {
      try {
        console.log('Waiting for Google Maps...');
        await waitForGoogleMaps();
        
        if (!inputRef.current) {
          console.log('Input ref not available');
          return;
        }

        console.log('Creating autocomplete...');
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address']
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          console.log('Place selected:', place.formatted_address);
          if (place.formatted_address) {
            onChange(place.formatted_address);
          }
        });

        setIsReady(true);
        setError('');
        console.log('Autocomplete ready');

      } catch (err) {
        console.error('Error setting up autocomplete:', err);
        setError('Failed to initialize address suggestions');
      }
    };

    initAutocomplete();
  }, [onChange, mounted]);

  if (!mounted) {
    return (
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          required={required}
          disabled
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        required={required}
        disabled={!isReady}
      />
      {!isReady && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
