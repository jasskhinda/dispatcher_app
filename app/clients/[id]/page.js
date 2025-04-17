'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ClientDetailPage({ params }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const unwrappedParams = use(params);
  const clientId = unwrappedParams.id;
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);

  const loadClientData = async (session) => {
    try {
      // Get client profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .eq('role', 'client')
        .single();
      
      if (error) {
        setError(`Error fetching client: ${error.message}`);
        setLoading(false);
        return;
      }
      
      if (!data) {
        setError("Client not found");
        setLoading(false);
        return;
      }
      
      setClient(data);
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
      
      // Load the client data
      await loadClientData(session);
    };
    
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase, clientId]);
  
  // Show loading if not authenticated yet
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Client Details</h1>
          <button
            onClick={() => router.push('/clients')}
            className="px-4 py-2 border border-brand-border rounded-md text-sm hover:bg-brand-border/10"
          >
            Back to Clients
          </button>
        </div>
        
        {loading && (
          <div className="text-center py-12">
            <p>Loading client information...</p>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
            <p>{error}</p>
          </div>
        )}
        
        {client && !loading && (
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
                    <p className="font-medium">{client.first_name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-brand-muted">Last Name</p>
                    <p className="font-medium">{client.last_name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-brand-muted">Phone Number</p>
                    <p className="font-medium">{client.phone_number || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-brand-muted">Email</p>
                    <p className="font-medium">{client.email || 'N/A'}</p>
                  </div>
                </div>
                
                {client.address && (
                  <div>
                    <p className="text-sm text-brand-muted">Address</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                )}
                
                {client.notes && (
                  <div>
                    <p className="text-sm text-brand-muted">Notes</p>
                    <p className="font-medium whitespace-pre-line">{client.notes}</p>
                  </div>
                )}
              </div>
              
              {/* Status Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium pb-2 border-b border-brand-border">
                  Client Status
                </h2>
                
                <div className="p-4 bg-brand-border/5 rounded-md">
                  <p className="text-sm text-brand-muted mb-1">Status</p>
                  <div className="flex items-center">
                    <span className={`inline-flex rounded-full h-3 w-3 mr-2 bg-green-500`}></span>
                    <p className="font-medium">Active</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Trip Statistics (placeholder) */}
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-medium pb-2 border-b border-brand-border">
                Service Statistics
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
                  <p className="text-sm text-brand-muted">Last Trip</p>
                  <p className="text-lg font-medium">N/A</p>
                </div>
              </div>
            </div>
            
            {/* Recent Trips (placeholder for future implementation) */}
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-medium pb-2 border-b border-brand-border">
                Recent Trips
              </h2>
              
              <div className="text-center py-8 text-brand-muted">
                <p>No recent trips found</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}