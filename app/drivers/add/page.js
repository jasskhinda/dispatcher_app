'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AddDriver() {
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is authenticated and redirect if not
  if (!user) {
    router.push('/login');
    return null;
  }
  
  // Check if user has dispatcher role
  if (!isDispatcher()) {
    signOut();
    router.push('/login?error=Access denied. This application is only for dispatchers.');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // First, create the auth user with Supabase
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        setError(authError.message || 'Failed to create driver account');
        return;
      }

      if (!authData || !authData.user) {
        setError('Failed to create driver account');
        return;
      }

      // Now create the driver profile in the users table
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          role: 'driver', // Set role to driver
          created_at: new Date(),
        }]);

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        setError('Account created but had trouble setting up the profile');
        return;
      }

      // Create driver-specific details
      const { error: driverDetailsError } = await supabase
        .from('driver_details')
        .insert([{
          driver_id: authData.user.id,
          license_number: licenseNumber,
          vehicle_info: vehicleInfo,
          status: 'available',
          rating: 0,
          total_trips: 0,
        }]);

      if (driverDetailsError) {
        console.error('Error creating driver details:', driverDetailsError);
        setError('Account and profile created but had trouble setting up driver details');
        return;
      }

      // Create initial location record for the driver
      const { error: locationError } = await supabase
        .from('driver_locations')
        .insert([{
          driver_id: authData.user.id,
          latitude: 0, // Default values that will be updated when driver logs in
          longitude: 0,
          updated_at: new Date(),
        }]);

      if (locationError) {
        console.error('Error creating initial location:', locationError);
        // Not critical, just log it
      }

      // Success!
      setSuccess('Driver account successfully created');
      
      // Reset the form
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setLicenseNumber('');
      setVehicleInfo('');
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Add New Driver</h1>
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
          <h2 className="text-xl font-semibold mb-6">Driver Registration Form</h2>
          
          {error && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded" role="alert">
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium text-gray-900 mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="mt-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="mt-4">
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

              <div className="mt-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 6 characters long
                </p>
              </div>
            </div>

            {/* Driver Specific Information */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-md font-medium text-gray-900 mb-4">Driver Information</h3>
              
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
              
              <div className="mt-4">
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

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Driver Account'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}