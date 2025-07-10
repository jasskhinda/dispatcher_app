'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EditTripForm from '../../components/EditTripForm';

export default function TripDetailsClient({ trip, user }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [error, setError] = useState('');
  const [showDriverSelect, setShowDriverSelect] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(trip.driver_id || '');
  const [drivers, setDrivers] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(trip);

  // Fetch available drivers on mount
  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'driver')
        .order('first_name');
      
      if (!error && data) {
        setDrivers(data);
      }
    };
    
    fetchDrivers();
  }, [supabase]);

  // Handle driver assignment
  const handleAssignDriver = async () => {
    setUpdating(true);
    setError('');
    
    try {
      let updateData = {};
      
      if (selectedDriverId) {
        // Get driver's name
        const selectedDriver = drivers.find(d => d.id === selectedDriverId);
        const driverName = selectedDriver 
          ? `${selectedDriver.first_name || ''} ${selectedDriver.last_name || ''}`.trim() 
          : '';
        
        updateData = {
          driver_id: selectedDriverId,
          driver_name: driverName,
          status: currentTrip.status === 'pending' ? 'upcoming' : currentTrip.status
        };
      } else {
        // Remove driver assignment
        updateData = {
          driver_id: null,
          driver_name: null,
          status: currentTrip.status === 'upcoming' ? 'pending' : currentTrip.status
        };
      }
      
      // Update trip
      const { error: updateError } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', currentTrip.id);
      
      if (updateError) {
        throw updateError;
      }
      
      // Refresh the page to show updated data
      router.refresh();
      setShowDriverSelect(false);
    } catch (err) {
      console.error('Error updating driver assignment:', err);
      setError('Failed to update driver assignment. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle trip edit save
  const handleTripSave = (updatedTrip) => {
    setCurrentTrip(updatedTrip);
    setShowEditForm(false);
  };

  // Handle trip edit cancel
  const handleTripEditCancel = () => {
    setShowEditForm(false);
  };

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trip Details</h1>
            <p className="text-sm text-gray-600 mt-1">Trip ID: {currentTrip.id.slice(0, 8)}...</p>
          </div>
          <div className="flex items-center space-x-3">
            {currentTrip.status === 'pending' && (
              <button
                onClick={() => setShowEditForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                ✏️ Edit Trip
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : currentTrip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trip information - left column */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Trip Information</h3>
                  <span className={`px-3 py-1 text-sm rounded-full font-medium
                    ${currentTrip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      currentTrip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                      currentTrip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                      currentTrip.status === 'upcoming' ? 'bg-indigo-100 text-indigo-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {currentTrip.status?.replace('_', ' ') || 'pending'}
                  </span>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-600">Pickup Time</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatTime(currentTrip.pickup_time)}</dd>
                    </div>
                    
                    {currentTrip.return_pickup_time && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-600">Return Pickup Time</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatTime(currentTrip.return_pickup_time)}</dd>
                      </div>
                    )}
                    
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-600">Route</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <div className="flex items-center mb-2">
                          <span className="h-2 w-2 rounded-full bg-green-500 inline-block mr-2 flex-shrink-0"></span>
                          <span>{currentTrip.pickup_address || currentTrip.pickup_location}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-red-500 inline-block mr-2 flex-shrink-0"></span>
                          <span>{currentTrip.destination_address || currentTrip.dropoff_location}</span>
                        </div>
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Estimated Duration</dt>
                      <dd className="mt-1 text-sm text-gray-900">{currentTrip.estimated_duration || 30} minutes</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Created At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatTime(currentTrip.created_at)}</dd>
                    </div>
                    
                    {/* Edit Tracking Information */}
                    {currentTrip.last_edited_by && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-600">Last Edited</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatTime(currentTrip.last_edited_at || currentTrip.updated_at)}
                          <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            ✏️ EDITED BY {currentTrip.edited_by_role?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </dd>
                      </div>
                    )}
                    
                    {currentTrip.special_requirements && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-600">Special Requirements</dt>
                        <dd className="mt-1 text-sm text-gray-900">{currentTrip.special_requirements}</dd>
                      </div>
                    )}
                    
                    {currentTrip.notes && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-600">Notes</dt>
                        <dd className="mt-1 text-sm text-gray-900">{currentTrip.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
            
            {/* Client and driver information - right column */}
            <div>
              {/* Client information */}
              <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-6 border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
                </div>
                <div className="p-6">
                  {currentTrip.client_name ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-600">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {currentTrip.client_name}
                        </dd>
                      </div>
                      {currentTrip.phone_number && (
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900">{currentTrip.phone_number}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-500">Client information not available</p>
                  )}
                </div>
              </div>
              
              {/* Driver information */}
              <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Driver Information</h3>
                </div>
                <div className="p-6">
                  {currentTrip.driver_name ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-600">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {currentTrip.driver_name}
                        </dd>
                      </div>
                      {currentTrip.driver_phone && (
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900">{currentTrip.driver_phone}</dd>
                        </div>
                      )}
                      <div className="mt-4">
                        <button
                          onClick={() => setShowDriverSelect(!showDriverSelect)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                        >
                          Change Driver
                        </button>
                      </div>
                    </dl>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-4">No driver assigned to this trip</p>
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowDriverSelect(!showDriverSelect)}
                          className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
                        >
                          Assign Driver
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Driver selection UI */}
                  {showDriverSelect && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {error && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {error}
                        </div>
                      )}
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full p-3 mb-3 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={updating}
                      >
                        <option value="">
                          {currentTrip.driver_id ? 'Remove driver assignment' : 'Select a driver'}
                        </option>
                        {drivers.map(driver => (
                          <option key={driver.id} value={driver.id}>
                            {driver.first_name} {driver.last_name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAssignDriver}
                          disabled={updating || (selectedDriverId === '' && !currentTrip.driver_id)}
                          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                        >
                          {updating ? 'Updating...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDriverSelect(false);
                            setSelectedDriverId(currentTrip.driver_id || '');
                          }}
                          disabled={updating}
                          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit Trip Form Modal */}
      {showEditForm && (
        <EditTripForm 
          trip={currentTrip}
          onSave={handleTripSave}
          onCancel={handleTripEditCancel}
        />
      )}
    </div>
  );
}