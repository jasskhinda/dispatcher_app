'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClientSupabase } from '@/lib/client-supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from './DashboardLayout';
import PricingDisplay from './PricingDisplay';
import WheelchairSelectionFlow from './WheelchairSelectionFlow';
import EnhancedClientInfoForm from './EnhancedClientInfoForm';
import HolidayPricingChecker from './HolidayPricingChecker';
import { getTodayISO } from '../utils/dateUtils';

// Dynamically import Google Maps components to prevent SSR issues
const SuperSimpleMap = dynamic(() => import('./SuperSimpleMap'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-gray-600 text-sm">Loading map...</p>
    </div>
  </div>
});

const SimpleAutocomplete = dynamic(() => import('./SimpleAutocomplete'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
});

export default function StreamlinedBookingForm({ user }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('client');
  
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [facilityId, setFacilityId] = useState(null);
  const [facilityDefaults, setFacilityDefaults] = useState({});
  
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    pickupAddress: '',
    pickupDetails: '',
    destinationAddress: '',
    destinationDetails: '',
    pickupDate: '',
    pickupTime: '',
    isRoundTrip: false,
    returnTime: '',
    wheelchairType: 'no_wheelchair',
    additionalPassengers: 0,
    tripNotes: '',
    billTo: 'facility', // facility or client
    isEmergency: false
  });

  const [selectedClient, setSelectedClient] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentPricing, setCurrentPricing] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Wheelchair selection data
  const [wheelchairData, setWheelchairData] = useState({
    type: 'none',
    needsProvided: false,
    customType: '',
    hasWheelchairFee: false,
    fee: 0
  });

  // Enhanced client information state
  const [clientInfoData, setClientInfoData] = useState({
    weight: '',
    height_feet: '',
    height_inches: '',
    date_of_birth: '',
    email: '',
    isBariatric: false,
    bariatricRate: 50
  });

  // Holiday pricing state
  const [holidayData, setHolidayData] = useState({
    isHoliday: false,
    holidayName: '',
    surcharge: 0
  });

  useEffect(() => {
    loadFacilityAndClients();
    
    // Check if this is a rebooking
    if (searchParams.get('rebook') === 'true') {
      const rebookDataStr = sessionStorage.getItem('rebookTripData');
      if (rebookDataStr) {
        try {
          const rebookData = JSON.parse(rebookDataStr);
          
          // Update form with rebooked trip data
          setFormData(prev => ({
            ...prev,
            pickupAddress: rebookData.pickup_address || '',
            destinationAddress: rebookData.destination_address || '',
            isRoundTrip: rebookData.is_round_trip || false,
            wheelchairType: rebookData.wheelchair_type || 'no_wheelchair',
            additionalPassengers: rebookData.additional_passengers || 0,
            tripNotes: rebookData.trip_notes || rebookData.notes || '',
            clientId: rebookData.managed_client_id || ''
          }));
          
          // Set wheelchair data
          if (rebookData.wheelchair_type && rebookData.wheelchair_type !== 'none') {
            setWheelchairData({
              type: rebookData.wheelchair_type === 'wheelchair' ? 'standard' : rebookData.wheelchair_type,
              needsProvided: false,
              customType: '',
              hasWheelchairFee: true,
              fee: 0
            });
          }
          
          // Clear the stored data
          sessionStorage.removeItem('rebookTripData');
          
          // Show a message to the user
          setSuccess('Trip details loaded from previous booking. Please update the date/time and review all details.');
        } catch (err) {
          console.error('Error loading rebook data:', err);
        }
      }
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId);
      setSelectedClient(client);
      
      // Auto-fill pickup address if client has default address
      if (client?.address && !formData.pickupAddress) {
        setFormData(prev => ({
          ...prev,
          pickupAddress: client.address
        }));
      }
    }
  }, [formData.clientId, clients]);

  async function loadFacilityAndClients() {
    try {
      const supabase = createClientSupabase();
      
      // Get facility info
      const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.facility_id) {
        setFacilityId(profile.facility_id);
        
        // Get facility defaults
        const { data: facility } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', profile.facility_id)
          .single();
          
        if (facility) {
          setFacilityDefaults({
            address: facility.address,
            phone: facility.phone_number
          });
        }
        
        // Load all clients (authenticated + managed) using the API
        console.log('🔍 Loading clients for booking form...');
        const response = await fetch('/api/facility/clients');
        
        if (response.ok) {
          const data = await response.json();
          const allClients = data.clients || [];
          
          // Filter only active clients and add display names
          const activeClients = allClients
            .filter(client => {
              // For authenticated clients, check status
              if (client.client_type === 'authenticated') {
                return client.status === 'active';
              }
              // For managed clients, they're considered active by default
              return client.client_type === 'managed';
            })
            .map(client => ({
              ...client,
              display_name: `${client.first_name} ${client.last_name}${client.client_type === 'managed' ? ' (Managed)' : ''}`
            }))
            .sort((a, b) => a.first_name.localeCompare(b.first_name));
          
          console.log('✅ Loaded', activeClients.length, 'clients for booking');
          setClients(activeClients);
        } else {
          console.error('Failed to load clients:', response.status);
          setError('Failed to load clients');
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load facility data');
    }
  }

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

  // Handle enhanced client info changes
  const handleClientInfoChange = useCallback((newClientInfo) => {
    setClientInfoData(newClientInfo);
  }, []);

  // Handle holiday pricing changes
  const handleHolidayChange = useCallback((newHolidayData) => {
    setHolidayData(newHolidayData);
  }, []);

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
    
    // Validate round trip times
    if (formData.isRoundTrip && formData.returnTime) {
      const pickupTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);
      const returnTime = new Date(`${formData.pickupDate}T${formData.returnTime}`);
      
      if (returnTime <= pickupTime) {
        setError('Return time must be after pickup time for round trips');
        return;
      }
    }

    // Validate wheelchair selection
    if (wheelchairData.isTransportChair) {
      setError('We are unable to accommodate transport wheelchairs due to safety regulations. Please select a different wheelchair option or choose "None" for us to provide suitable accommodation.');
      return;
    }

    // Validate client weight (John's requirement: 400 lbs maximum)
    if (clientInfoData.weight && parseFloat(clientInfoData.weight) > 400) {
      setError('Cannot accommodate rides over 400 lbs - Please contact us for alternative arrangements');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const supabase = createClientSupabase();
      
      // Combine date and time
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);
      
      // Determine if this is an authenticated client or managed client
      const selectedClientData = clients.find(c => c.id === formData.clientId);
      
      // Create trip with appropriate client reference
      const tripData = {
        facility_id: facilityId,
        pickup_address: formData.pickupAddress,
        pickup_details: formData.pickupDetails,
        destination_address: formData.destinationAddress,
        destination_details: formData.destinationDetails,
        pickup_time: pickupDateTime.toISOString(),
        wheelchair_type: wheelchairData.isTransportChair ? 'transport_not_allowed' : 
                        wheelchairData.needsProvided ? 'provided' : 
                        wheelchairData.type === 'none' ? 'no_wheelchair' : 
                        wheelchairData.type,
        additional_passengers: formData.additionalPassengers,
        trip_notes: formData.tripNotes,
        status: 'pending',
        booked_by: user.id,
        bill_to: formData.billTo,
        // Add pricing information if available
        price: currentPricing?.pricing?.total || null,
        is_round_trip: formData.isRoundTrip,
        distance: routeInfo?.distance?.miles || currentPricing?.distance?.distance || null,
        // Add route information from map if available
        route_duration: routeInfo?.duration?.text || null,
        route_distance_text: routeInfo?.distance?.text || null,
        route_duration_text: routeInfo?.duration?.text || null,
        // Add pricing breakdown data - LOCKED FROM BOOKING
        pricing_breakdown_data: currentPricing ? {
          pricing: currentPricing.pricing,
          distance: currentPricing.distance,
          summary: currentPricing.summary,
          countyInfo: currentPricing.countyInfo,
          clientInfo: clientInfoData,
          wheelchairInfo: wheelchairData,
          holidayInfo: holidayData,
          createdAt: new Date().toISOString(),
          source: 'StreamlinedBookingForm'
        } : null,
        pricing_breakdown_total: currentPricing?.pricing?.total || null,
        pricing_breakdown_locked_at: currentPricing ? new Date().toISOString() : null
      };
      
      // Set the appropriate client reference based on client type
      if (selectedClientData?.client_type === 'managed') {
        tripData.managed_client_id = formData.clientId;
        tripData.user_id = null;
        console.log('📝 Creating trip for managed client:', selectedClientData.email);
      } else {
        tripData.user_id = formData.clientId;
        tripData.managed_client_id = null;
        console.log('📝 Creating trip for authenticated client:', selectedClientData?.email);
      }
      
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert(tripData)
        .select()
        .single();
        
      if (tripError) throw tripError;

      // 🎉 DEPLOYMENT CHECK: If you see this, new code is deployed! 🎉
      console.log('🎉🎉🎉 DEPLOYMENT VERIFIED - NEW CODE ACTIVE 🎉🎉🎉');
      console.log('📧 Calling notification API for trip:', trip.id);

      // Notify dispatchers in the background
      notifyDispatchersInBackground(trip.id);

      // If round trip, create return trip
      if (formData.isRoundTrip && formData.returnTime) {
        const returnDateTime = new Date(`${formData.pickupDate}T${formData.returnTime}`);
        
        const returnTripData = {
          ...tripData,
          pickup_address: formData.destinationAddress,
          pickup_details: formData.destinationDetails,
          destination_address: formData.pickupAddress,
          destination_details: formData.pickupDetails,
          pickup_time: returnDateTime.toISOString(),
          trip_notes: `Return trip. ${formData.tripNotes}`,
          related_trip_id: trip.id,
        };
        
        await supabase.from('trips').insert(returnTripData);
      }
      
      setSuccess(true);
      
      // Reset form or redirect with preloader protection
      setTimeout(() => {
        // Use window.location for more reliable navigation after form submission
        window.location.href = '/dashboard/trips';
      }, 2000);
      
    } catch (err) {
      console.error('Error booking trip:', err);
      setError(err.message || 'Failed to book trip');
    } finally {
      setLoading(false);
    }
  };

  // Function to notify dispatchers in the background
  const notifyDispatchersInBackground = async (tripId) => {
    console.log('📧 Inside notifyDispatchersInBackground, trip ID:', tripId);
    try {
      console.log('📧 Sending request to /api/trips/notify-dispatchers...');
      const supabase = createClientSupabase();
      const notifyResponse = await fetch('/api/trips/notify-dispatchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId }),
      });

      console.log('📧 Response status:', notifyResponse.status);
      const notifyResult = await notifyResponse.json();
      console.log('📧 Response data:', notifyResult);

      if (!notifyResponse.ok) {
        console.error('❌ Error notifying dispatchers:', notifyResult.error);
        // We don't block the user experience if notification fails
      } else {
        console.log('✅ Dispatchers notified successfully');
      }
    } catch (notifyError) {
      console.error('Error in dispatcher notification:', notifyError);
      // Don't throw - this is non-blocking
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];
  
  // Generate time options
  const timeOptions = [];
  for (let hour = 5; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const time = `${h}:${m}`;
      const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
      timeOptions.push({ value: time, label: displayTime });
    }
  }

  return (
    <DashboardLayout user={user} activeTab="book">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white  rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#2E4F54] text-gray-900">
              Book Transportation
            </h1>
            <Link
              href="/dashboard/clients/add"
              className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Add New Client
            </Link>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
              Trip booked successfully! Redirecting...
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                Select Client *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                required
              >
                <option value="">Choose a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.display_name || `${client.first_name} ${client.last_name}`} {client.phone_number ? `- ${client.phone_number}` : ''}
                  </option>
                ))}
              </select>
              {selectedClient && (
                <div className="mt-2 p-3 bg-gray-50  rounded-lg text-sm">
                  {selectedClient.medical_requirements && (
                    <p className="text-[#2E4F54]/80 text-gray-900/80">
                      <span className="font-medium">Medical notes:</span> {selectedClient.medical_requirements}
                    </p>
                  )}
                  {selectedClient.accessibility_needs && (
                    <p className="text-[#2E4F54]/80 text-gray-900/80 mt-1">
                      <span className="font-medium">Accessibility:</span> {selectedClient.accessibility_needs}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                  Pickup Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.pickupDate}
                    onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                    min={getTodayISO()}
                    className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] opacity-0 absolute top-0 left-0 cursor-pointer"
                    required
                  />
                  <div className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white text-[#2E4F54] text-gray-900 pointer-events-none flex items-center justify-between">
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
                <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                  Pickup Time *
                </label>
                <select
                  value={formData.pickupTime}
                  onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                >
                  <option value="">Select time...</option>
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                  Pickup Address *
                </label>
                <SimpleAutocomplete
                  value={formData.pickupAddress}
                  onChange={(value) => setFormData({ ...formData, pickupAddress: value })}
                  placeholder="Enter pickup address"
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                />
                <input
                  type="text"
                  value={formData.pickupDetails}
                  onChange={(e) => setFormData({ ...formData, pickupDetails: e.target.value })}
                  placeholder="Apartment, suite, building entrance, etc. (optional)"
                  className="mt-2 w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                  Destination Address *
                </label>
                <SimpleAutocomplete
                  value={formData.destinationAddress}
                  onChange={(value) => setFormData({ ...formData, destinationAddress: value })}
                  placeholder="Enter destination address"
                  className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                />
                <input
                  type="text"
                  value={formData.destinationDetails}
                  onChange={(e) => setFormData({ ...formData, destinationDetails: e.target.value })}
                  placeholder="Building, entrance, room number, etc. (optional)"
                  className="mt-2 w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                />
              </div>
            </div>

            {/* Route Map Display */}
            {formData.pickupAddress && formData.destinationAddress && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                  Route Overview
                </label>
                <SuperSimpleMap
                  origin={formData.pickupAddress}
                  destination={formData.destinationAddress}
                  onRouteCalculated={setRouteInfo}
                />
              </div>
            )}

            {/* Round Trip */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isRoundTrip}
                  onChange={(e) => setFormData({ ...formData, isRoundTrip: e.target.checked })}
                  className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] rounded focus:ring-[#7CCFD0]"
                />
                <span className="text-[#2E4F54] text-gray-900">Round trip</span>
              </label>
              
              {formData.isRoundTrip && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                    Return Time
                  </label>
                  <select
                    value={formData.returnTime}
                    onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                    className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  >
                    <option value="">Select return time...</option>
                    {timeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Emergency Trip Option */}
            <div className="bg-red-50 dark:bg-[#fa2c37] border border-red-200 dark:border-red-800/30 rounded-lg p-4">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isEmergency}
                  onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                  className="mt-1 w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                />
                <div>
                  <span className="text-red-800 dark:text-white font-medium">🚨 Emergency Trip</span>
                  <p className="text-sm text-red-700 dark:text-white mt-1">
                    Check this box if this is an emergency trip requiring immediate attention.
                    <span className="font-medium"> Additional $40 emergency fee applies.</span>
                  </p>
                </div>
              </label>
            </div>

            {/* Wheelchair Selection */}
            <div className="col-span-1 md:col-span-2">
              <WheelchairSelectionFlow
                onWheelchairChange={handleWheelchairChange}
                initialValue={wheelchairData.type}
                className="mt-2"
              />
            </div>

            {/* Enhanced Client Information */}
            <div className="col-span-1 md:col-span-2">
              <EnhancedClientInfoForm
                onClientInfoChange={handleClientInfoChange}
                initialData={clientInfoData}
                selectedClient={selectedClient}
                className="mt-2"
              />
            </div>

            {/* Holiday Pricing Checker */}
            <div className="col-span-1 md:col-span-2">
              <HolidayPricingChecker
                onHolidayChange={handleHolidayChange}
                selectedDate={formData.pickupDate}
                holidayData={holidayData}
                className="mt-2"
              />
            </div>

            {/* Additional Passengers */}
            <div>
              <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                Additional Passengers
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={formData.additionalPassengers}
                onChange={(e) => setFormData({ ...formData, additionalPassengers: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                Trip Notes
              </label>
              <textarea
                value={formData.tripNotes}
                onChange={(e) => setFormData({ ...formData, tripNotes: e.target.value })}
                placeholder="Special instructions, medical equipment, etc."
                rows={3}
                className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
              />
            </div>

            {/* Pricing Display */}
            <PricingDisplay 
              formData={formData}
              selectedClient={selectedClient}
              routeInfo={routeInfo}
              onPricingCalculated={setCurrentPricing}
              wheelchairData={wheelchairData}
              clientInfoData={clientInfoData}
              holidayData={holidayData}
            />

            {/* Billing */}
            <div>
              <label className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
                Bill To
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="facility"
                    checked={formData.billTo === 'facility'}
                    onChange={(e) => setFormData({ ...formData, billTo: e.target.value })}
                    className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] focus:ring-[#7CCFD0]"
                  />
                  <span className="text-[#2E4F54] text-gray-900">Facility</span>
                </label>
                <p className="text-xs text-[#2E4F54]/70 text-gray-900/70 ml-7">
                  All trips are billed to the facility for consolidated billing
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg text-[#2E4F54] text-gray-900 hover:bg-gray-50 dark:hover:bg-[#24393C] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Book Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}