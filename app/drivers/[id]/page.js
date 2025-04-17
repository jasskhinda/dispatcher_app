'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DriverDetailPage({ params }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const unwrappedParams = use(params);
  const driverId = unwrappedParams.id;
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [driver, setDriver] = useState(null);

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
    };
    
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase, driverId]);
  
  // Show loading if not authenticated yet
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Driver Details</h1>
          <button
            onClick={() => router.push('/drivers')}
            className="px-4 py-2 border border-brand-border rounded-md text-sm hover:bg-brand-border/10"
          >
            Back to Drivers
          </button>
        </div>
        
        {loading && (
          <div className="text-center py-12">
            <p>Loading driver information...</p>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
            <p>{error}</p>
          </div>
        )}
        
        {driver && !loading && (
          <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Personal Information */}
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-lg font-medium pb-2 border-b border-brand-border">
                  Personal Information
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-brand-muted">First Name</p>
                    <p className="font-medium">{driver.first_name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-brand-muted">Last Name</p>
                    <p className="font-medium">{driver.last_name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-brand-muted">Phone Number</p>
                    <p className="font-medium">{driver.phone_number || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-brand-muted">Email</p>
                    <p className="font-medium">{driver.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              {/* Status Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium pb-2 border-b border-brand-border">
                  Status
                </h2>
                
                <div className="p-4 bg-brand-border/5 rounded-md">
                  <p className="text-sm text-brand-muted mb-1">Current Status</p>
                  <div className="flex items-center">
                    <span className={`inline-flex rounded-full h-3 w-3 mr-2 ${
                      driver.status === 'available' ? 'bg-green-500' : 
                      driver.status === 'on_trip' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}></span>
                    <p className="font-medium capitalize">{driver.status?.replace('_', ' ') || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Vehicle Information */}
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-medium pb-2 border-b border-brand-border">
                Vehicle Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-brand-muted">Vehicle Model</p>
                  <p className="font-medium">{driver.vehicle_model || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-brand-muted">License Plate</p>
                  <p className="font-medium">{driver.vehicle_license || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            {/* Trip Statistics (placeholder) */}
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-medium pb-2 border-b border-brand-border">
                Trip Statistics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-brand-border/5 rounded-md">
                  <p className="text-sm text-brand-muted">Total Trips</p>
                  <p className="text-2xl font-medium">0</p>
                </div>
                
                <div className="p-4 bg-brand-border/5 rounded-md">
                  <p className="text-sm text-brand-muted">This Month</p>
                  <p className="text-2xl font-medium">0</p>
                </div>
                
                <div className="p-4 bg-brand-border/5 rounded-md">
                  <p className="text-sm text-brand-muted">Avg. Rating</p>
                  <p className="text-2xl font-medium">N/A</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}