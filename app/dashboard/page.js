'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const { user, userProfile, signOut, isDispatcher } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [approving, setApproving] = useState(null);

  const statusOptions = ['all', 'pending', 'upcoming', 'in_progress', 'completed', 'cancelled'];

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

    async function getTrips() {
      try {
        // Fetch trips with their invoices
        const { data, error } = await supabase
          .from('trips')
          .select(`
            *,
            invoices:invoices(*)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Process data to include accounting information
        const processedTrips = data?.map(trip => {
          // Find the latest invoice if any
          const latestInvoice = trip.invoices && trip.invoices.length > 0
            ? trip.invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            : null;
          
          return {
            ...trip,
            has_invoice: !!latestInvoice,
            invoice_status: latestInvoice?.status || null,
            invoice_id: latestInvoice?.id || null,
            invoice_amount: latestInvoice?.amount || null,
            payment_status: latestInvoice?.payment_status || null,
          };
        }) || [];
        
        setTrips(processedTrips);
        setFilteredTrips(processedTrips);
      } catch (error) {
        console.error('Error fetching trips:', error);
      } finally {
        setLoading(false);
      }
    }

    getTrips();
  }, [user, router, isDispatcher, signOut]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTrips(trips);
    } else {
      setFilteredTrips(trips.filter(trip => trip.status === statusFilter));
    }
  }, [statusFilter, trips]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleApproveTrip = async (tripId) => {
    setApproving(tripId);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: 'upcoming' })
        .eq('id', tripId);

      if (error) throw error;
      
      // Update local state to reflect the change
      setTrips(prevTrips => 
        prevTrips.map(trip => 
          trip.id === tripId ? { ...trip, status: 'upcoming' } : trip
        )
      );
    } catch (error) {
      console.error('Error approving trip:', error);
    } finally {
      setApproving(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Compassionate Rides Dispatcher</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Welcome to the Dispatch Dashboard</h2>
          <p className="text-gray-600 mb-6">
            From here you can monitor and manage rides for Compassionate Rides.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-700 mb-2">Active Drivers Map</h3>
              <p className="text-sm text-blue-600 mb-4">View real-time location of all active drivers on trips</p>
              <button 
                onClick={() => router.push('/map')}
                className="w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                View Map
              </button>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h3 className="font-semibold text-green-700 mb-2">Manage Drivers</h3>
              <p className="text-sm text-green-600 mb-4">Add, view, and manage all drivers in the system</p>
              <button 
                onClick={() => router.push('/drivers')}
                className="w-full text-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Manage Drivers
              </button>
            </div>
            
            <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
              <h3 className="font-semibold text-rose-700 mb-2">Manage Clients</h3>
              <p className="text-sm text-rose-600 mb-4">View client profiles and manage their trip history</p>
              <button 
                onClick={() => router.push('/clients')}
                className="w-full text-center px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 transition"
              >
                View Clients
              </button>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
              <h3 className="font-semibold text-amber-700 mb-2">Financial Overview</h3>
              <p className="text-sm text-amber-600 mb-4">Track payments, manage invoices, and view financial reports</p>
              <button 
                onClick={() => {
                  // This could be updated to point to a dedicated financial dashboard in the future
                  const completedTripsTab = document.querySelector('[id="status-filter"]');
                  if (completedTripsTab) {
                    completedTripsTab.value = 'completed';
                    completedTripsTab.dispatchEvent(new Event('change'));
                  }
                }}
                className="w-full text-center px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
              >
                View Invoices
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h3 className="font-semibold text-purple-700 mb-2">Add New Driver</h3>
              <p className="text-sm text-purple-600 mb-4">Create a new driver account and profile</p>
              <button 
                onClick={() => router.push('/drivers/add')}
                className="w-full text-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              >
                Add Driver
              </button>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <h3 className="font-semibold text-indigo-700 mb-2">AI Trip Optimization</h3>
              <p className="text-sm text-indigo-600 mb-4">Optimize driver assignments and schedules with AI</p>
              <button 
                onClick={() => router.push('/optimize')}
                className="w-full text-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              >
                Optimize Trips
              </button>
            </div>
            
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
              <h3 className="font-semibold text-teal-700 mb-2">Schedule New Trip</h3>
              <p className="text-sm text-teal-600 mb-4">Create a new trip with client and driver assignment</p>
              <button 
                onClick={() => router.push('/trips/new')}
                className="w-full text-center px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
              >
                Create Trip
              </button>
            </div>
            
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100">
              <h3 className="font-semibold text-cyan-700 mb-2">Trip Calendar</h3>
              <p className="text-sm text-cyan-600 mb-4">View and manage all trips in calendar format</p>
              <button 
                onClick={() => router.push('/calendar')}
                className="w-full text-center px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
              >
                View Calendar
              </button>
            </div>
          </div>
        </div>
        
        {/* Trips section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">All Trips</h3>
            <div className="flex items-center">
              <label htmlFor="status-filter" className="mr-2 text-sm text-gray-700">Filter by status:</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading trips...</div>
          ) : filteredTrips.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No trips found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dropoff</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trip.client_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trip.pickup_location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trip.dropoff_location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${trip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                            trip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                            trip.status === 'upcoming' ? 'bg-purple-100 text-purple-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {trip.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trip.has_invoice ? (
                          <div>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${trip.invoice_status === 'issued' ? 'bg-blue-100 text-blue-800' : 
                                trip.invoice_status === 'sent' ? 'bg-purple-100 text-purple-800' : 
                                'bg-gray-100 text-gray-800'}`}>
                              {trip.invoice_status || 'unknown'}
                            </span>
                            <div className="text-xs mt-1">
                              #{trip.invoice_id} - ${trip.invoice_amount?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No invoice</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {trip.has_invoice ? (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${trip.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                              trip.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                              trip.payment_status === 'overdue' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'}`}>
                            {trip.payment_status || 'unpaid'}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trip.status === 'pending' && (
                          <button
                            onClick={() => handleApproveTrip(trip.id)}
                            disabled={approving === trip.id}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {approving === trip.id ? 'Approving...' : 'Approve'}
                          </button>
                        )}
                        {trip.status === 'completed' && !trip.has_invoice && (
                          <button
                            onClick={() => router.push(`/invoices/create?tripId=${trip.id}`)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Create Invoice
                          </button>
                        )}
                        {trip.has_invoice && (
                          <button
                            onClick={() => router.push(`/invoices/${trip.invoice_id}`)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View Invoice
                          </button>
                        )}
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