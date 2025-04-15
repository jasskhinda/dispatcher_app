'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DriverDetails({ params }) {
  const driverId = params.id;
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [tripsHistory, setTripsHistory] = useState([]);
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [driverStatus, setDriverStatus] = useState('available');

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

    async function fetchDriverDetails() {
      try {
        // Fetch driver profile with details
        const { data, error } = await supabase
          .from('users')
          .select(`
            *,
            driver_details:driver_details(*)
          `)
          .eq('id', driverId)
          .eq('role', 'driver')
          .single();

        if (error) throw error;
        
        if (!data) {
          setError('Driver not found');
          return;
        }

        setDriver(data);
        
        // Set form values
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhoneNumber(data.phone_number || '');
        setLicenseNumber(data.driver_details?.license_number || '');
        setVehicleInfo(data.driver_details?.vehicle_info || '');
        setDriverStatus(data.driver_details?.status || 'available');
        
        // Fetch recent trips for this driver
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .eq('driver_id', driverId)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (tripsError) {
          console.error('Error fetching trips:', tripsError);
        } else {
          setTripsHistory(tripsData || []);
        }
        
      } catch (error) {
        console.error('Error fetching driver:', error);
        setError('Failed to load driver details');
      } finally {
        setLoading(false);
      }
    }

    fetchDriverDetails();
  }, [user, router, driverId, isDispatcher, signOut]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update user profile in users table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          updated_at: new Date(),
        })
        .eq('id', driverId);

      if (userUpdateError) throw userUpdateError;

      // Update driver details
      const { error: detailsUpdateError } = await supabase
        .from('driver_details')
        .update({
          license_number: licenseNumber,
          vehicle_info: vehicleInfo,
          status: driverStatus,
          updated_at: new Date(),
        })
        .eq('driver_id', driverId);

      if (detailsUpdateError) throw detailsUpdateError;

      setSuccess('Driver information updated successfully');
      
      // Update local state
      setDriver(prev => ({
        ...prev,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        driver_details: {
          ...(prev.driver_details || {}),
          license_number: licenseNumber,
          vehicle_info: vehicleInfo,
          status: driverStatus,
        },
      }));
      
    } catch (error) {
      console.error('Error updating driver:', error);
      setError('Failed to update driver information');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = [
    { value: 'available', label: 'Available', color: 'green' },
    { value: 'on_trip', label: 'On Trip', color: 'blue' },
    { value: 'inactive', label: 'Inactive', color: 'red' },
    { value: 'off_duty', label: 'Off Duty', color: 'gray' },
  ];

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Driver Details</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/drivers')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Drivers
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <div className="w-12 h-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading driver details...</p>
          </div>
        ) : error ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/drivers')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Return to Drivers List
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Driver form */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Edit Driver Information
                  </h3>
                </div>

                {success && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 m-6">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-green-700">{success}</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="md:col-span-2">
                      <h4 className="text-md font-medium text-gray-900 mb-4">Personal Information</h4>
                    </div>
                    
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        id="phoneNumber"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* Driver Specific Information */}
                    <div className="md:col-span-2 pt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-4">Driver Details</h4>
                    </div>
                    
                    <div>
                      <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">Driver's License Number</label>
                      <input
                        id="licenseNumber"
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        id="status"
                        value={driverStatus}
                        onChange={(e) => setDriverStatus(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label htmlFor="vehicleInfo" className="block text-sm font-medium text-gray-700">Vehicle Information</label>
                      <textarea
                        id="vehicleInfo"
                        rows={3}
                        value={vehicleInfo}
                        onChange={(e) => setVehicleInfo(e.target.value)}
                        required
                        placeholder="Year, Make, Model, Color, License Plate"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push('/drivers')}
                      className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right column - Driver summary and recent trips */}
            <div>
              {/* Driver summary card */}
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Driver Summary</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-600">
                      {firstName.charAt(0)}{lastName.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        {firstName} {lastName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {driver.email}
                      </p>
                    </div>
                  </div>
                  
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Current Status</dt>
                      <dd className="mt-1">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${driverStatus === 'available' ? 'bg-green-100 text-green-800' : 
                            driverStatus === 'on_trip' ? 'bg-blue-100 text-blue-800' : 
                            driverStatus === 'inactive' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {statusOptions.find(s => s.value === driverStatus)?.label || driverStatus}
                        </span>
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Trips</dt>
                      <dd className="mt-1 text-sm text-gray-900">{driver.driver_details?.total_trips || 0}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Rating</dt>
                      <dd className="mt-1 text-sm text-gray-900 flex items-center">
                        {driver.driver_details?.rating || 0}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z" clipRule="evenodd" />
                        </svg>
                      </dd>
                    </div>
                    
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Account Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(driver.created_at).toLocaleDateString()} 
                        ({Math.floor((new Date() - new Date(driver.created_at)) / (1000 * 60 * 60 * 24))} days ago)
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* Recent trips */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Trips</h3>
                </div>
                <div className="p-6">
                  {tripsHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm">No trips found for this driver</p>
                  ) : (
                    <div className="space-y-4">
                      {tripsHistory.map(trip => (
                        <div key={trip.id} className="border border-gray-200 rounded-md p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{trip.client_name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(trip.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${trip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                trip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'}`}>
                              {trip.status}
                            </span>
                          </div>
                          <div className="mt-2 text-xs">
                            <div className="flex items-center">
                              <span className="h-3 w-3 rounded-full bg-green-500 inline-block mr-1"></span>
                              <p className="text-gray-700">{trip.pickup_location}</p>
                            </div>
                            <div className="flex items-center mt-1">
                              <span className="h-3 w-3 rounded-full bg-red-500 inline-block mr-1"></span>
                              <p className="text-gray-700">{trip.dropoff_location}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => {
                            router.push('/dashboard');
                            // Ideal: router.push(`/trips?driver_id=${driverId}`); to a filtered trips page
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View all trips
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