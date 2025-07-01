'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function EditTripForm({ trip, onSave, onCancel }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    pickup_time: '',
    pickup_address: trip?.pickup_address || '',
    destination_address: trip?.destination_address || trip?.dropoff_address || '',
    client_name: trip?.client_name || '',
    phone_number: trip?.phone_number || '',
    wheelchair_type: trip?.wheelchair_type || 'standard',
    additional_passengers: trip?.additional_passengers || 0,
    is_round_trip: trip?.is_round_trip || false,
    notes: trip?.notes || '',
    special_requirements: trip?.special_requirements || ''
  });

  // Initialize pickup time from trip data
  useEffect(() => {
    if (trip?.pickup_time) {
      // Convert to local datetime format for input
      const date = new Date(trip.pickup_time);
      const localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
        .toISOString()
        .slice(0, 16);
      setFormData(prev => ({
        ...prev,
        pickup_time: localDateTime
      }));
    }
  }, [trip]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Validate required fields
      if (!formData.pickup_time || !formData.pickup_address || !formData.destination_address) {
        throw new Error('Please fill in all required fields');
      }

      // Prepare update data
      const updateData = {
        pickup_time: new Date(formData.pickup_time).toISOString(),
        pickup_address: formData.pickup_address.trim(),
        destination_address: formData.destination_address.trim(),
        client_name: formData.client_name.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        wheelchair_type: formData.wheelchair_type,
        additional_passengers: parseInt(formData.additional_passengers) || 0,
        is_round_trip: formData.is_round_trip,
        notes: formData.notes.trim() || null,
        special_requirements: formData.special_requirements.trim() || null,
        updated_at: new Date().toISOString()
      };

      // Update the trip
      const { error: updateError } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', trip.id)
        .eq('status', 'pending'); // Only allow editing of pending trips

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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
            {/* Trip Details Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Trip Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="pickup_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="pickup_time"
                    name="pickup_time"
                    value={formData.pickup_time}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="pickup_address" className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup Address *
                  </label>
                  <input
                    type="text"
                    id="pickup_address"
                    name="pickup_address"
                    value={formData.pickup_address}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Enter pickup address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="destination_address" className="block text-sm font-medium text-gray-700 mb-1">
                    Destination Address *
                  </label>
                  <input
                    type="text"
                    id="destination_address"
                    name="destination_address"
                    value={formData.destination_address}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Enter destination address"
                  />
                </div>
              </div>
            </div>

            {/* Client Information Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    id="client_name"
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Enter client name"
                  />
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            {/* Trip Options Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Trip Options</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wheelchair_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Accessibility Requirements
                  </label>
                  <select
                    id="wheelchair_type"
                    name="wheelchair_type"
                    value={formData.wheelchair_type}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="standard">Standard Vehicle</option>
                    <option value="wheelchair">Wheelchair Accessible</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="additional_passengers" className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Passengers
                  </label>
                  <input
                    type="number"
                    id="additional_passengers"
                    name="additional_passengers"
                    value={formData.additional_passengers}
                    onChange={handleInputChange}
                    min="0"
                    max="4"
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_round_trip"
                      name="is_round_trip"
                      checked={formData.is_round_trip}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label htmlFor="is_round_trip" className="ml-2 text-sm text-gray-700">
                      Round Trip
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="special_requirements" className="block text-sm font-medium text-gray-700 mb-1">
                    Special Requirements
                  </label>
                  <textarea
                    id="special_requirements"
                    name="special_requirements"
                    value={formData.special_requirements}
                    onChange={handleInputChange}
                    rows={2}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Any special requirements..."
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Additional notes or instructions..."
                  />
                </div>
              </div>
            </div>

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