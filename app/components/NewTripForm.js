'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';

export function NewTripForm({ user, userProfile, clients }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const driverId = searchParams.get('driver_id');
  
  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    pickup_address: '',
    destination_address: '',
    pickup_time: '',
    wheelchair_required: false,
    notes: '',
    round_trip: false,
    driver_id: driverId || null,
    driver_name: ''
  });
  
  // State for new client form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientFormData, setNewClientFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    notes: '',
    submitted: false
  });
  const [creatingClient, setCreatingClient] = useState(false);
  
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
  
  // Simple direct check for Google Maps
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      console.log('Google Maps already available for NewTripForm');
      setGoogleLoaded(true);
    }
  }, []);
  
  // Check again after component mounts - Google Maps might have loaded after
  useEffect(() => {
    // Check immediately once
    if (typeof window !== 'undefined' && window.google && window.google.maps && !googleLoaded) {
      console.log('Google Maps now available for NewTripForm (immediate check)');
      setGoogleLoaded(true);
      return; // Skip setting up the interval if already loaded
    }
    
    const intervalId = setInterval(() => {
      if (typeof window !== 'undefined' && window.google && window.google.maps && !googleLoaded) {
        console.log('Google Maps now available for NewTripForm (interval check)');
        setGoogleLoaded(true);
        clearInterval(intervalId);
      }
    }, 500);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [googleLoaded]);

  // Effect to recalculate price when form data changes
  useEffect(() => {
    calculatePrice();
  }, [googleLoaded, formData.pickup_time, formData.round_trip, formData.wheelchair_required]);
  
  // Fetch driver information if driver_id is provided
  useEffect(() => {
    if (formData.driver_id) {
      const fetchDriverInfo = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', formData.driver_id)
            .single();
            
          if (error) {
            console.error('Error fetching driver:', error);
            return;
          }
          
          if (data) {
            const driverName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
            // Store the driver name in formData
            setFormData(prevData => ({
              ...prevData,
              driver_name: driverName
            }));
          }
        } catch (error) {
          console.error('Error in driver fetch:', error);
        }
      };
      
      fetchDriverInfo();
    }
  }, [formData.driver_id]);

  // Initialize Google Maps autocomplete
  useEffect(() => {
    if (!googleLoaded || !pickupInputRef.current || !destinationInputRef.current) {
      console.log('Cannot initialize autocomplete yet:', { 
        googleLoaded, 
        pickupInput: !!pickupInputRef.current, 
        destinationInput: !!destinationInputRef.current 
      });
      return;
    }
    
    console.log('Initializing Google Maps autocomplete for address fields');
    
    try {
      // Initialize autocomplete for pickup address
      pickupAutocompleteRef.current = new window.google.maps.places.Autocomplete(
        pickupInputRef.current,
        { types: [] }  // Allow all types of places including cities
      );
      
      // Initialize autocomplete for destination address
      destinationAutocompleteRef.current = new window.google.maps.places.Autocomplete(
        destinationInputRef.current,
        { types: [] }  // Allow all types of places including cities
      );
      
      // Add place_changed listeners
      pickupAutocompleteRef.current.addListener('place_changed', () => {
        const place = pickupAutocompleteRef.current.getPlace();
        console.log('Pickup place selected:', place);
        setFormData(prevData => {
          const updatedData = { ...prevData, pickup_address: place.formatted_address || prevData.pickup_address };
          calculatePrice(updatedData);
          return updatedData;
        });
      });
      
      destinationAutocompleteRef.current.addListener('place_changed', () => {
        const place = destinationAutocompleteRef.current.getPlace();
        console.log('Destination place selected:', place);
        setFormData(prevData => {
          const updatedData = { ...prevData, destination_address: place.formatted_address || prevData.destination_address };
          calculatePrice(updatedData);
          return updatedData;
        });
      });
      
      console.log('Google Maps autocomplete initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Maps autocomplete:', error);
    }
    
    // Cleanup function
    return () => {
      try {
        if (pickupAutocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(pickupAutocompleteRef.current);
        }
        if (destinationAutocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(destinationAutocompleteRef.current);
        }
      } catch (error) {
        console.error('Error cleaning up Google Maps autocomplete:', error);
      }
    };
  }, [googleLoaded, pickupInputRef.current, destinationInputRef.current]);

  // Function to handle creating a new client
  const handleNewClientSubmit = async () => {
    setCreatingClient(true);
    
    try {
      // Generate a random password for the client's account
      const password = Math.random().toString(36).slice(-10) + Math.random().toString(10).slice(-2);
      
      // Prepare client profile data
      const userProfile = {
        first_name: newClientFormData.firstName,
        last_name: newClientFormData.lastName,
        phone_number: newClientFormData.phoneNumber,
        address: newClientFormData.address,
        notes: newClientFormData.notes,
      };
      
      // Call the API to create the user and profile
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newClientFormData.email,
          password,
          userProfile,
          role: 'client'
        }),
      });
      
      const result = await response.json();
      
      // Log response for debugging
      console.log('Client creation API response:', {
        status: response.status,
        ok: response.ok,
        result
      });
      
      // Handle error responses
      if (!response.ok) {
        // Special case for "already has profile" errors that we can recover from
        if (result.error && result.error.includes('already has a client profile')) {
          console.log('Client already exists, proceeding to find their ID');
        } else {
          throw new Error(result.error || 'Failed to create client');
        }
      }
      
      // Get the client's ID either from the result or fetch profiles
      let clientId;
      
      if (result.profile && result.profile.id) {
        clientId = result.profile.id;
      } else if (result.userId) {
        // If we have the userId directly, use that
        clientId = result.userId;
      } else {
        // Add a small delay to allow database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // If the profile ID wasn't returned, try to fetch it by email
        // Try using both exact email and case-insensitive search
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .or(`email.eq.${newClientFormData.email},email.ilike.${newClientFormData.email}`)
          .order('created_at', { ascending: false })
          .limit(5);
        
        console.log('Profile lookup result:', { profiles, error: profilesError });
          
        if (profiles && profiles.length > 0) {
          clientId = profiles[0].id;
        } else {
          throw new Error('Could not find the newly created client. Please try again or check if the client exists under the Clients tab.');
        }
      }
      
      // Store the newly created client info for display
      const newClientDisplayInfo = {
        firstName: newClientFormData.firstName,
        lastName: newClientFormData.lastName,
        email: newClientFormData.email
      };
      
      // Set the client ID in the form data
      setFormData(prev => ({ ...prev, client_id: clientId }));
      
      // Hide the new client form and show a success message
      setShowNewClientForm(false);
      
      // Keep the client info for display, but mark as submitted
      setNewClientFormData(prev => ({
        ...prev,
        submitted: true
      }));
      
    } catch (error) {
      console.error('Error creating client:', error);
      alert(`Failed to create client: ${error.message}`);
    } finally {
      setCreatingClient(false);
    }
  };

  // Function to handle changes in the new client form
  const handleNewClientFormChange = (e) => {
    const { name, value } = e.target;
    setNewClientFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Don't proceed if showing new client form
    if (showNewClientForm) {
      alert("Please complete client creation first");
      return;
    }
    
    // Validate client selection
    if (!formData.client_id) {
      alert("Please select a client or create a new one");
      return;
    }
    
    setLoading(true);
    
    try {
      // Map form data to the trips table schema
      const tripData = {
        user_id: formData.client_id, // Use the client's ID as the user_id
        pickup_address: formData.pickup_address,
        destination_address: formData.destination_address,
        pickup_time: formData.pickup_time,
        status: formData.driver_id ? 'upcoming' : 'pending', // Set to upcoming if driver is assigned
        price: priceInfo.totalPrice,
        special_requirements: formData.notes,
        wheelchair_type: formData.wheelchair_required ? 'required' : null,
        is_round_trip: formData.round_trip,
        distance: priceInfo.distance,
        driver_id: formData.driver_id || null,
        driver_name: formData.driver_name || null
      };

      // Insert the trip into the database
      const { data, error } = await supabase
        .from('trips')
        .insert(tripData)
        .select()
        .single();

      if (error) {
        console.error('Error creating trip:', error);
        throw new Error(error.message);
      }

      console.log('Trip created successfully:', data);
      
      // Redirect to dashboard after successful submission
      router.push('/dashboard');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Failed to create trip: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Success message after client creation
  const renderSuccess = () => {
    if (formData.client_id && !showNewClientForm) {
      let clientName;
      
      // Case 1: Client is newly created and not in the clients list
      if (!clients?.some(client => client.id === formData.client_id) && newClientFormData.submitted) {
        clientName = `${newClientFormData.firstName} ${newClientFormData.lastName}`.trim() || 
                     newClientFormData.email || 
                     'New client';
      } 
      // Case 2: Client exists in the clients list
      else {
        // Find the client in the list to show their name
        const selectedClient = clients?.find(client => client.id === formData.client_id);
        clientName = selectedClient ? 
          (selectedClient.full_name || 
           `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || 
           selectedClient.email) : 
          'New client';
      }
      
      return (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Client <span className="font-medium">{clientName}</span> selected
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={() => {
          console.log('Google Maps script loaded successfully in NewTripForm');
          setGoogleLoaded(true);
        }}
        onError={() => console.error('Error loading Google Maps script in NewTripForm')}
      />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold mb-6">Create New Trip</h1>
        
        <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
          <h2 className="text-lg font-medium mb-6">Trip Details</h2>
          {renderSuccess()}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="client_id" className="block text-sm font-medium mb-1">Client</label>
              
              {!showNewClientForm ? (
                <div className="space-y-2">
                  <div className="relative">
                    <select
                      id="client_id"
                      name="client_id"
                      value={formData.client_id}
                      onChange={handleChange}
                      className="w-full p-2 pr-10 border border-brand-border rounded-md bg-brand-background appearance-none"
                      required={!showNewClientForm}
                      disabled={showNewClientForm}
                    >
                      <option value="">Select a client</option>
                      {formData.client_id && !clients?.some(client => client.id === formData.client_id) && (
                        <option key="newly-created" value={formData.client_id}>
                          {newClientFormData.submitted ? 
                            `${newClientFormData.firstName} ${newClientFormData.lastName}`.trim() || newClientFormData.email
                            : 'Newly Created Client'}
                        </option>
                      )}
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
                  
                  <button
                    type="button"
                    onClick={() => {
                      // Reset the form data when starting a new client
                      if (!newClientFormData.submitted) {
                        setNewClientFormData({
                          firstName: '',
                          lastName: '',
                          email: '',
                          phoneNumber: '',
                          address: '',
                          notes: '',
                          submitted: false
                        });
                      }
                      setShowNewClientForm(true);
                    }}
                    className="text-sm text-brand-accent hover:underline focus:outline-none focus:underline flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create a new client instead
                  </button>
                </div>
              ) : (
                <div className="bg-brand-border/10 p-4 rounded-md border border-brand-border/30 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-medium">New Client Information</h3>
                    <button
                      type="button"
                      onClick={() => setShowNewClientForm(false)}
                      className="text-sm text-brand-accent hover:underline focus:outline-none"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium mb-1">First Name</label>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={newClientFormData.firstName}
                          onChange={handleNewClientFormChange}
                          required
                          className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium mb-1">Last Name</label>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={newClientFormData.lastName}
                          onChange={handleNewClientFormChange}
                          required
                          className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={newClientFormData.email}
                        onChange={handleNewClientFormChange}
                        required
                        className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                      />
                    </div>

                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">Phone Number</label>
                      <input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        value={newClientFormData.phoneNumber}
                        onChange={handleNewClientFormChange}
                        required
                        className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                      />
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
                      <input
                        id="address"
                        name="address"
                        type="text"
                        value={newClientFormData.address}
                        onChange={handleNewClientFormChange}
                        className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="clientNotes" className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        id="clientNotes"
                        name="notes"
                        value={newClientFormData.notes}
                        onChange={handleNewClientFormChange}
                        rows={2}
                        placeholder="Special needs, preferences, etc."
                        className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleNewClientSubmit}
                        disabled={creatingClient}
                        className="px-4 py-2 bg-brand-accent text-brand-buttonText rounded-md hover:opacity-90 transition-opacity disabled:opacity-70"
                      >
                        {creatingClient ? 'Creating...' : 'Save & Continue'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                  placeholder="Enter address, city, or location"
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
                  placeholder="Enter address, city, or location"
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
            
            {/* Driver assignment info - only shown if a driver was pre-selected */}
            {formData.driver_id && (
              <div className="bg-brand-accent/10 rounded-lg p-4 border border-brand-accent/30">
                <h3 className="text-sm font-medium mb-2">Driver Assignment</h3>
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-brand-accent flex items-center justify-center text-brand-buttonText">
                    <span className="text-sm">{formData.driver_name ? formData.driver_name.charAt(0) : 'D'}</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{formData.driver_name || 'Selected Driver'}</p>
                    <p className="text-xs opacity-70">This trip will be assigned to this driver</p>
                  </div>
                </div>
              </div>
            )}
            
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