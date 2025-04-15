'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ClientDetails({ params }) {
  const clientId = params.id;
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  
  const [client, setClient] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
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

    async function fetchClientDetails() {
      try {
        // Fetch client profile
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', clientId)
          .eq('role', 'client')
          .single();

        if (error) throw error;
        
        if (!data) {
          setError('Client not found');
          return;
        }

        setClient(data);
        setNotes(data.notes || '');
        
        // Fetch client's trips
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select(`
            *,
            invoices:invoices(*)
          `)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
          
        if (tripsError) {
          console.error('Error fetching trips:', tripsError);
        } else {
          // Process the trips data to include invoice information
          const processedTrips = tripsData?.map(trip => {
            const latestInvoice = trip.invoices && trip.invoices.length > 0
              ? trip.invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
              : null;
            
            return {
              ...trip,
              has_invoice: !!latestInvoice,
              invoice_status: latestInvoice?.status || null,
              payment_status: latestInvoice?.payment_status || null,
            };
          }) || [];
          
          setTrips(processedTrips);
        }
        
      } catch (error) {
        console.error('Error fetching client:', error);
        setError('Failed to load client details');
      } finally {
        setLoading(false);
      }
    }

    fetchClientDetails();
  }, [user, router, clientId, isDispatcher, signOut]);

  const handleSaveNotes = async () => {
    setSaving(true);
    setSuccess('');
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          notes,
          updated_at: new Date()
        })
        .eq('id', clientId);

      if (error) throw error;
      setSuccess('Client notes updated successfully');
      
      // Update client in state
      setClient(prev => ({
        ...prev,
        notes
      }));
    } catch (error) {
      console.error('Error updating client notes:', error);
      setError('Failed to update client notes');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Client Details</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/clients')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Clients
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <div className="w-12 h-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading client details...</p>
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
                onClick={() => router.push('/clients')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Return to Clients List
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Client info */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Client Information</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-600">
                      {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        {client.first_name} {client.last_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {client.email}
                      </p>
                    </div>
                  </div>
                  
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.phone_number || 'Not provided'}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Client Since</dt>
                      <dd className="mt-1 text-sm text-gray-900">{new Date(client.created_at).toLocaleDateString()}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Trips</dt>
                      <dd className="mt-1 text-sm text-gray-900">{trips.length}</dd>
                    </div>
                    
                    <div className="col-span-2 pt-4">
                      <dt className="text-sm font-medium text-gray-500 mb-2">Client Notes</dt>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
                        rows="4"
                        placeholder="Add notes about this client..."
                      ></textarea>
                      
                      {success && (
                        <div className="mt-2 text-sm text-green-600">{success}</div>
                      )}
                      
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={handleSaveNotes}
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Notes'}
                        </button>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
              
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Actions</h3>
                </div>
                <div className="p-6 space-y-4">
                  <button
                    onClick={() => router.push(`/trips/new?client_id=${client.id}`)}
                    className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Schedule New Trip
                  </button>
                </div>
              </div>
            </div>

            {/* Right column - Trip history */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Trip History</h3>
                </div>
                <div className="p-6">
                  {trips.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500">No trips found for this client</p>
                      <button 
                        className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                        onClick={() => router.push(`/trips/new?client_id=${client.id}`)}
                      >
                        Schedule First Trip
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {trips.map((trip) => (
                        <div key={trip.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {new Date(trip.created_at).toLocaleDateString()}
                              </span>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${trip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                  trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                  trip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                  trip.status === 'upcoming' ? 'bg-purple-100 text-purple-800' : 
                                  'bg-yellow-100 text-yellow-800'}`}>
                                {trip.status || 'pending'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {trip.has_invoice && (
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${trip.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                                    trip.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                                    trip.payment_status === 'overdue' ? 'bg-red-100 text-red-800' : 
                                    'bg-gray-100 text-gray-800'}`}>
                                  {trip.payment_status || 'unpaid'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div className="mb-2 sm:mb-0">
                                <div className="flex items-center mb-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                  <span className="text-sm text-gray-900">{trip.pickup_location}</span>
                                </div>
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                                  <span className="text-sm text-gray-900">{trip.dropoff_location}</span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => router.push(`/trips/${trip.id}`)}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                                >
                                  View Details
                                </button>
                                {trip.status === 'completed' && !trip.has_invoice && (
                                  <button
                                    onClick={() => router.push(`/invoices/create?tripId=${trip.id}`)}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                                  >
                                    Create Invoice
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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