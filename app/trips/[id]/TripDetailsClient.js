'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function TripDetailsClient({ trip, user }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [error, setError] = useState('');
  const [showDriverSelect, setShowDriverSelect] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(trip.driver_id || '');
  const [drivers, setDrivers] = useState([]);
  const [updating, setUpdating] = useState(false);

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
          status: trip.status === 'pending' ? 'upcoming' : trip.status
        };
      } else {
        // Remove driver assignment
        updateData = {
          driver_id: null,
          driver_name: null,
          status: trip.status === 'upcoming' ? 'pending' : trip.status
        };
      }
      
      // Update trip
      const { error: updateError } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', trip.id);
      
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

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-brand-background">
      {/* Header */}
      <header className="bg-brand-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trip Details</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/calendar')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-brand-accent hover:opacity-90"
            >
              Calendar View
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md bg-brand-border/20 hover:bg-brand-border/30"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
            <div className="bg-brand-cancelled/10 border-l-4 border-brand-cancelled p-4 mb-4">
              <p className="text-sm text-brand-cancelled">{error}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/calendar')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-accent hover:opacity-90"
              >
                Return to Calendar
              </button>
            </div>
          </div>
        ) : trip && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Trip information - left column */}
            <div className="md:col-span-2">
              <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
                <div className="px-6 py-5 border-b border-brand-border flex justify-between items-center">
                  <h3 className="text-lg font-medium">Trip Information</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium
                    ${trip.status === 'completed' ? 'bg-brand-completed/20 text-brand-completed' : 
                      trip.status === 'in_progress' ? 'bg-brand-inProgress/20 text-brand-inProgress' : 
                      trip.status === 'cancelled' ? 'bg-brand-cancelled/20 text-brand-cancelled' : 
                      trip.status === 'upcoming' ? 'bg-brand-upcoming/20 text-brand-upcoming' : 
                      'bg-brand-pending/20 text-brand-pending'}`}>
                    {trip.status?.replace('_', ' ') || 'pending'}
                  </span>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div className="col-span-2">
                      <dt className="text-sm font-medium opacity-70">Pickup Time</dt>
                      <dd className="mt-1 text-sm">{formatTime(trip.pickup_time)}</dd>
                    </div>
                    
                    {trip.return_pickup_time && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium opacity-70">Return Pickup Time</dt>
                        <dd className="mt-1 text-sm">{formatTime(trip.return_pickup_time)}</dd>
                      </div>
                    )}
                    
                    <div className="col-span-2">
                      <dt className="text-sm font-medium opacity-70">Route</dt>
                      <dd className="mt-1 text-sm">
                        <div className="flex items-center mb-2">
                          <span className="h-2 w-2 rounded-full bg-brand-completed inline-block mr-2 flex-shrink-0"></span>
                          <span>{trip.pickup_address || trip.pickup_location}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-brand-cancelled inline-block mr-2 flex-shrink-0"></span>
                          <span>{trip.destination_address || trip.dropoff_location}</span>
                        </div>
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium opacity-70">Estimated Duration</dt>
                      <dd className="mt-1 text-sm">{trip.estimated_duration || 30} minutes</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium opacity-70">Created At</dt>
                      <dd className="mt-1 text-sm">{formatTime(trip.created_at)}</dd>
                    </div>
                    
                    {trip.special_requirements && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium opacity-70">Special Requirements</dt>
                        <dd className="mt-1 text-sm">{trip.special_requirements}</dd>
                      </div>
                    )}
                    
                    {trip.notes && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium opacity-70">Notes</dt>
                        <dd className="mt-1 text-sm">{trip.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
            
            {/* Client and driver information - right column */}
            <div>
              {/* Client information */}
              <div className="bg-brand-card shadow rounded-lg overflow-hidden mb-6 border border-brand-border">
                <div className="px-6 py-5 border-b border-brand-border">
                  <h3 className="text-lg font-medium">Client Information</h3>
                </div>
                <div className="p-6">
                  {trip.client_name ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium opacity-70">Name</dt>
                        <dd className="mt-1 text-sm">
                          {trip.client_name}
                        </dd>
                      </div>
                      {trip.phone_number && (
                        <div>
                          <dt className="text-sm font-medium opacity-70">Phone</dt>
                          <dd className="mt-1 text-sm">{trip.phone_number}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm opacity-70">Client information not available</p>
                  )}
                </div>
              </div>
              
              {/* Driver information */}
              <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
                <div className="px-6 py-5 border-b border-brand-border">
                  <h3 className="text-lg font-medium">Driver Information</h3>
                </div>
                <div className="p-6">
                  {trip.driver_name ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium opacity-70">Name</dt>
                        <dd className="mt-1 text-sm">
                          {trip.driver_name}
                        </dd>
                      </div>
                      {trip.driver_phone && (
                        <div>
                          <dt className="text-sm font-medium opacity-70">Phone</dt>
                          <dd className="mt-1 text-sm">{trip.driver_phone}</dd>
                        </div>
                      )}
                      <div className="mt-4">
                        <button
                          onClick={() => setShowDriverSelect(!showDriverSelect)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md bg-brand-border/20 hover:bg-brand-border/30"
                        >
                          Change Driver
                        </button>
                      </div>
                    </dl>
                  ) : (
                    <div>
                      <p className="text-sm opacity-70 mb-4">No driver assigned to this trip</p>
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowDriverSelect(!showDriverSelect)}
                          className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-brand-accent hover:opacity-90"
                        >
                          Assign Driver
                        </button>
                        <button
                          onClick={() => router.push('/optimize')}
                          className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md bg-brand-border/20 hover:bg-brand-border/30"
                        >
                          Bulk Optimize
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Driver selection UI */}
                  {showDriverSelect && (
                    <div className="mt-4 p-4 bg-brand-background rounded-md border border-brand-border">
                      {error && (
                        <div className="mb-3 p-2 bg-brand-cancelled/10 border border-brand-cancelled/20 rounded text-sm text-brand-cancelled">
                          {error}
                        </div>
                      )}
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full p-2 mb-3 border border-brand-border rounded-md bg-brand-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        disabled={updating}
                      >
                        <option value="">
                          {trip.driver_id ? 'Remove driver assignment' : 'Select a driver'}
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
                          disabled={updating || (selectedDriverId === '' && !trip.driver_id)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md text-white bg-brand-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? 'Updating...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDriverSelect(false);
                            setSelectedDriverId(trip.driver_id || '');
                          }}
                          disabled={updating}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-border/20 hover:bg-brand-border/30"
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
    </div>
  );
}