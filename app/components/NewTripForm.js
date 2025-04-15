'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

export function NewTripForm({ user, userProfile, clients }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    pickup_address: '',
    destination_address: '',
    pickup_time: '',
    wheelchair_required: false,
    notes: '',
    round_trip: false
  });
  
  // State for calculated price
  const [priceInfo, setPriceInfo] = useState({
    basePrice: 50,
    distance: 0,
    distancePrice: 0,
    weekendSurcharge: 0,
    hourSurcharge: 0,
    holidaySurcharge: 0,
    roundTripPrice: 0,
    wheelchairPrice: 0,
    totalPrice: 50
  });
  
  // Refs for the address input fields
  const pickupInputRef = useRef(null);
  const destinationInputRef = useRef(null);
  
  // Refs for the autocomplete objects
  const pickupAutocompleteRef = useRef(null);
  const destinationAutocompleteRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => {
      const updatedData = { ...prev, [name]: newValue };
      calculatePrice(updatedData);
      return updatedData;
    });
  };
  
  // Calculate price based on form data
  const calculatePrice = async (data = formData) => {
    let newPriceInfo = {
      basePrice: 50,
      distance: 0,
      distancePrice: 0,
      weekendSurcharge: 0,
      hourSurcharge: 0,
      holidaySurcharge: 0,
      roundTripPrice: 0,
      wheelchairPrice: 0,
      totalPrice: 50
    };
    
    // Round trip calculation
    if (data.round_trip) {
      newPriceInfo.basePrice = 100;
      newPriceInfo.roundTripPrice = 50;
    }
    
    // Wheelchair surcharge
    if (data.wheelchair_required) {
      newPriceInfo.wheelchairPrice = 25;
    }
    
    // Time-based surcharges
    if (data.pickup_time) {
      const pickupDate = new Date(data.pickup_time);
      
      // Weekend surcharge
      const day = pickupDate.getDay();
      if (day === 0 || day === 6) {
        newPriceInfo.weekendSurcharge = 40;
      }
      
      // Hour surcharge
      const hour = pickupDate.getHours();
      if (hour <= 8 || hour >= 20) {
        newPriceInfo.hourSurcharge = 40;
      }
      
      // Holiday surcharge - simplified version
      const month = pickupDate.getMonth();
      const date = pickupDate.getDate();
      
      // Major US holidays (simplified check)
      const isNewYearsDay = month === 0 && date === 1;
      const isChristmas = month === 11 && date === 25;
      const isIndependenceDay = month === 6 && date === 4;
      const isThanksgiving = month === 10 && (date >= 22 && date <= 28) && day === 4;
      
      if (isNewYearsDay || isChristmas || isIndependenceDay || isThanksgiving) {
        newPriceInfo.holidaySurcharge = 100;
      }
    }
    
    // Calculate distance price if we have both addresses
    if (data.pickup_address && data.destination_address && googleLoaded) {
      try {
        // We would normally call an API here to get the distance
        // For now, we'll just estimate with a placeholder value
        // In a real app, you would call the Distance Matrix API here
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Calculate estimated distance (would come from API)
        newPriceInfo.distance = 15; // miles, placeholder
        newPriceInfo.distancePrice = newPriceInfo.distance * 3;
      } catch (error) {
        console.error('Error calculating distance:', error);
      }
    }
    
    // Calculate total price
    newPriceInfo.totalPrice = newPriceInfo.basePrice + 
                             newPriceInfo.distancePrice + 
                             newPriceInfo.weekendSurcharge + 
                             newPriceInfo.hourSurcharge + 
                             newPriceInfo.holidaySurcharge +
                             newPriceInfo.wheelchairPrice;
    
    setPriceInfo(newPriceInfo);
  };
  
  // Initialize Google Maps autocomplete when the script is loaded
  // Effect to recalculate price when form data changes
  useEffect(() => {
    calculatePrice();
  }, [googleLoaded, formData.pickup_time, formData.round_trip, formData.wheelchair_required]);
  
  // Initialize Google Maps autocomplete
  useEffect(() => {
    if (!googleLoaded || !pickupInputRef.current || !destinationInputRef.current) return;
    
    // Initialize autocomplete for pickup address
    pickupAutocompleteRef.current = new window.google.maps.places.Autocomplete(
      pickupInputRef.current,
      { types: ['address'] }
    );
    
    // Initialize autocomplete for destination address
    destinationAutocompleteRef.current = new window.google.maps.places.Autocomplete(
      destinationInputRef.current,
      { types: ['address'] }
    );
    
    // Add place_changed listeners
    pickupAutocompleteRef.current.addListener('place_changed', () => {
      const place = pickupAutocompleteRef.current.getPlace();
      const updatedData = { ...formData, pickup_address: place.formatted_address || formData.pickup_address };
      setFormData(updatedData);
      calculatePrice(updatedData);
    });
    
    destinationAutocompleteRef.current.addListener('place_changed', () => {
      const place = destinationAutocompleteRef.current.getPlace();
      const updatedData = { ...formData, destination_address: place.formatted_address || formData.destination_address };
      setFormData(updatedData);
      calculatePrice(updatedData);
    });
    
    // Cleanup function
    return () => {
      if (pickupAutocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(pickupAutocompleteRef.current);
      }
      if (destinationAutocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(destinationAutocompleteRef.current);
      }
    };
  }, [googleLoaded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Include the calculated price in the submission
    const tripData = {
      ...formData,
      estimated_price: priceInfo.totalPrice,
      price_breakdown: {
        base_price: priceInfo.basePrice,
        distance_price: priceInfo.distancePrice,
        weekend_surcharge: priceInfo.weekendSurcharge,
        hour_surcharge: priceInfo.hourSurcharge,
        holiday_surcharge: priceInfo.holidaySurcharge,
        wheelchair_price: priceInfo.wheelchairPrice,
        distance_miles: priceInfo.distance
      }
    };
    
    // In a real app, we would submit the form data to the server here
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Form submitted:', tripData);
      
      // Redirect to trips page after successful submission
      router.push('/dashboard');
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Load Google Maps JavaScript API */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={() => setGoogleLoaded(true)}
      />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold mb-6">Create New Trip</h1>
        
        <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
          <h2 className="text-lg font-medium mb-6">Trip Details</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="client_id" className="block text-sm font-medium mb-1">Client</label>
              <div className="relative">
                <select
                  id="client_id"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  className="w-full p-2 pr-10 border border-brand-border rounded-md bg-brand-background appearance-none"
                  required
                >
                  <option value="">Select a client</option>
                  {clients?.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.full_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || 'Unnamed Client'}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-accent">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="pickup_address" className="block text-sm font-medium mb-1">Pickup Address</label>
                <input
                  ref={pickupInputRef}
                  type="text"
                  id="pickup_address"
                  name="pickup_address"
                  value={formData.pickup_address}
                  onChange={handleChange}
                  className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                  placeholder="Start typing for address suggestions"
                  required
                />
              </div>
              <div>
                <label htmlFor="destination_address" className="block text-sm font-medium mb-1">Destination Address</label>
                <input
                  ref={destinationInputRef}
                  type="text"
                  id="destination_address"
                  name="destination_address"
                  value={formData.destination_address}
                  onChange={handleChange}
                  className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                  placeholder="Start typing for address suggestions"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="pickup_time" className="block text-sm font-medium mb-1">Pickup Date & Time</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    id="pickup_time"
                    name="pickup_time"
                    value={formData.pickup_time}
                    onChange={handleChange}
                    className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                    required
                  />
                  {formData.pickup_time && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xs bg-brand-accent text-brand-buttonText px-1.5 py-0.5 rounded">
                      {new Date(formData.pickup_time).toLocaleString('en-US', {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </div>
                  )}
                </div>
                {formData.pickup_time && (
                  <div className="mt-1 text-xs text-brand-accent">
                    {new Date(formData.pickup_time).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: true
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Trip Type</label>
                <div className="flex bg-brand-background border border-brand-border rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => {
                      const updated = { ...prev, round_trip: false };
                      calculatePrice(updated);
                      return updated;
                    })}
                    className={`flex-1 py-2 px-4 text-center transition-colors ${
                      !formData.round_trip 
                        ? 'bg-brand-accent text-brand-buttonText font-medium' 
                        : 'hover:bg-brand-border/10'
                    }`}
                  >
                    One Way
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => {
                      const updated = { ...prev, round_trip: true };
                      calculatePrice(updated);
                      return updated;
                    })}
                    className={`flex-1 py-2 px-4 text-center transition-colors ${
                      formData.round_trip 
                        ? 'bg-brand-accent text-brand-buttonText font-medium' 
                        : 'hover:bg-brand-border/10'
                    }`}
                  >
                    Round Trip
                  </button>
                </div>
              </div>
            </div>
            
            {/* Price calculation box */}
            <div className="bg-brand-border/10 p-4 rounded-md border border-brand-border/30">
              <h3 className="text-lg font-medium mb-3">Price Calculation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base fare:</span>
                  <span>${priceInfo.basePrice.toFixed(2)}</span>
                </div>
                
                {priceInfo.distance > 0 && (
                  <div className="flex justify-between">
                    <span>Distance ({priceInfo.distance} miles):</span>
                    <span>${priceInfo.distancePrice.toFixed(2)}</span>
                  </div>
                )}
                
                {priceInfo.weekendSurcharge > 0 && (
                  <div className="flex justify-between">
                    <span>Weekend surcharge:</span>
                    <span>${priceInfo.weekendSurcharge.toFixed(2)}</span>
                  </div>
                )}
                
                {priceInfo.hourSurcharge > 0 && (
                  <div className="flex justify-between">
                    <span>After hours surcharge:</span>
                    <span>${priceInfo.hourSurcharge.toFixed(2)}</span>
                  </div>
                )}
                
                {priceInfo.holidaySurcharge > 0 && (
                  <div className="flex justify-between">
                    <span>Holiday surcharge:</span>
                    <span>${priceInfo.holidaySurcharge.toFixed(2)}</span>
                  </div>
                )}
                
                {priceInfo.wheelchairPrice > 0 && (
                  <div className="flex justify-between">
                    <span>Wheelchair accessible vehicle:</span>
                    <span>${priceInfo.wheelchairPrice.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-brand-border/30 pt-2 mt-2 font-medium flex justify-between">
                  <span>Total estimated price:</span>
                  <span>${priceInfo.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-3">Wheelchair Required</label>
              <div className="bg-brand-background border border-brand-border rounded-md p-2 flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="wheelchair_required"
                    checked={formData.wheelchair_required}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-brand-border/50 rounded-full peer peer-checked:bg-brand-accent peer-focus:ring-2 peer-focus:ring-brand-accent/30 transition-colors">
                    <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-all duration-300 ${formData.wheelchair_required ? 'translate-x-5' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium">
                    {formData.wheelchair_required ? 'Yes' : 'No'}
                  </span>
                </label>
                <div className="ml-auto text-sm opacity-70">
                  {formData.wheelchair_required ? 'Wheelchair accessible vehicle will be provided' : 'Standard vehicle will be provided'}
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                placeholder="Any other relevant information for the driver"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-brand-border rounded-md mr-3 hover:bg-brand-border/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-brand-accent text-brand-buttonText rounded-md hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {loading ? 'Creating...' : 'Create Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}