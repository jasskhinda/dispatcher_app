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
      // Create profile record for the driver
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            email,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            role: 'driver',
            full_name: `${firstName} ${lastName}`.trim(),
            vehicle_model: vehicleModel,
            vehicle_license: vehicleLicense,
            status,
            created_at: new Date().toISOString(),
          }
        ])
        .select();

      if (error) {
        throw error;
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
                  className="w-full p-2 border border-brand-border rounded-md bg-brand-background"
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