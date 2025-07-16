'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DriverDetailPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const unwrappedParams = use(params);
  const driverId = unwrappedParams.id;
  const activeTab = searchParams.get('tab') || 'details';
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [driver, setDriver] = useState(null);
  const [availableTrips, setAvailableTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadDriverData = async (session) => {
    try {
      // Get driver profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', driverId)
        .eq('role', 'driver')
        .single();
      
      if (error) {
        setError(`Error fetching driver: ${error.message}`);
        setLoading(false);
        return;
      }
      
      if (!data) {
        setError("Driver not found");
        setLoading(false);
        return;
      }
      
      setDriver(data);
      setLoading(false);
    } catch (err) {
      setError(`An unexpected error occurred: ${err.message}`);
      setLoading(false);
    }
  };

  const loadAvailableTrips = async () => {
    setTripsLoading(true);
    try {
      // Get upcoming trips that don't have a driver assigned
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          user_profile:profiles(first_name, last_name, phone_number, email),
          facility:facilities(id, name, contact_email)
        `)
        .eq('status', 'upcoming')
        .is('driver_id', null)
        .order('pickup_time', { ascending: true });

      if (error) {
        throw error;
      }

      setAvailableTrips(data || []);
    } catch (err) {
      setError(`Error loading available trips: ${err.message}`);
    } finally {
      setTripsLoading(false);
    }
  };

  const handleAssignTrip = async (tripId) => {
    setAssignmentLoading(true);
    setActionMessage('');
    
    try {
      const response = await fetch('/api/trips/assign-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: tripId,
          driverId: driverId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign trip');
      }

      setActionMessage(result.message || 'Trip assigned successfully!');
      
      // Refresh available trips
      await loadAvailableTrips();
      
      // Clear message after 3 seconds
      setTimeout(() => setActionMessage(''), 3000);

    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
      setTimeout(() => setActionMessage(''), 5000);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Check auth status when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);
      
      // Check if user has dispatcher role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile || profile.role !== 'dispatcher') {
        // Not a dispatcher, redirect to login
        supabase.auth.signOut();
        router.push('/login?error=Access%20denied');
        return;
      }
      
      // Load the driver data
      await loadDriverData(session);
      
      // Load available trips if on assign-trips tab
      if (activeTab === 'assign-trips') {
        await loadAvailableTrips();
      }
    };
    
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase, driverId, activeTab]);
  
  // Show loading if not authenticated yet
  if (!user) {
    return null;
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getClientDisplayName = (trip) => {
    if (trip.facility) {
      return trip.facility.name;
    }
    if (trip.user_profile) {
      return `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim() || 'Unknown Client';
    }
    return 'Unknown Client';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Driver Details' : 'Driver Details'}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage driver information and assign trips
              </p>
            </div>
            <button
              onClick={() => router.push('/drivers')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Drivers
            </button>
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            actionMessage.includes('Error') 
              ? 'bg-red-100 border border-red-400 text-red-700'
              : 'bg-green-100 border border-green-400 text-green-700'
          }`}>
            <p className="font-semibold">{actionMessage}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading driver information...</p>
          </div>
        )}

        {/* Driver Content */}
        {driver && !loading && (
          <div>
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => router.push(`/drivers/${driverId}?tab=details`)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'details' || activeTab === null
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Driver Details
                </button>
                <button
                  onClick={() => router.push(`/drivers/${driverId}?tab=assign-trips`)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'assign-trips'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Assign Trips
                  {availableTrips.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                      {availableTrips.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {(activeTab === 'details' || activeTab === null) && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Personal Information */}
                  <div className="md:col-span-2 space-y-4">
                    <h2 className="text-lg font-medium pb-2 border-b border-gray-200">
                      Personal Information
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">First Name</p>
                        <p className="font-medium">{driver.first_name || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Last Name</p>
                        <p className="font-medium">{driver.last_name || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium">{driver.phone_number || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{driver.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Information */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-medium pb-2 border-b border-gray-200">
                      Status
                    </h2>
                    
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-500 mb-1">Current Status</p>
                      <div className="flex items-center">
                        <span className={`inline-flex rounded-full h-3 w-3 mr-2 ${
                          driver.status === 'available' ? 'bg-green-500' : 
                          driver.status === 'on_trip' ? 'bg-orange-500' : 
                          driver.status === 'offline' ? 'bg-red-500' : 'bg-gray-500'
                        }`}></span>
                        <p className="font-medium capitalize">{driver.status?.replace('_', ' ') || 'Available'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Vehicle Information */}
                <div className="mt-8 space-y-4">
                  <h2 className="text-lg font-medium pb-2 border-b border-gray-200">
                    Vehicle Information
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Model</p>
                      <p className="font-medium">{driver.vehicle_model || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">License Plate</p>
                      <p className="font-medium">{driver.vehicle_license || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assign Trips Tab */}
            {activeTab === 'assign-trips' && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Available Trips for Assignment
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Select trips to assign to {driver.first_name} {driver.last_name}
                  </p>
                </div>

                {tripsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading available trips...</p>
                  </div>
                ) : availableTrips.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Trips</h3>
                    <p className="text-gray-500">
                      There are currently no upcoming trips available for assignment.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trip Route
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pickup Time
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {availableTrips.map((trip) => (
                          <tr key={trip.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    {trip.facility ? (
                                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                    ) : (
                                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {getClientDisplayName(trip)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {trip.facility ? 'Facility Trip' : 'Individual Trip'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                <div className="font-medium">From: {trip.pickup_address || 'Not specified'}</div>
                                <div className="text-gray-500">To: {trip.destination_address || 'Not specified'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(trip.pickup_time)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleAssignTrip(trip.id)}
                                disabled={assignmentLoading}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                              >
                                {assignmentLoading ? 'Assigning...' : 'Assign Trip'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}