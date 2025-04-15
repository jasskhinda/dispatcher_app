'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CreateTrip() {
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('client_id');
  
  // Form state
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('30');
  const [specialRequirements, setSpecialRequirements] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clientDetails, setClientDetails] = useState(null);
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Ensure user has dispatcher role
    if (!isDispatcher()) {
      signOut();
      router.push('/login?error=Access denied. This application is only for dispatchers.');
      return;
    }
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
    
    // Default time (10:00 AM)
    setScheduledTime('10:00');
    
    // Fetch clients and drivers
    fetchClientsAndDrivers();
  }, [user, router, isDispatcher, signOut, preselectedClientId]);
  
  // Fetch clients and available drivers
  const fetchClientsAndDrivers = async () => {
    setLoading(true);
    
    try {
      // Fetch all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone_number')
        .eq('role', 'client')
        .order('last_name', { ascending: true });
        
      if (clientsError) throw clientsError;
      
      // Fetch all drivers with active status
      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select(`
          id, 
          first_name, 
          last_name,
          driver_details(status)
        `)
        .eq('role', 'driver')
        .not('driver_details.status', 'eq', 'inactive');
        
      if (driversError) throw driversError;
      
      // Process the data
      const processedClients = clientsData;
      
      const processedDrivers = driversData
        .filter(driver => driver.driver_details?.status === 'available' || driver.driver_details?.status === 'off_duty')
        .map(driver => ({
          id: driver.id,
          name: `${driver.first_name} ${driver.last_name}`,
          status: driver.driver_details?.status
        }));
      
      setClients(processedClients);
      setDrivers(processedDrivers);
      
      // If a client is preselected, get their details
      if (preselectedClientId) {
        setSelectedClientId(preselectedClientId);
        const selectedClient = processedClients.find(c => c.id === preselectedClientId);
        if (selectedClient) {
          setClientDetails(selectedClient);
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load clients and drivers data');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle client selection change
  const handleClientChange = async (clientId) => {
    setSelectedClientId(clientId);
    
    if (!clientId) {
      setClientDetails(null);
      return;
    }
    
    // Get client details
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      setClientDetails(data);
      
    } catch (error) {
      console.error('Error fetching client details:', error);
      setError('Failed to load client details');
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedClientId) {
      setError('Please select a client for this trip');
      return;
    }
    
    if (!pickupLocation || !dropoffLocation) {
      setError('Pickup and dropoff locations are required');
      return;
    }
    
    if (!scheduledDate || !scheduledTime) {
      setError('Scheduled date and time are required');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Combine date and time for the scheduled_time
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      
      // Create the trip record
      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            client_id: selectedClientId,
            driver_id: selectedDriverId || null,
            pickup_location: pickupLocation,
            dropoff_location: dropoffLocation,
            scheduled_time: scheduledDateTime.toISOString(),
            estimated_duration: parseInt(estimatedDuration),
            special_requirements: specialRequirements,
            notes: notes,
            status: 'upcoming', // Trip is immediately set to upcoming status
            created_at: new Date().toISOString(),
            created_by: user.id,
            client_name: clientDetails ? `${clientDetails.first_name} ${clientDetails.last_name}` : ''
          }
        ])
        .select();
        
      if (error) throw error;
      
      setSuccess('Trip created successfully!');
      
      // Reset form after successful submission
      if (!preselectedClientId) {
        setSelectedClientId('');
      }
      setSelectedDriverId('');
      setPickupLocation('');
      setDropoffLocation('');
      setNotes('');
      setSpecialRequirements('');
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating trip:', error);
      setError('Failed to create trip: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Create New Trip</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Trip Details</h2>
          
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}
          
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client selection */}
              <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700">Client</label>
                <select
                  id="client"
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select a client --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name} - {client.phone_number || client.email}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Client details card if a client is selected */}
              {clientDetails && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-800 mb-2">Client Details</h3>
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Name:</span> {clientDetails.first_name} {clientDetails.last_name}
                  </p>
                  <p className="text-sm text-blue-900 mt-1">
                    <span className="font-medium">Contact:</span> {clientDetails.phone_number || clientDetails.email}
                  </p>
                </div>
              )}
              
              {/* Driver selection (optional) */}
              <div>
                <label htmlFor="driver" className="block text-sm font-medium text-gray-700">
                  Driver (Optional)
                </label>
                <select
                  id="driver"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">-- No driver assigned --</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.status})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  You can leave this blank and assign a driver later, or use the AI Trip Optimization tool.
                </p>
              </div>
              
              {/* Pickup and dropoff */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="pickup" className="block text-sm font-medium text-gray-700">Pickup Location</label>
                  <input
                    id="pickup"
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dropoff" className="block text-sm font-medium text-gray-700">Dropoff Location</label>
                  <input
                    id="dropoff"
                    type="text"
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* Scheduled date and time */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">Scheduled Date</label>
                  <input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700">Scheduled Time</label>
                  <input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* Estimated duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Estimated Duration (minutes)
                </label>
                <input
                  id="duration"
                  type="number"
                  min="5"
                  max="240"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              {/* Special requirements */}
              <div>
                <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
                  Special Requirements
                </label>
                <textarea
                  id="requirements"
                  rows={2}
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder="Wheelchair accessible, extra space, etc."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional information about this trip..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              {/* Submit button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}