'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ClientsList() {
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

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

    async function fetchClients() {
      try {
        // Get all users with role 'client'
        const { data, error } = await supabase
          .from('users')
          .select(`
            *,
            trips:trips(*)
          `)
          .eq('role', 'client')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Process the data to include trip count and last trip
        const clientsWithStats = data?.map(client => {
          const tripCount = client.trips?.length || 0;
          const lastTrip = client.trips && client.trips.length > 0 
            ? client.trips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            : null;
          
          return {
            ...client,
            trip_count: tripCount,
            last_trip: lastTrip,
            recent_status: lastTrip?.status
          };
        }) || [];
        
        setClients(clientsWithStats);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [user, router, isDispatcher, signOut]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Clients Management</h1>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between">
            <h3 className="text-lg font-medium text-gray-900">All Clients</h3>
            <span className="text-sm text-gray-500 self-center">{clients.length} clients found</span>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No clients found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trips</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Trip</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr 
                      key={client.id} 
                      className="hover:bg-gray-50 cursor-pointer" 
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-500">
                              {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {client.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.email}</div>
                        <div className="text-sm text-gray-500">{client.phone_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {client.trip_count} trips
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.last_trip ? (
                          <div>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${client.recent_status === 'completed' ? 'bg-green-100 text-green-800' : 
                                client.recent_status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                client.recent_status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                client.recent_status === 'upcoming' ? 'bg-purple-100 text-purple-800' : 
                                'bg-yellow-100 text-yellow-800'}`}>
                              {client.recent_status || 'pending'}
                            </span>
                            <div className="text-xs mt-1 text-gray-500">
                              {new Date(client.last_trip.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No trips</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(client.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            router.push(`/clients/${client.id}`);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            router.push(`/trips/new?client_id=${client.id}`);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          New Trip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}