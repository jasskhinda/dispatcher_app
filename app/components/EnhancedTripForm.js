'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import GoogleMapsAutocomplete from './GoogleMapsAutocomplete';

export default function EnhancedTripForm({ user, userProfile, individualClients, managedClients, facilities }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const driverId = searchParams.get('driver_id');
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(false);
  const [allClients, setAllClients] = useState([]);
  
  const [formData, setFormData] = useState({
    clientId: '',
    pickupAddress: '',
    pickupDetails: '',
    destinationAddress: '',
    destinationDetails: '',
    pickupDate: new Date().toISOString().split('T')[0], // Today's date
    pickupTime: '08:15',
    isRoundTrip: false,
    returnTime: '08:30',
    wheelchairType: 'no_wheelchair',
    additionalPassengers: 0,
    tripNotes: '',
    isEmergency: false,
    driver_id: driverId || null
  });

  const [selectedClient, setSelectedClient] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentPricing, setCurrentPricing] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Wheelchair selection data
  const [wheelchairData, setWheelchairData] = useState({
    type: 'none',
    needsProvided: false,
    customType: '',
    hasWheelchairFee: false,
    fee: 0,
    requirements: '' // Add requirements field
  });

  // Combine all clients into one list
  useEffect(() => {
    const combinedClients = [
      // Individual clients from booking app
      ...(individualClients || []).map(client => ({
        ...client,
        client_type: 'individual',
        display_name: `${client.first_name || 'Unknown'} ${client.last_name || ''}`.trim(),
        phone_display: client.phone_number || '',
        medical_notes: client.metadata?.medical_notes || '',
        accessibility_needs: client.metadata?.accessibility_needs || ''
      })),
      // Managed clients from facilities
      ...(managedClients || []).map(client => {
        const facility = facilities.find(f => f.id === client.facility_id);
        return {
          ...client,
          client_type: 'managed',
          display_name: `${client.first_name || 'Unknown'} ${client.last_name || ''} (Managed) - ${client.phone_number || 'No phone'}`.trim(),
          phone_display: client.phone_number || '',
          medical_notes: client.medical_notes || '',
          accessibility_needs: client.accessibility_needs || '',
          facility_name: facility?.name || 'Unknown Facility'
        };
      })
    ]
    .filter(client => client.first_name) // Filter out clients without first_name
    .sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

    setAllClients(combinedClients);
  }, [individualClients, managedClients, facilities]);

  useEffect(() => {
    if (formData.clientId) {
      // Search in both individual and managed clients
      let client = individualClients?.find(c => c.id === formData.clientId);
      if (!client) {
        client = managedClients?.find(c => c.id === formData.clientId);
        if (client) {
          // Add facility info for managed clients
          const facility = facilities?.find(f => f.id === client.facility_id);
          client = {
            ...client,
            client_type: 'managed',
            facility_name: facility?.name || 'Unknown Facility'
          };
        }
      } else {
        // Mark as individual client
        client = {
          ...client,
          client_type: 'individual'
        };
      }
      setSelectedClient(client);
    } else {
      setSelectedClient(null);
    }
  }, [formData.clientId, individualClients, managedClients, facilities]);

  // Handle wheelchair selection changes
  const handleWheelchairChange = useCallback((newWheelchairData) => {
    setWheelchairData(newWheelchairData);
    
    // Update form data wheelchair type for database compatibility
    let wheelchairType = 'no_wheelchair';
    if (newWheelchairData.type !== 'none' || newWheelchairData.needsProvided) {
      wheelchairType = newWheelchairData.type === 'none' ? 'provided' : newWheelchairData.type;
    }
    
    setFormData(prev => ({
      ...prev,
      wheelchairType: wheelchairType
    }));
  }, []);

  const calculatePricing = async () => {
    if (!formData.pickupAddress || !formData.destinationAddress) {
      setCurrentPricing(null);
      return;
    }

    // Use the professional pricing calculation
    try {
      const { getPricingEstimate } = await import('@/lib/pricing');
      
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);
      
      // Determine client type for pricing
      const clientType = selectedClient?.client_type === 'individual' ? 'individual' : 'facility';
      
      const result = await getPricingEstimate({
        pickupAddress: formData.pickupAddress,
        destinationAddress: formData.destinationAddress,
        isRoundTrip: formData.isRoundTrip,
        pickupDateTime: pickupDateTime.toISOString(),
        wheelchairType: formData.wheelchairType,
        clientType,
        additionalPassengers: formData.additionalPassengers || 0,
        isEmergency: formData.isEmergency || false,
        preCalculatedDistance: routeInfo ? {
          miles: routeInfo.distance?.miles || 0,
          distance: routeInfo.distance?.miles || 0,
          text: routeInfo.distance?.text || '',
          duration: routeInfo.duration?.text || ''
        } : null
      });

      if (result.success) {
        setCurrentPricing(result);
      } else {
        console.error('Pricing calculation failed:', result.error);
        // Fallback to basic estimate
        const baseFare = formData.isRoundTrip ? 100 : 50;
        const estimatedMiles = 10;
        const mileageRate = 3.00;
        const estimatedTotal = baseFare + (estimatedMiles * mileageRate);
        
        setCurrentPricing({
          summary: {
            estimatedTotal: `$${estimatedTotal.toFixed(2)}`,
            tripType: formData.isRoundTrip ? 'Round Trip' : 'One Way',
            distance: `${estimatedMiles} miles (estimated)`
          }
        });
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
      // Fallback to basic estimate
      const baseFare = formData.isRoundTrip ? 100 : 50;
      const estimatedMiles = 10;
      const mileageRate = 3.00;
      const estimatedTotal = baseFare + (estimatedMiles * mileageRate);
      
      setCurrentPricing({
        summary: {
          estimatedTotal: `$${estimatedTotal.toFixed(2)}`,
          tripType: formData.isRoundTrip ? 'Round Trip' : 'One Way',
          distance: `${estimatedMiles} miles (estimated)`
        }
      });
    }
  };

  // Calculate pricing when relevant form data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculatePricing();
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [
    formData.pickupAddress,
    formData.destinationAddress,
    formData.pickupDate,
    formData.pickupTime,
    formData.isRoundTrip,
    formData.wheelchairType,
    formData.isEmergency,
    selectedClient?.client_type,
    routeInfo
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }
    
    if (!formData.pickupAddress || !formData.destinationAddress) {
      setError('Please fill in both pickup and destination addresses');
      return;
    }
    
    if (!formData.pickupDate || !formData.pickupTime) {
      setError('Please select pickup date and time');
      return;
    }

    // Validate wheelchair selection
    if (wheelchairData.isTransportChair) {
      setError('We are unable to accommodate transport wheelchairs due to safety regulations. Please select a different wheelchair option or choose "None" for us to provide suitable accommodation.');
      return;
    }
    
    // Add timeout protection for form submission
    const submitTimeout = setTimeout(() => {
      console.warn('⚠️ Form submission timeout');
      setError('Request timed out. Please try again.');
      setLoading(false);
    }, 15000); // 15 second timeout

    try {
      setLoading(true);
      
      // Combine date and time
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);
      let returnDateTime = null;
      
      if (formData.isRoundTrip && formData.returnTime) {
        returnDateTime = new Date(`${formData.pickupDate}T${formData.returnTime}`);
      }

      // Determine if this is an individual client or managed client
      const isIndividualClient = selectedClient?.client_type === 'individual';
      
      // Create trip data
      const tripData = {
        user_id: isIndividualClient ? selectedClient?.id : null,
        managed_client_id: !isIndividualClient ? selectedClient?.id : null,
        facility_id: !isIndividualClient ? selectedClient?.facility_id : null,
        pickup_address: formData.pickupAddress,
        pickup_details: formData.pickupDetails,
        destination_address: formData.destinationAddress,
        destination_details: formData.destinationDetails,
        pickup_time: pickupDateTime.toISOString(),
        return_pickup_time: returnDateTime?.toISOString() || null,
        wheelchair_type: formData.wheelchairType,
        additional_passengers: parseInt(formData.additionalPassengers) || 0,
        notes: formData.tripNotes,
        is_round_trip: formData.isRoundTrip,
        is_emergency: formData.isEmergency,
        status: formData.driver_id ? 'assigned' : 'pending',
        driver_id: formData.driver_id || null,
        price: currentPricing?.pricing?.total || 0,
        created_by: user.id,
        created_by_role: 'dispatcher'
      };

      // Insert trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([tripData])
        .select()
        .single();

      if (tripError) throw tripError;

      setSuccess(true);
      
      // Clear form after successful submission
      setTimeout(() => {
        router.push('/dashboard?success=trip_created');
      }, 2000);

    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to create trip');
    } finally {
      clearTimeout(submitTimeout);
      setLoading(false);
    }
  };

  // Handle route calculation when both addresses are available
  const calculateRoute = async () => {
    if (!formData.pickupAddress || !formData.destinationAddress) {
      setRouteInfo(null);
      return;
    }

    try {
      // Wait for Google Maps to be available
      const { loadGoogleMaps } = await import('@/lib/google-maps-loader');
      await loadGoogleMaps();

      if (!window.google || !window.google.maps) {
        console.warn('Google Maps not available for route calculation');
        return;
      }

      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route({
        origin: formData.pickupAddress,
        destination: formData.destinationAddress,
        travelMode: window.google.maps.TravelMode.DRIVING,
      }, (result, status) => {
        if (status === 'OK') {
          const route = result.routes[0];
          const leg = route.legs[0];
          
          const routeData = {
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
          
          console.log('Route calculated:', routeData);
          setRouteInfo(routeData);
        } else {
          console.error('Route calculation failed:', status);
          setRouteInfo(null);
        }
      });
    } catch (error) {
      console.error('Error calculating route:', error);
      setRouteInfo(null);
    }
  };

  // Calculate route when addresses change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateRoute();
    }, 500); // Debounce route calculation

    return () => clearTimeout(timeoutId);
  }, [formData.pickupAddress, formData.destinationAddress]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Book Transportation</h1>
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-700">Client trip booked successfully! Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent text-gray-900 bg-white"
                required
              >
                <option value="">Choose a client...</option>
                
                {/* Individual Clients Section */}
                {individualClients && individualClients.length > 0 && (
                  <>
                    <option disabled className="font-semibold text-gray-900 bg-gray-100">
                      ═══ Individual Clients ═══
                    </option>
                    {individualClients
                      .filter(client => client.first_name)
                      .sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
                      .map(client => (
                        <option key={`individual-${client.id}`} value={client.id}>
                          📋 {client.first_name} {client.last_name}
                        </option>
                      ))}
                  </>
                )}

                {/* Facility Clients Section */}
                {managedClients && managedClients.length > 0 && (
                  <>
                    <option disabled className="font-semibold text-gray-900 bg-gray-100">
                      ═══ Facility Clients ═══
                    </option>
                    {(() => {
                      // Group managed clients by facility
                      const clientsByFacility = managedClients
                        .filter(client => client.first_name)
                        .reduce((groups, client) => {
                          const facility = facilities.find(f => f.id === client.facility_id);
                          const facilityName = facility?.name || 'Unknown Facility';
                          if (!groups[facilityName]) {
                            groups[facilityName] = [];
                          }
                          groups[facilityName].push(client);
                          return groups;
                        }, {});

                      // Sort facilities alphabetically and render
                      return Object.keys(clientsByFacility)
                        .sort()
                        .map(facilityName => (
                          <React.Fragment key={facilityName}>
                            <option disabled className="font-medium text-blue-800 bg-blue-50">
                              🏢 {facilityName}
                            </option>
                            {clientsByFacility[facilityName]
                              .sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
                              .map(client => (
                                <option key={`facility-${client.id}`} value={client.id}>
                                  &nbsp;&nbsp;&nbsp;👤 {client.first_name} {client.last_name}
                                </option>
                              ))}
                          </React.Fragment>
                        ));
                    })()}
                  </>
                )}
              </select>

              {selectedClient && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    {selectedClient?.medical_notes && (
                      <p className="text-gray-700 mb-1">
                        <strong>Medical notes:</strong> {selectedClient.medical_notes}
                      </p>
                    )}
                    {selectedClient?.accessibility_needs && (
                      <p className="text-gray-700">
                        <strong>Accessibility:</strong> {selectedClient.accessibility_needs}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.pickupDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, pickupDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent bg-white opacity-0 absolute top-0 left-0 cursor-pointer"
                    required
                  />
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 pointer-events-none flex items-center justify-between">
                    <span>
                      {formData.pickupDate 
                        ? new Date(formData.pickupDate + 'T00:00:00').toLocaleDateString('en-US')
                        : 'mm/dd/yyyy'
                      }
                    </span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Time *
                </label>
                <input
                  type="time"
                  value={formData.pickupTime}
                  onChange={(e) => {
                    const newPickupTime = e.target.value;
                    setFormData(prev => ({ ...prev, pickupTime: newPickupTime }));
                    
                    // Validate return time if round trip and return time is set
                    if (formData.isRoundTrip && formData.returnTime && newPickupTime) {
                      const pickupDateTime = new Date(`${formData.pickupDate}T${newPickupTime}`);
                      const returnDateTime = new Date(`${formData.pickupDate}T${formData.returnTime}`);
                      
                      // Calculate minimum return time (pickup + travel time + 30 minutes minimum)
                      const travelTimeMinutes = routeInfo?.duration?.value ? Math.ceil(routeInfo.duration.value / 60) : 60;
                      const minimumReturnTime = new Date(pickupDateTime.getTime() + (travelTimeMinutes + 30) * 60000);
                      
                      if (returnDateTime <= minimumReturnTime) {
                        const minTimeString = minimumReturnTime.toTimeString().slice(0, 5);
                        setError(`Return time must be at least ${Math.ceil((travelTimeMinutes + 30) / 60 * 100) / 100} hours after pickup time. Minimum return time: ${minTimeString}`);
                      } else {
                        if (error.includes('Return time must be')) {
                          setError('');
                        }
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent text-gray-900 bg-white"
                  required
                />
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Address *
                </label>
                <GoogleMapsAutocomplete
                  value={formData.pickupAddress}
                  onChange={(address) => setFormData(prev => ({ ...prev, pickupAddress: address }))}
                  placeholder="Enter pickup address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Apartment, suite, building entrance, etc. (optional)"
                  value={formData.pickupDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupDetails: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent mt-2 text-gray-900 bg-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Address *
                </label>
                <GoogleMapsAutocomplete
                  value={formData.destinationAddress}
                  onChange={(address) => setFormData(prev => ({ ...prev, destinationAddress: address }))}
                  placeholder="Enter destination address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Building, entrance, room number, etc. (optional)"
                  value={formData.destinationDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationDetails: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent mt-2 text-gray-900 bg-white placeholder-gray-500"
                />
              </div>
            </div>

            {/* Route Overview */}
            {routeInfo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Route Overview</h3>
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-lg">{routeInfo.distance?.text}</p>
                  <p>({routeInfo.distance?.miles?.toFixed(2)} miles)</p>
                  <p className="text-blue-600">{routeInfo.duration?.text} driving time</p>
                </div>
              </div>
            )}

            {/* Round Trip */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isRoundTrip"
                checked={formData.isRoundTrip}
                onChange={(e) => setFormData(prev => ({ ...prev, isRoundTrip: e.target.checked }))}
                className="h-4 w-4 text-[#7CCFD0] focus:ring-[#7CCFD0] border-gray-300 rounded"
              />
              <label htmlFor="isRoundTrip" className="ml-2 text-sm font-medium text-gray-700">
                Round trip
              </label>
            </div>

            {formData.isRoundTrip && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Time *
                </label>
                <input
                  type="time"
                  value={formData.returnTime}
                  onChange={(e) => {
                    const newReturnTime = e.target.value;
                    setFormData(prev => ({ ...prev, returnTime: newReturnTime }));
                    
                    // Validate return time
                    if (formData.pickupTime && newReturnTime) {
                      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);
                      const returnDateTime = new Date(`${formData.pickupDate}T${newReturnTime}`);
                      
                      // Calculate minimum return time (pickup + travel time + 30 minutes minimum)
                      const travelTimeMinutes = routeInfo?.duration?.value ? Math.ceil(routeInfo.duration.value / 60) : 60; // Default 1 hour if no route info
                      const minimumReturnTime = new Date(pickupDateTime.getTime() + (travelTimeMinutes + 30) * 60000); // Add travel time + 30 minutes
                      
                      if (returnDateTime <= minimumReturnTime) {
                        const minTimeString = minimumReturnTime.toTimeString().slice(0, 5);
                        setError(`Return time must be at least ${Math.ceil((travelTimeMinutes + 30) / 60 * 100) / 100} hours after pickup time. Minimum return time: ${minTimeString}`);
                      } else {
                        // Clear error if time is valid
                        if (error.includes('Return time must be')) {
                          setError('');
                        }
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent text-gray-900 bg-white"
                  required
                />
                {routeInfo && (
                  <p className="text-xs text-gray-600 mt-1">
                    Estimated travel time: {routeInfo.duration?.text || 'Calculating...'}. Please allow extra time for the appointment.
                  </p>
                )}
              </div>
            )}

            {/* Emergency Trip */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isEmergency"
                  checked={formData.isEmergency}
                  onChange={(e) => setFormData(prev => ({ ...prev, isEmergency: e.target.checked }))}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="isEmergency" className="ml-2 text-sm font-medium text-red-700">
                  🚨 Emergency Trip
                </label>
              </div>
              <p className="text-xs text-red-600 mt-1">
                Check this box if this client trip is an emergency requiring immediate attention. Additional $40 emergency fee applies.
              </p>
            </div>

            {/* Wheelchair Transportation */}
            <WheelchairSelectionFlow 
              onSelectionChange={handleWheelchairChange}
              selectedType={wheelchairData.type}
              needsProvided={wheelchairData.needsProvided}
              selectedClient={selectedClient}
            />

            {/* Additional Passengers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Passengers
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={formData.additionalPassengers}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalPassengers: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            {/* Trip Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Notes
              </label>
              <textarea
                placeholder="Special instructions for driver, medical equipment, client needs, etc."
                value={formData.tripNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, tripNotes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              />
            </div>

            {/* Pricing Display */}
            {currentPricing && (
              <div className="bg-gradient-to-br from-[#7CCFD0]/10 to-[#60BFC0]/5 rounded-lg border border-[#7CCFD0]/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-[#7CCFD0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Fare Estimate
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Quick Summary */}
                  <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">
                        {currentPricing.summary.tripType} • {currentPricing.summary.distance}
                        {currentPricing.distance?.isEstimated && (
                          <span className="ml-1 text-xs text-orange-600">
                            (estimated)
                          </span>
                        )}
                      </p>
                      {currentPricing.distance?.duration && (
                        <p className="text-xs text-gray-500">
                          Est. travel time: {currentPricing.distance.duration}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {currentPricing.summary.estimatedTotal}
                      </p>
                      {currentPricing.pricing?.veteranDiscount > 0 && (
                        <p className="text-xs text-green-600">
                          20% veteran discount applied
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  {currentPricing.pricing && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-[#7CCFD0] hover:text-[#60BFC0] flex items-center">
                        <span>View price breakdown</span>
                        <svg className="w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      
                      <div className="mt-3 space-y-2">
                        {(() => {
                          const { createPricingBreakdown } = require('@/lib/pricing');
                          return createPricingBreakdown(currentPricing.pricing, currentPricing.countyInfo).map((item, index) => (
                            <div 
                              key={index} 
                              className={`flex justify-between items-center py-1 ${
                                item.type === 'total' ? 'border-t border-gray-200 pt-2 font-semibold' :
                                item.type === 'subtotal' ? 'border-t border-gray-200 pt-2' : ''
                              }`}
                            >
                              <span className={`text-sm ${
                                item.type === 'total' ? 'text-gray-900 font-semibold' :
                                item.type === 'discount' ? 'text-green-600' :
                                item.type === 'premium' ? 'text-orange-600' :
                                'text-gray-700'
                              }`}>
                                {item.label}
                              </span>
                              <span className={`text-sm ${
                                item.type === 'total' ? 'text-gray-900 font-semibold' :
                                item.type === 'discount' ? 'text-green-600' :
                                item.type === 'premium' ? 'text-orange-600' :
                                'text-gray-700'
                              }`}>
                                ${Math.abs(item.amount).toFixed(2)}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </details>
                  )}

                  {/* Pricing Notes */}
                  <div className="text-xs text-gray-500 space-y-1">
                    {currentPricing.distance?.isEstimated && (
                      <p>• Distance is estimated - actual fare may vary based on route</p>
                    )}
                    {currentPricing.summary?.hasPremiums && (
                      <p>• Additional charges apply for off-hours, weekends, or wheelchair accessibility</p>
                    )}
                    {currentPricing.summary?.hasDiscounts && (
                      <p>• 20% veteran discount applied</p>
                    )}
                    <p>• Final fare may vary based on actual route and traffic conditions</p>
                  </div>
                </div>
              </div>
            )}

            {/* Map placeholder */}
            {formData.pickupAddress && formData.destinationAddress && (
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <p className="text-gray-600">Map will be displayed here</p>
                <p className="text-sm text-gray-500">Route: {formData.pickupAddress} → {formData.destinationAddress}</p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[#7CCFD0] text-white rounded-md hover:bg-[#60BFC0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Booking Trip...' : 'Book Client Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Simple Wheelchair Selection Component
function WheelchairSelectionFlow({ onSelectionChange, selectedType, needsProvided, selectedClient }) {
  const [showDetails, setShowDetails] = useState(false);
  const [requirements, setRequirements] = useState('');

  const handleTypeChange = (type) => {
    onSelectionChange({
      type,
      needsProvided: false,
      hasWheelchairFee: type === 'provided',
      fee: type === 'provided' ? 25 : 0,
      requirements: ''
    });
  };

  const handleProvidedChange = (provided) => {
    onSelectionChange({
      type: 'none',
      needsProvided: provided,
      hasWheelchairFee: provided,
      fee: provided ? 25 : 0,
      requirements: provided ? requirements : ''
    });
  };

  const handleRequirementsChange = (newRequirements) => {
    setRequirements(newRequirements);
    onSelectionChange({
      type: 'none',
      needsProvided: true,
      hasWheelchairFee: true,
      fee: 25,
      requirements: newRequirements
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="font-medium text-gray-900">Wheelchair Transportation</h3>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">What type of wheelchair does the client have?</p>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="wheelchairType"
                value="none"
                checked={selectedType === 'none' && !needsProvided}
                onChange={() => handleTypeChange('none')}
                className="h-4 w-4 text-[#7CCFD0] focus:ring-[#7CCFD0]"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">None</div>
                <div className="text-sm text-gray-600">Client has no wheelchair</div>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="wheelchairType"
                value="manual"
                checked={selectedType === 'manual'}
                onChange={() => handleTypeChange('manual')}
                className="h-4 w-4 text-[#7CCFD0] focus:ring-[#7CCFD0]"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">Manual wheelchair (client has their own)</div>
                <div className="text-sm text-gray-600">Standard manual wheelchair that client will bring</div>
                <div className="text-sm text-green-600 font-medium">No additional fee</div>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="wheelchairType"
                value="power"
                checked={selectedType === 'power'}
                onChange={() => handleTypeChange('power')}
                className="h-4 w-4 text-[#7CCFD0] focus:ring-[#7CCFD0]"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">Power wheelchair (client has their own)</div>
                <div className="text-sm text-gray-600">Electric/motorized wheelchair that client will bring</div>
                <div className="text-sm text-green-600 font-medium">No additional fee</div>
              </div>
            </label>

            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="font-medium text-red-800">Transport wheelchair</div>
              <div className="text-sm text-red-600">Not Available</div>
              <div className="text-xs text-red-600 mt-1">Lightweight transport chair - Not permitted for safety reasons</div>
            </div>
          </div>

          {/* Show "provide wheelchair" options only when "None" is selected */}
          {selectedType === 'none' && !needsProvided && (
            <div className="pt-3 border-t border-blue-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Does the client need us to provide a wheelchair?</p>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="wheelchairProvided"
                    checked={needsProvided}
                    onChange={() => handleProvidedChange(true)}
                    className="h-4 w-4 text-[#7CCFD0] focus:ring-[#7CCFD0]"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Yes, please provide a wheelchair</div>
                    <div className="text-sm text-gray-600">We will provide a suitable wheelchair for the client's trip</div>
                    <div className="text-sm text-blue-600 font-medium">
                      +${(selectedClient?.client_type === 'facility') ? '0' : '25'} wheelchair rental fee
                    </div>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="wheelchairProvided"
                    checked={!needsProvided}
                    onChange={() => handleProvidedChange(false)}
                    className="h-4 w-4 text-[#7CCFD0] focus:ring-[#7CCFD0]"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">No, wheelchair not needed</div>
                    <div className="text-sm text-gray-600">Client can walk or transfer independently</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Show requirements input when "provide wheelchair" is selected */}
          {selectedType === 'none' && needsProvided && (
            <div className="pt-3 border-t border-blue-200 bg-blue-25 p-3 rounded">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please specify wheelchair requirements for the client:
              </label>
              <textarea
                value={requirements}
                onChange={(e) => handleRequirementsChange(e.target.value)}
                placeholder="Example: Standard manual wheelchair, lightweight transport chair, power chair with joystick controls, etc."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                Provide specific details about the type of wheelchair needed, any special features, or client requirements.
              </p>
            </div>
          )}

          <div className="bg-blue-100 rounded p-3 mt-3">
            <p className="text-sm text-blue-800">
              <strong>Wheelchair Accessibility Information</strong><br />
              All our vehicles are equipped with wheelchair accessibility features. The same fee applies to all wheelchair types to ensure fair and transparent pricing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}