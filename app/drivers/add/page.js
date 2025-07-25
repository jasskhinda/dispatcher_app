'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AddDriver() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleLicense, setVehicleLicense] = useState('');
  const [status, setStatus] = useState('available');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
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
      }
    };
    
    checkAuth();
  }, [router, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Generate a random password for the driver's account
      const password = Math.random().toString(36).slice(-10) + Math.random().toString(10).slice(-2);
      
      // Prepare driver profile data - ensure fields match your profiles table schema
      // Don't set full_name as it's calculated automatically by the database
      const userProfile = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        vehicle_model: vehicleModel,
        vehicle_license: vehicleLicense,
        status: status,
      };
      
      // Call the serverless function to create the user and profile
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          userProfile,
          role: 'driver'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // If there's already a profile but with a different role, this is a real error
        if (result.error && result.error.includes('already has a') && !result.error.includes('driver profile')) {
          throw new Error(result.error || 'Failed to create driver');
        }
        
        // Otherwise, the API might be handling auto-created profiles, so check the error message
        if (result.error && !result.error.includes('already has a')) {
          throw new Error(result.error || 'Failed to create driver');
        }
        
        // If we get here, it might be an existing profile that was handled correctly,
        // so we'll treat it as a success
        console.log('User profile existed, but API handled it:', result);
      }

      // Success!
      setSuccess('Driver account successfully created');
      
      // Reset the form
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setVehicleModel('');
      setVehicleLicense('');
      setStatus('available');
      
    } catch (err) {
      console.error('Error creating driver:', err);
      setError(err.message || 'An error occurred while creating the driver');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if not authenticated yet
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Add New Driver</h1>
          <button
            onClick={() => router.push('/drivers')}
            className="px-4 py-2 border border-brand-border rounded-md text-sm hover:bg-brand-border/10"
          >
            Back to Drivers
          </button>
        </div>
        
        <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
          <h2 className="text-lg font-medium mb-6">Driver Information</h2>
          
          {error && (
            <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 border-l-4 border-green-500 bg-green-50 text-green-700 rounded">
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-brand-border/5 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                />
              </div>
            </div>

            {/* Driver Specific Information */}
            <div className="bg-brand-border/5 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Vehicle Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vehicleModel" className="block text-sm font-medium mb-1">Vehicle Model</label>
                  <input
                    id="vehicleModel"
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                    placeholder="Make, Model, Year"
                    className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                  />
                </div>
                
                <div>
                  <label htmlFor="vehicleLicense" className="block text-sm font-medium mb-1">License Plate</label>
                  <input
                    id="vehicleLicense"
                    type="text"
                    value={vehicleLicense}
                    onChange={(e) => setVehicleLicense(e.target.value)}
                    required
                    className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="status" className="block text-sm font-medium mb-1">Initial Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border border-brand-border rounded-md bg-brand-background appearance-none pr-8 relative"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\' /%3E%3C/svg%3E")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                  <option value="available">Available</option>
                  <option value="offline">Offline</option>
                  <option value="on_trip">On Trip</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/drivers')}
                className="px-4 py-2 border border-brand-border rounded-md mr-3 hover:bg-brand-border/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-brand-accent text-brand-buttonText rounded-md hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {loading ? 'Creating...' : 'Create Driver'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}