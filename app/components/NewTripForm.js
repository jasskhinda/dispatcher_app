'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';

export function NewTripForm({ user, userProfile, individualClients, managedClients, facilities }) {
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
    return_pickup_time: '',
    wheelchair_required: false,
    wheelchair_type: 'none', // none, manual, power, rental
    notes: '',
    round_trip: false,
    is_emergency: false,
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
    veteran: false,
    submitted: false
  });
  const [creatingClient, setCreatingClient] = useState(false);
  
  // State for calculated price
  const [priceInfo, setPriceInfo] = useState({
    basePrice: 50,
    distance: 0,
    distancePrice: 0,
    countyPrice: 0,
    weekendAfterHoursSurcharge: 0,
    emergencyFee: 0,
    roundTripPrice: 0,
    wheelchairPrice: 0,
    veteranDiscount: 0,
    isInFranklinCounty: true,
    countiesOut: 0,
    totalPrice: 50
  });
  
  // State for client details
  const [clientDetails, setClientDetails] = useState(null);
  
  // Refs for the address input containers (like BookingCCT)
  const pickupAutocompleteContainerRef = useRef(null);
  const destinationAutocompleteContainerRef = useRef(null);
  
  // Refs for the autocomplete objects
  const pickupAutocompleteRef = useRef(null);
  const destinationAutocompleteRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => {
      const updatedData = { ...prev, [name]: newValue };
      
      // If client_id changed, fetch client details
      if (name === 'client_id' && newValue) {
        fetchClientDetails(newValue);
      }
      
      // Only calculate price for non-address fields or when both addresses are present
      // This prevents errors when user is typing addresses manually
      if (name !== 'pickup_address' && name !== 'destination_address') {
        calculatePrice(updatedData);
      } else if (updatedData.pickup_address && updatedData.destination_address) {
        // Debounce price calculation for address changes
        setTimeout(() => calculatePrice(updatedData), 500);
      }
      
      return updatedData;
    });
  };
  
  // Fetch client details including veteran status
  const fetchClientDetails = async (clientId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', clientId)
        .single();
        
      if (error) {
        console.error('Error fetching client details:', error);
        return;
      }
      
      setClientDetails(data);
      // Recalculate price with new client details
      calculatePrice(formData, data);
    } catch (error) {
      console.error('Error in client fetch:', error);
    }
  };
  
  // Professional price calculation based on CCT's rate structure
  const calculatePrice = async (data = formData, client = clientDetails) => {
    let newPriceInfo = {
      basePrice: 50, // $50 per leg
      distance: 0,
      distancePrice: 0,
      countyPrice: 0,
      weekendAfterHoursSurcharge: 0,
      emergencyFee: 0,
      roundTripPrice: 0,
      wheelchairPrice: 0,
      veteranDiscount: 0,
      isInFranklinCounty: true,
      countiesOut: 0,
      totalPrice: 50
    };
    
    // Base price per leg - $50 per leg
    newPriceInfo.basePrice = 50;
    
    // Round trip calculation - double the base price (2 legs)
    if (data.round_trip) {
      newPriceInfo.roundTripPrice = 50; // Additional leg
    }
    
    // Emergency fee
    if (data.is_emergency) {
      newPriceInfo.emergencyFee = 40;
    }
    
    // Wheelchair rental fee - only for rental wheelchair
    if (data.wheelchair_required && data.wheelchair_type === 'rental') {
      newPriceInfo.wheelchairPrice = 25; // Rental fee
    }
    
    // Weekend and after hours surcharge
    if (data.pickup_time) {
      const pickupDate = new Date(data.pickup_time);
      const day = pickupDate.getDay(); // 0 = Sunday, 6 = Saturday
      const hour = pickupDate.getHours();
      
      // Weekend or after hours: $40 charge
      const isWeekend = day === 0 || day === 6;
      const isAfterHours = hour < 8 || hour >= 18; // Before 8am or after 6pm
      
      if (isWeekend || isAfterHours) {
        newPriceInfo.weekendAfterHoursSurcharge = 40;
      }
    }
    
    // Calculate distance price and county detection if we have both addresses
    if (data.pickup_address && data.destination_address && googleLoaded && 
        window.google && window.google.maps && window.google.maps.DistanceMatrixService) {
      try {
        console.log('Calculating distance and location data between:', data.pickup_address, 'and', data.destination_address);
        
        // Use Google Maps Distance Matrix API to calculate actual distance
        const service = new window.google.maps.DistanceMatrixService();
        const geocoder = new window.google.maps.Geocoder();
        
        const response = await new Promise((resolve, reject) => {
          service.getDistanceMatrix(
            {
              origins: [data.pickup_address],
              destinations: [data.destination_address],
              travelMode: 'DRIVING',
              unitSystem: window.google.maps.UnitSystem.IMPERIAL, // Use miles
              avoidHighways: false,
              avoidTolls: false,
            },
            (response, status) => {
              if (status === 'OK') {
                resolve(response);
              } else {
                console.error('Distance Matrix API returned status: ' + status);
                reject(new Error('Distance calculation failed: ' + status));
              }
            }
          );
        });
        
        // Extract distance value from the response
        if (response.rows[0].elements[0].status === 'OK') {
          const distanceInMeters = response.rows[0].elements[0].distance.value;
          const distanceInMiles = distanceInMeters / 1609.34; // Convert meters to miles
          const roundedDistance = Math.round(distanceInMiles * 10) / 10; // Round to 1 decimal place
          
          console.log('Distance calculated:', roundedDistance, 'miles');
          newPriceInfo.distance = roundedDistance;
          
          // Geocode both addresses to determine counties
          const [pickupGeocode, destinationGeocode] = await Promise.all([
            new Promise((resolve, reject) => {
              geocoder.geocode({ address: data.pickup_address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  resolve(results[0]);
                } else {
                  console.warn('Pickup geocoding failed:', status);
                  resolve(null);
                }
              });
            }),
            new Promise((resolve, reject) => {
              geocoder.geocode({ address: data.destination_address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  resolve(results[0]);
                } else {
                  console.warn('Destination geocoding failed:', status);
                  resolve(null);
                }
              });
            })
          ]);
          
          // Determine counties from geocoding results
          const getCountyFromComponents = (addressComponents) => {
            const countyComponent = addressComponents.find(component =>
              component.types.includes('administrative_area_level_2')
            );
            return countyComponent ? countyComponent.long_name.replace(' County', '') : null;
          };
          
          const pickupCounty = pickupGeocode ? getCountyFromComponents(pickupGeocode.address_components) : null;
          const destinationCounty = destinationGeocode ? getCountyFromComponents(destinationGeocode.address_components) : null;
          
          console.log('Pickup county:', pickupCounty, 'Destination county:', destinationCounty);
          
          // Determine if trip involves Franklin County and calculate pricing
          const franklinCountyNames = ['Franklin', 'Franklin County'];
          const isPickupInFranklin = pickupCounty && franklinCountyNames.includes(pickupCounty);
          const isDestinationInFranklin = destinationCounty && franklinCountyNames.includes(destinationCounty);
          
          // Trip is "in Franklin County" if both pickup and destination are in Franklin County
          newPriceInfo.isInFranklinCounty = isPickupInFranklin && isDestinationInFranklin;
          
          // Count unique counties (excluding Franklin if both ends are in Franklin)
          const uniqueCounties = new Set();
          if (pickupCounty && pickupCounty !== 'Franklin') uniqueCounties.add(pickupCounty);
          if (destinationCounty && destinationCounty !== 'Franklin') uniqueCounties.add(destinationCounty);
          
          newPriceInfo.countiesOut = uniqueCounties.size;
          
          // Calculate distance pricing based on location
          const effectiveDistance = data.round_trip ? roundedDistance * 2 : roundedDistance;
          
          if (newPriceInfo.isInFranklinCounty) {
            // Both pickup and destination in Franklin County: $3/mile
            newPriceInfo.distancePrice = effectiveDistance * 3;
          } else {
            // Outside Franklin County or crossing county lines: $4/mile
            newPriceInfo.distancePrice = effectiveDistance * 4;
          }
          
          // County surcharge for trips going outside Franklin County
          if (newPriceInfo.countiesOut >= 2) {
            // 2+ counties out: $50 per county beyond the first
            newPriceInfo.countyPrice = (newPriceInfo.countiesOut - 1) * 50;
          } else if (newPriceInfo.countiesOut === 1) {
            // 1 county out: no surcharge (just the higher $4/mile rate)
            newPriceInfo.countyPrice = 0;
          }
          
        } else {
          console.warn('Distance calculation returned non-OK status:', response.rows[0].elements[0].status);
          // Fallback to estimate
          newPriceInfo.distance = 15; // miles, placeholder
          newPriceInfo.isInFranklinCounty = true; // Default assumption
          newPriceInfo.countiesOut = 0;
          // For round trips, double the distance for price calculation
          const effectiveDistance = data.round_trip ? newPriceInfo.distance * 2 : newPriceInfo.distance;
          newPriceInfo.distancePrice = effectiveDistance * 3;
        }
      } catch (error) {
        console.error('Error calculating distance and location:', error);
        // Fallback to estimate
        newPriceInfo.distance = 15; // miles, placeholder
        newPriceInfo.isInFranklinCounty = true; // Default assumption
        newPriceInfo.countiesOut = 0;
        // For round trips, double the distance for price calculation
        const effectiveDistance = data.round_trip ? newPriceInfo.distance * 2 : newPriceInfo.distance;
        newPriceInfo.distancePrice = effectiveDistance * 3;
      }
    }
    
    // Apply veteran discount if applicable
    newPriceInfo.veteranDiscount = 0; // Reset discount
    const isVeteran = client?.metadata?.veteran || false;
    
    if (isVeteran) {
      // Calculate subtotal before discount
      const subtotal = newPriceInfo.basePrice + 
                       newPriceInfo.roundTripPrice +
                       newPriceInfo.distancePrice + 
                       newPriceInfo.countyPrice +
                       newPriceInfo.weekendAfterHoursSurcharge +
                       newPriceInfo.emergencyFee +
                       newPriceInfo.wheelchairPrice;
      
      // Apply 20% veteran discount
      newPriceInfo.veteranDiscount = -(subtotal * 0.2); // Negative value to represent discount
    }
    
    // Calculate total price
    newPriceInfo.totalPrice = newPriceInfo.basePrice + 
                             newPriceInfo.roundTripPrice +
                             newPriceInfo.distancePrice + 
                             newPriceInfo.countyPrice +
                             newPriceInfo.weekendAfterHoursSurcharge +
                             newPriceInfo.emergencyFee +
                             newPriceInfo.wheelchairPrice +
                             newPriceInfo.veteranDiscount;
    
    setPriceInfo(newPriceInfo);
  };
  
  // Simple direct check for Google Maps
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      console.log('Google Maps already available for NewTripForm');
      setGoogleLoaded(true);
    }
  }, []);
  
  // Fallback script loader in case Next.js Script component fails
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!googleLoaded && !window.google) {
        console.log('Google Maps script not loaded via Next.js Script, trying fallback loader...');
        
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          console.log('Google Maps script already exists, waiting for it to load...');
          return;
        }
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMapsFallback`;
        script.async = true;
        script.defer = true;
        
        window.initGoogleMapsFallback = () => {
          console.log('Google Maps loaded via fallback method');
          setGoogleLoaded(true);
        };
        
        script.onerror = () => {
          console.error('Fallback Google Maps script loading failed');
        };
        
        document.head.appendChild(script);
      }
    }, 3000); // Wait 3 seconds before trying fallback
    
    return () => clearTimeout(fallbackTimer);
  }, [googleLoaded]);
  
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
  }, [
    googleLoaded, 
    formData.pickup_time, 
    formData.return_pickup_time, 
    formData.round_trip, 
    formData.wheelchair_required,
    formData.wheelchair_type,
    formData.is_emergency,
    formData.pickup_address,
    formData.destination_address,
    formData.client_id,
    clientDetails
  ]);
  
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

  // Initialize Google Maps autocomplete (exact BookingCCT implementation)
  useEffect(() => {
    if (!googleLoaded || 
        !window.google?.maps?.places?.Autocomplete ||
        !pickupAutocompleteContainerRef.current || 
        !destinationAutocompleteContainerRef.current) return;

    // Add delay to ensure DOM stability after component mount
    const initializeAutocomplete = () => {
      try {
        // Perform cleanup first to ensure we start fresh
        const cleanupAutocomplete = () => {
          // Clean up existing autocomplete instances
          if (pickupAutocompleteRef.current) {
            window.google.maps.event.clearInstanceListeners(pickupAutocompleteRef.current);
            pickupAutocompleteRef.current = null;
          }
          
          if (destinationAutocompleteRef.current) {
            window.google.maps.event.clearInstanceListeners(destinationAutocompleteRef.current);
            destinationAutocompleteRef.current = null;
          }
          
          // Remove existing input elements to create fresh ones
          if (pickupAutocompleteContainerRef.current) {
            while (pickupAutocompleteContainerRef.current.firstChild) {
              pickupAutocompleteContainerRef.current.removeChild(
                pickupAutocompleteContainerRef.current.firstChild
              );
            }
          }
          
          if (destinationAutocompleteContainerRef.current) {
            while (destinationAutocompleteContainerRef.current.firstChild) {
              destinationAutocompleteContainerRef.current.removeChild(
                destinationAutocompleteContainerRef.current.firstChild
              );
            }
          }
        };
        
        // Clean up existing elements first
        cleanupAutocomplete();

        // Create traditional input fields for autocomplete (exact BookingCCT pattern)
        const pickupInput = document.createElement('input');
        pickupInput.className = 'w-full p-2 border border-brand-border rounded-md bg-brand-background';
        pickupInput.placeholder = 'Enter address, city, or location';
        pickupInput.value = formData.pickup_address || '';
        pickupInput.id = 'pickup-autocomplete-input';
        
        const destinationInput = document.createElement('input');
        destinationInput.className = 'w-full p-2 border border-brand-border rounded-md bg-brand-background';
        destinationInput.placeholder = 'Enter address, city, or location';
        destinationInput.value = formData.destination_address || '';
        destinationInput.id = 'destination-autocomplete-input';
        
        // Append inputs to container
        pickupAutocompleteContainerRef.current.appendChild(pickupInput);
        destinationAutocompleteContainerRef.current.appendChild(destinationInput);
        
        // Initialize traditional Google Places Autocomplete
        const pickupAutocomplete = new window.google.maps.places.Autocomplete(pickupInput, {
          fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components'],
          componentRestrictions: { country: 'us' }
        });
        
        // Set bias to Ohio region for better results
        const ohioBounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(38.4031, -84.8204), // SW corner of Ohio
          new window.google.maps.LatLng(42.3270, -80.5183)  // NE corner of Ohio
        );
        pickupAutocomplete.setBounds(ohioBounds);
        
        const destinationAutocomplete = new window.google.maps.places.Autocomplete(destinationInput, {
          fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components'],
          componentRestrictions: { country: 'us' }
        });
        
        // Also set bias for destination
        destinationAutocomplete.setBounds(ohioBounds);
        
        // Store references to autocomplete instances
        pickupAutocompleteRef.current = pickupAutocomplete;
        destinationAutocompleteRef.current = destinationAutocomplete;
        
        // Add event listeners with place validation
        pickupAutocomplete.addListener('place_changed', () => {
          const place = pickupAutocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) return;
          
          const address = place.formatted_address || place.name || '';
          setFormData(prev => ({ ...prev, pickup_address: address }));
          
          // Only trigger price calculation if both addresses are set
          if (address && formData.destination_address) {
            setTimeout(() => calculatePrice({ ...formData, pickup_address: address }), 100);
          }
        });
        
        destinationAutocomplete.addListener('place_changed', () => {
          const place = destinationAutocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) return;
          
          const address = place.formatted_address || place.name || '';
          setFormData(prev => ({ ...prev, destination_address: address }));
          
          // Only trigger price calculation if both addresses are set
          if (formData.pickup_address && address) {
            setTimeout(() => calculatePrice({ ...formData, destination_address: address }), 100);
          }
        });
        
        // Manual input change handlers (two-way binding without re-rendering)
        pickupInput.addEventListener('input', (e) => {
          // Update the form state without causing a re-render
          setFormData(prev => ({ ...prev, pickup_address: e.target.value }));
        });
        
        destinationInput.addEventListener('input', (e) => {
          // Update the form state without causing a re-render
          setFormData(prev => ({ ...prev, destination_address: e.target.value }));
        });
        
        console.log('Google Maps autocomplete initialized successfully');
      } catch (error) {
        console.error('Error initializing Places Autocomplete:', error);
      }
    };

    // Add delay to ensure DOM stability (BookingCCT uses 500ms)
    const timer = setTimeout(initializeAutocomplete, 500);
    
    // Cleanup function
    return () => {
      clearTimeout(timer);
      // Clean up autocomplete instances and event listeners on unmount
      if (pickupAutocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(pickupAutocompleteRef.current);
        pickupAutocompleteRef.current = null;
      }
      
      if (destinationAutocompleteRef.current) {
        window?.google?.maps?.event?.clearInstanceListeners(destinationAutocompleteRef.current);
        destinationAutocompleteRef.current = null;
      }
    };
  }, [googleLoaded, formData.pickup_address, formData.destination_address]);

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
        metadata: { veteran: newClientFormData.veteran }
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
    
    // Validate return pickup time for round trips
    if (formData.round_trip) {
      if (!formData.return_pickup_time) {
        alert("Please select a return pickup time for the round trip");
        return;
      }
      
      // Check that return pickup time is after initial pickup time
      const pickupTime = new Date(formData.pickup_time);
      const returnTime = new Date(formData.return_pickup_time);
      
      if (returnTime <= pickupTime) {
        alert("Return pickup time must be after the initial pickup time");
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // Map form data to the trips table schema
      const tripData = {
        user_id: formData.client_id, // Use the client's ID as the user_id
        pickup_address: formData.pickup_address,
        destination_address: formData.destination_address,
        pickup_time: formData.pickup_time,
        return_pickup_time: formData.round_trip ? formData.return_pickup_time : null, // Only include for round trips
        status: 'upcoming', // Always set as upcoming since dispatcher app automatically approves trips
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
      
      // Case 1: Client is newly created and not in any client list
      const isInIndividualClients = individualClients?.some(client => client.id === formData.client_id);
      const isInManagedClients = managedClients?.some(client => client.id === formData.client_id);
      
      if (!isInIndividualClients && !isInManagedClients && newClientFormData.submitted) {
        clientName = `${newClientFormData.firstName} ${newClientFormData.lastName}`.trim() || 
                     newClientFormData.email || 
                     'New client';
      } 
      // Case 2: Individual client from booking app
      else if (isInIndividualClients) {
        const selectedClient = individualClients.find(client => client.id === formData.client_id);
        clientName = selectedClient ? 
          (`${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || 
           selectedClient.email || 'Individual Client') + ' (Individual)' : 
          'Individual Client';
      }
      // Case 3: Managed client from facility app
      else if (isInManagedClients) {
        const selectedClient = managedClients.find(client => client.id === formData.client_id);
        if (selectedClient) {
          const facility = facilities?.find(f => f.id === selectedClient.facility_id);
          const facilityName = facility?.name || 'Facility';
          const managedClientName = `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || 
                                   selectedClient.email || 'Managed Client';
          clientName = `${managedClientName} (${facilityName})`;
        } else {
          clientName = 'Managed Client';
        }
      }
      // Fallback
      else {
        clientName = 'Selected Client';
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
        id="google-maps-script"
        strategy="beforeInteractive"
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyDylwCsypHOs6T9e-JnTA7AoqOMrc3hbhE&libraries=places`}
        onLoad={() => {
          console.log('Google Maps script loaded successfully');
          console.log('window.google available:', !!window.google);
          console.log('window.google.maps available:', !!(window.google && window.google.maps));
          console.log('window.google.maps.places available:', !!(window.google && window.google.maps && window.google.maps.places));
          setGoogleLoaded(true);
        }}
        onError={(error) => {
          console.error('Error loading Google Maps script:', error);
          console.error('Full error details:', JSON.stringify(error));
        }}
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
                      
                      {/* Newly created client */}
                      {formData.client_id && 
                       !individualClients?.some(client => client.id === formData.client_id) && 
                       !managedClients?.some(client => client.id === formData.client_id) && (
                        <option key="newly-created" value={formData.client_id}>
                          {newClientFormData.submitted ? 
                            `${newClientFormData.firstName} ${newClientFormData.lastName}`.trim() || newClientFormData.email
                            : 'Newly Created Client'}
                        </option>
                      )}
                      
                      {/* Individual Clients Section */}
                      {individualClients && individualClients.length > 0 && (
                        <optgroup label="📱 Individual Clients (Booking App)">
                          {individualClients.map(client => (
                            <option key={`individual-${client.id}`} value={client.id}>
                              {`${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || 'Unnamed Client'}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      
                      {/* Facility Managed Clients Section */}
                      {managedClients && managedClients.length > 0 && (
                        <optgroup label="🏥 Facility Clients (Managed)">
                          {managedClients.map(client => {
                            const facility = facilities?.find(f => f.id === client.facility_id);
                            let facilityName;
                            
                            // Special handling for known facilities
                            if (client.facility_id && client.facility_id.startsWith('e1b94bde')) {
                              facilityName = 'CareBridge Living';
                            } else if (facility?.name) {
                              facilityName = facility.name;
                            } else {
                              facilityName = `Facility ${client.facility_id?.substring(0, 8)}`;
                            }
                            
                            const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || 'Unnamed Client';
                            
                            return (
                              <option key={`managed-${client.id}`} value={client.id}>
                                {facilityName} • {clientName}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
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
                          veteran: false,
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
                    
                    <div>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="veteran"
                          checked={newClientFormData.veteran}
                          onChange={(e) => setNewClientFormData(prev => ({ ...prev, veteran: e.target.checked }))}
                          className="rounded border-brand-border text-brand-accent focus:ring-brand-accent"
                        />
                        <span className="text-sm font-medium">Veteran (eligible for 20% discount)</span>
                      </label>
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
                <div className="relative">
                  <div 
                    ref={pickupAutocompleteContainerRef} 
                    className="w-full"
                    aria-label="Pickup location input"
                  >
                    {/* Autocomplete input will be inserted here */}
                  </div>
                  <input 
                    type="hidden" 
                    name="pickup_address" 
                    value={formData.pickup_address} 
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="destination_address" className="block text-sm font-medium mb-1">Destination Address</label>
                <div className="relative">
                  <div 
                    ref={destinationAutocompleteContainerRef} 
                    className="w-full"
                    aria-label="Destination location input"
                  >
                    {/* Autocomplete input will be inserted here */}
                  </div>
                  <input 
                    type="hidden" 
                    name="destination_address" 
                    value={formData.destination_address} 
                    required
                  />
                </div>
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
                
                {/* Return pickup time - only shown for round trips */}
                {formData.round_trip && (
                  <div className="mt-4">
                    <label htmlFor="return_pickup_time" className="block text-sm font-medium mb-1">
                      Return Pickup Date & Time
                    </label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        id="return_pickup_time"
                        name="return_pickup_time"
                        value={formData.return_pickup_time}
                        onChange={handleChange}
                        className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                        required={formData.round_trip}
                      />
                      {formData.return_pickup_time && (
                        <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xs bg-brand-accent text-brand-buttonText px-1.5 py-0.5 rounded">
                          {new Date(formData.return_pickup_time).toLocaleString('en-US', {
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          })}
                        </div>
                      )}
                    </div>
                    {formData.return_pickup_time && (
                      <div className="mt-1 text-xs text-brand-accent">
                        {new Date(formData.return_pickup_time).toLocaleString('en-US', {
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
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Trip Type</label>
                <div className="flex bg-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => {
                      const updated = { ...prev, round_trip: false };
                      calculatePrice(updated);
                      return updated;
                    })}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-all duration-200 ${
                      !formData.round_trip 
                        ? 'bg-blue-600 text-white shadow-md border-r-2 border-blue-700' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-r border-gray-200'
                    }`}
                  >
                    🔄 One Way
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => {
                      const updated = { ...prev, round_trip: true };
                      calculatePrice(updated);
                      return updated;
                    })}
                    className={`flex-1 py-3 px-4 text-center font-medium transition-all duration-200 ${
                      formData.round_trip 
                        ? 'bg-blue-600 text-white shadow-md border-l-2 border-blue-700' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-l border-gray-200'
                    }`}
                  >
                    🔄↩️ Round Trip
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
              <h3 className="text-lg font-medium mb-3">Professional Price Calculation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base fare ({formData.round_trip ? '2 legs' : '1 leg'} @ $50/leg):</span>
                  <span>${(priceInfo.basePrice + priceInfo.roundTripPrice).toFixed(2)}</span>
                </div>
                
                {priceInfo.distance > 0 && (
                  <div className="flex justify-between">
                    <span>Distance ({priceInfo.distance.toFixed(1)} miles {formData.round_trip ? 'x2 for round trip' : ''} @ ${priceInfo.isInFranklinCounty ? '$3' : '$4'}/mile {priceInfo.isInFranklinCounty ? '(Franklin County)' : '(Outside Franklin County)'}):</span>
                    <span>${priceInfo.distancePrice.toFixed(2)}</span>
                  </div>
                )}
                
                {priceInfo.countyPrice > 0 && (
                  <div className="flex justify-between">
                    <span>County surcharge ({priceInfo.countiesOut} counties out @ $50/county):</span>
                    <span>${priceInfo.countyPrice.toFixed(2)}</span>
                  </div>
                )}
                
                {priceInfo.weekendAfterHoursSurcharge > 0 && (
                  <div className="flex justify-between">
                    <span>Weekend/After hours surcharge:</span>
                    <span>${priceInfo.weekendAfterHoursSurcharge.toFixed(2)}</span>
                  </div>
                )}
                
                {priceInfo.emergencyFee > 0 && (
                  <div className="flex justify-between">
                    <span>Emergency fee:</span>
                    <span>${priceInfo.emergencyFee.toFixed(2)}</span>
                  </div>
                )}
                
                {priceInfo.wheelchairPrice > 0 && (
                  <div className="flex justify-between">
                    <span>Wheelchair rental fee:</span>
                    <span>${priceInfo.wheelchairPrice.toFixed(2)}</span>
                  </div>
                )}
                
                {formData.wheelchair_required && priceInfo.wheelchairPrice === 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Wheelchair accessible vehicle (no extra fee):</span>
                    <span>$0.00</span>
                  </div>
                )}
                
                {priceInfo.veteranDiscount < 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Veteran discount (20%):</span>
                    <span>${priceInfo.veteranDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-brand-border/30 pt-2 mt-2 font-medium flex justify-between">
                  <span>Total estimated price:</span>
                  <span>${priceInfo.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Emergency Trip Option */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="is_emergency"
                  name="is_emergency"
                  checked={formData.is_emergency}
                  onChange={handleChange}
                  className="mt-1 text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="ml-3">
                  <label htmlFor="is_emergency" className="block text-sm font-medium text-red-800 cursor-pointer">
                    🚨 Emergency Trip
                  </label>
                  <p className="text-sm text-red-700 mt-1">
                    Check this box if this is an emergency trip requiring immediate attention.
                    <span className="font-medium"> Additional $40 emergency fee applies.</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enhanced Wheelchair Transportation Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-blue-800">♿ Wheelchair Transportation</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-3 text-gray-700">What type of wheelchair do you have?</label>
                <div className="space-y-3">
                  <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="wheelchair_type"
                      value="none"
                      checked={formData.wheelchair_type === 'none'}
                      onChange={(e) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          wheelchair_type: e.target.value,
                          wheelchair_required: false 
                        }));
                      }}
                      className="mt-1 text-blue-600"
                    />
                    <div className="ml-3">
                      <div className="font-medium">None</div>
                      <div className="text-sm text-gray-600">No wheelchair needed</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="wheelchair_type"
                      value="manual"
                      checked={formData.wheelchair_type === 'manual'}
                      onChange={(e) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          wheelchair_type: e.target.value,
                          wheelchair_required: true 
                        }));
                      }}
                      className="mt-1 text-blue-600"
                    />
                    <div className="ml-3">
                      <div className="font-medium">Manual wheelchair (I have my own)</div>
                      <div className="text-sm text-gray-600">Standard manual wheelchair that you bring</div>
                      <div className="text-sm text-green-600 font-medium">No additional fee</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="wheelchair_type"
                      value="power"
                      checked={formData.wheelchair_type === 'power'}
                      onChange={(e) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          wheelchair_type: e.target.value,
                          wheelchair_required: true 
                        }));
                      }}
                      className="mt-1 text-blue-600"
                    />
                    <div className="ml-3">
                      <div className="font-medium">Power wheelchair (I have my own)</div>
                      <div className="text-sm text-gray-600">Electric/motorized wheelchair that you bring</div>
                      <div className="text-sm text-green-600 font-medium">No additional fee</div>
                    </div>
                  </label>
                  
                  <div className="flex items-start p-3 border border-gray-300 rounded-lg bg-gray-100 opacity-60">
                    <input
                      type="radio"
                      name="wheelchair_type"
                      value="transport"
                      disabled
                      className="mt-1 text-gray-400"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-500">Transport wheelchair</div>
                      <div className="text-sm text-gray-500">Not Available</div>
                      <div className="text-sm text-red-600">Lightweight transport chair - Not permitted for safety reasons</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Conditional wheelchair rental section */}
              {formData.wheelchair_type === 'none' && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <label className="block text-sm font-medium mb-3 text-gray-700">Do you want us to provide a wheelchair?</label>
                  <div className="space-y-3">
                    <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="wheelchair_rental"
                        value="yes"
                        checked={formData.wheelchair_type === 'rental'}
                        onChange={(e) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            wheelchair_type: 'rental',
                            wheelchair_required: true 
                          }));
                        }}
                        className="mt-1 text-blue-600"
                      />
                      <div className="ml-3">
                        <div className="font-medium">Yes, please provide a wheelchair</div>
                        <div className="text-sm text-gray-600">We will provide a suitable wheelchair for your trip</div>
                        <div className="text-sm text-orange-600 font-medium">+$25 wheelchair rental fee</div>
                      </div>
                    </label>
                    
                    <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="wheelchair_rental"
                        value="no"
                        checked={formData.wheelchair_type === 'none' && !formData.wheelchair_required}
                        onChange={(e) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            wheelchair_required: false 
                          }));
                        }}
                        className="mt-1 text-blue-600"
                      />
                      <div className="ml-3">
                        <div className="font-medium">No, wheelchair not needed</div>
                        <div className="text-sm text-gray-600">Passenger can walk or transfer independently</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1">Wheelchair Accessibility Information</h4>
                <p className="text-sm text-blue-700">All our vehicles are equipped with wheelchair accessibility features. The same fee applies to all wheelchair types to ensure fair and transparent pricing.</p>
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