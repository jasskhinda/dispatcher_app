'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import PricingDisplay from './PricingDisplay';
import WheelchairSelectionFlow from './WheelchairSelectionFlow';

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

export default function EditTripForm({ trip, onSave, onCancel }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPricing, setCurrentPricing] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    pickupDate: '',
    pickupTime: '',
    pickupAddress: trip?.pickup_address || '',
    pickupDetails: trip?.pickup_details || '',
    destinationAddress: trip?.destination_address || trip?.dropoff_address || '',
    destinationDetails: trip?.destination_details || '',
    wheelchairType: trip?.wheelchair_type || 'no_wheelchair',
    additionalPassengers: trip?.additional_passengers || 0,
    isRoundTrip: trip?.is_round_trip || false,
    returnTime: trip?.return_pickup_time ? new Date(trip.return_pickup_time).toTimeString().slice(0,5) : '',
    tripNotes: trip?.trip_notes || '',
    billTo: trip?.bill_to || 'facility',
    isEmergency: false
  });

  // Wheelchair selection data
  const [wheelchairData, setWheelchairData] = useState({
    type: trip?.wheelchair_type === 'no_wheelchair' ? 'none' : trip?.wheelchair_type || 'none',
    needsProvided: trip?.wheelchair_type === 'provided' || false,
    customType: '',
    hasWheelchairFee: false,
    fee: 0
  });

  // Initialize pickup date and time from trip data
  useEffect(() => {
    if (trip?.pickup_time) {
      const date = new Date(trip.pickup_time);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().slice(0, 5);
      setFormData(prev => ({
        ...prev,
        pickupDate: dateStr,
        pickupTime: timeStr
      }));
    }

    // Get current user for edit tracking
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setCurrentUser({ ...user, role: profile?.role || 'dispatcher' });
      }
    };
    getCurrentUser();

    // Set up a mock client for pricing calculations
    if (trip) {
      setSelectedClient({
        client_type: 'facility', // Since this is from dispatcher viewing facility trips
        id: trip.user_id || trip.managed_client_id
      });
    }
  }, [trip]);

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

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Validate required fields
      if (!formData.pickupDate || !formData.pickupTime || !formData.pickupAddress || !formData.destinationAddress) {
        throw new Error('Please fill in all required fields');
      }

      // Check if trip is still pending (only pending trips can be edited)
      const { data: currentTrip, error: checkError } = await supabase
        .from('trips')
        .select('status')
        .eq('id', trip.id)
        .single();

      if (checkError) {
        throw new Error('Failed to verify trip status');
      }

      if (currentTrip.status !== 'pending') {
        throw new Error('This trip can no longer be edited. Only pending trips can be modified.');
      }

      // Combine date and time
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);

      // Prepare update data with correct column names
      const updateData = {
        pickup_time: pickupDateTime.toISOString(),
        pickup_address: formData.pickupAddress.trim(),
        pickup_details: formData.pickupDetails.trim() || null,
        destination_address: formData.destinationAddress.trim(),
        destination_details: formData.destinationDetails.trim() || null,
        wheelchair_type: wheelchairData.isTransportChair ? 'transport_not_allowed' : 
                        wheelchairData.needsProvided ? 'provided' : 
                        wheelchairData.type === 'none' ? 'no_wheelchair' : 
                        wheelchairData.type,
        additional_passengers: parseInt(formData.additionalPassengers) || 0,
        is_round_trip: formData.isRoundTrip,
        trip_notes: formData.tripNotes.trim() || null,
        bill_to: formData.billTo,
        // Add pricing information if available
        price: currentPricing?.pricing?.total || trip?.price || null,
        distance: routeInfo?.distance?.miles || currentPricing?.distance?.distance || trip?.distance || null,
        // Add route information from map if available
        route_duration: routeInfo?.duration?.text || trip?.route_duration || null,
        route_distance_text: routeInfo?.distance?.text || trip?.route_distance_text || null,
        route_duration_text: routeInfo?.duration?.text || trip?.route_duration_text || null,
        // Add edit tracking
        last_edited_by: currentUser?.id || null,
        edited_by_role: currentUser?.role || 'dispatcher',
        updated_at: new Date().toISOString()
      };

      // Update the trip
      const { error: updateError } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', trip.id)
        .eq('status', 'pending'); // Double check status constraint

      if (updateError) {
        throw updateError;
      }

      setSuccessMessage('Trip updated successfully!');
      
      // Call the onSave callback
      if (onSave) {
        onSave({ ...trip, ...updateData });
      }

      // Auto-close after success
      setTimeout(() => {
        if (onCancel) onCancel();
      }, 1500);

    } catch (err) {
      console.error('Error updating trip:', err);
      setError(err.message || 'Failed to update trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Trip Details
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status indicator */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-yellow-800">
                Trip Status: <strong>Pending Approval</strong> - Only pending trips can be edited
              </span>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Date *
                </label>
                <input
                  type="date"
                  value={formData.pickupDate}
                  onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                  min={today}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Time *
                </label>
                <select
                  value={formData.pickupTime}
                  onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Address *
                </label>
                <SimpleAutocomplete
                  value={formData.pickupAddress}
                  onChange={(value) => setFormData({ ...formData, pickupAddress: value })}
                  placeholder="Enter pickup address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
                <input
                  type="text"
                  value={formData.pickupDetails}
                  onChange={(e) => setFormData({ ...formData, pickupDetails: e.target.value })}
                  placeholder="Apartment, suite, building entrance, etc. (optional)"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Address *
                </label>
                <SimpleAutocomplete
                  value={formData.destinationAddress}
                  onChange={(value) => setFormData({ ...formData, destinationAddress: value })}
                  placeholder="Enter destination address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
                <input
                  type="text"
                  value={formData.destinationDetails}
                  onChange={(e) => setFormData({ ...formData, destinationDetails: e.target.value })}
                  placeholder="Building, entrance, room number, etc. (optional)"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Route Map Display */}
            {formData.pickupAddress && formData.destinationAddress && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="text-gray-700">Round trip</span>
              </label>
              
              {formData.isRoundTrip && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Time
                  </label>
                  <select
                    value={formData.returnTime}
                    onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isEmergency}
                  onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                  className="mt-1 w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                  disabled={loading}
                />
                <div>
                  <span className="text-red-800 font-medium">🚨 Emergency Trip</span>
                  <p className="text-sm text-red-700 mt-1">
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
                disabled={loading}
              />
            </div>

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
                onChange={(e) => setFormData({ ...formData, additionalPassengers: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Notes
              </label>
              <textarea
                value={formData.tripNotes}
                onChange={(e) => setFormData({ ...formData, tripNotes: e.target.value })}
                placeholder="Special instructions, medical equipment, etc."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Billing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill To
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="facility"
                    checked={formData.billTo === 'facility'}
                    onChange={(e) => setFormData({ ...formData, billTo: e.target.value })}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-gray-700">Facility</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="client"
                    checked={formData.billTo === 'client'}
                    onChange={(e) => setFormData({ ...formData, billTo: e.target.value })}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-gray-700">Client</span>
                </label>
              </div>
            </div>

            {/* Pricing Display */}
            <PricingDisplay 
              formData={formData}
              selectedClient={selectedClient}
              routeInfo={routeInfo}
              onPricingCalculated={setCurrentPricing}
            />

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}