'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardClientView({ user, userProfile, trips: initialTrips }) {
  const router = useRouter();
  // Define statusFilter first
  const [statusFilter, setStatusFilter] = useState('all');  // Default to all trips
  
  // If we have initialTrips, filter out any with missing required fields
  // Note: the real schema uses pickup_address and destination_address but we mapped them in page.js
  const validTrips = initialTrips ? initialTrips.filter(trip => 
    trip && (trip.pickup_location || trip.pickup_address) && (trip.dropoff_location || trip.destination_address)
  ) : [];
  
  const [trips, setTrips] = useState(validTrips || []);
  const [filteredTrips, setFilteredTrips] = useState(validTrips || []); // Default to all trips
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(null);
  
  // Count pending trips that need attention
  const pendingTripsCount = trips.filter(trip => trip.status === 'pending').length;

  const statusOptions = ['all', 'pending', 'upcoming', 'in_progress', 'completed', 'cancelled'];

  const handleStatusFilterChange = (e) => {
    const newFilter = e.target.value;
    setStatusFilter(newFilter);
    
    if (newFilter === 'all') {
      setFilteredTrips(trips);
    } else {
      setFilteredTrips(trips.filter(trip => trip.status === newFilter));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleApproveTrip = async (tripId) => {
    setApproving(tripId);
    try {
      // Find a driver to assign (in this example we'll use a placeholder)
      // In a real app, you'd have a driver selection feature
      const driverName = "Assigned Driver";
      const vehicle = "Standard Accessible Vehicle";
      
      const { error } = await supabase
        .from('trips')
        .update({ 
          status: 'upcoming',
          driver_name: driverName,
          vehicle: vehicle,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) throw error;
      
      // Update local state to reflect the change
      const updatedTrips = trips.map(trip => 
        trip.id === tripId ? { 
          ...trip, 
          status: 'upcoming',
          driver_name: driverName,
          vehicle: vehicle
        } : trip
      );
      
      setTrips(updatedTrips);
      setFilteredTrips(
        statusFilter === 'all' 
          ? updatedTrips 
          : updatedTrips.filter(trip => trip.status === statusFilter)
      );
    } catch (error) {
      console.error('Error approving trip:', error);
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Main content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending trips alert section */}
        {pendingTripsCount > 0 && (
          <div className="bg-brand-pending/10 border border-brand-pending rounded-lg p-4 mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-pending text-lg">Action Required: {pendingTripsCount} Pending Trip{pendingTripsCount !== 1 ? 's' : ''}</h3>
              <p className="text-sm mt-1">There are trips waiting for your approval.</p>
            </div>
            <button 
              onClick={() => {
                setStatusFilter('pending');
                setFilteredTrips(trips.filter(trip => trip.status === 'pending'));
                const filterEl = document.querySelector('[id="status-filter"]');
                if (filterEl) {
                  filterEl.value = 'pending';
                }
                // Scroll to the trips section
                document.getElementById('trips-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-brand-pending text-white rounded hover:opacity-90 transition-opacity"
            >
              View Pending Trips
            </button>
          </div>
        )}

        <div className="bg-brand-card shadow rounded-lg p-6 mb-8 border border-brand-border">
          <h2 className="text-xl font-semibold mb-4">Welcome to the Dispatch Dashboard</h2>
          <p className="mb-6">
            From here you can monitor and manage rides for Compassionate Rides.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Trip Calendar first */}
            <div className="bg-brand-card p-4 rounded-lg border border-brand-border">
              <h3 className="font-semibold text-brand-accent mb-2">Trip Calendar</h3>
              <p className="text-sm mb-4">View and manage all trips in calendar format</p>
              <button 
                onClick={() => router.push('/calendar')}
                className="w-full text-center px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 transition-opacity"
              >
                View Calendar
              </button>
            </div>
            
            <div className="bg-brand-card p-4 rounded-lg border border-brand-border">
              <h3 className="font-semibold text-brand-accent mb-2">Active Drivers Map</h3>
              <p className="text-sm mb-4">View real-time location of all active drivers on trips</p>
              <button 
                onClick={() => router.push('/map')}
                className="w-full text-center px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 transition-opacity"
              >
                View Map
              </button>
            </div>
            
            <div className="bg-brand-card p-4 rounded-lg border border-brand-border">
              <h3 className="font-semibold text-brand-accent mb-2">Manage Drivers</h3>
              <p className="text-sm mb-4">Add, view, and manage all drivers in the system</p>
              <button 
                onClick={() => router.push('/drivers')}
                className="w-full text-center px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 transition-opacity"
              >
                Manage Drivers
              </button>
            </div>
            
            <div className="bg-brand-card p-4 rounded-lg border border-brand-border">
              <h3 className="font-semibold text-brand-accent mb-2">Manage Clients</h3>
              <p className="text-sm mb-4">View client profiles and manage their trip history</p>
              <button 
                onClick={() => router.push('/clients')}
                className="w-full text-center px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 transition-opacity"
              >
                View Clients
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            {/* Highlight pending trips approval */}
            <div className="bg-brand-card p-4 rounded-lg border border-brand-border">
              <h3 className="font-semibold text-brand-accent mb-2">Schedule New Trip</h3>
              <p className="text-sm mb-4">Create a new trip with client and driver assignment</p>
              <button 
                onClick={() => router.push('/trips/new')}
                className="w-full text-center px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 transition-opacity"
              >
                Create Trip
              </button>
            </div>
            
            <div className="bg-brand-card p-4 rounded-lg border border-brand-border">
              <h3 className="font-semibold text-brand-accent mb-2">Add New Driver</h3>
              <p className="text-sm mb-4">Create a new driver account and profile</p>
              <button 
                onClick={() => router.push('/drivers/add')}
                className="w-full text-center px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 transition-opacity"
              >
                Add Driver
              </button>
            </div>
            
            <div className="bg-brand-card p-4 rounded-lg border border-brand-border">
              <h3 className="font-semibold text-brand-accent mb-2">AI Trip Optimization</h3>
              <p className="text-sm mb-4">Optimize driver assignments and schedules with AI</p>
              <button 
                onClick={() => router.push('/optimize')}
                className="w-full text-center px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 transition-opacity"
              >
                Optimize Trips
              </button>
            </div>
            
            <div className="bg-brand-card p-4 rounded-lg border border-brand-border">
              <h3 className="font-semibold text-brand-accent mb-2">Financial Overview</h3>
              <p className="text-sm mb-4">Track payments and manage invoices.</p>
              <button 
                onClick={() => router.push('/invoices')}
                className="w-full text-center px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 transition-opacity"
              >
                View Invoices
              </button>
            </div>
          </div>
        </div>
        
        {/* Trips section */}
        <div id="trips-section" className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
          <div className="px-6 py-5 border-b border-brand-border flex justify-between items-center">
            <h3 className="text-lg font-medium">All Trips</h3>
            <div className="flex items-center">
              <label htmlFor="status-filter" className="mr-2 text-sm">Filter by status:</label>
              <div className="relative">
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  className="block w-40 pl-3 pr-10 py-2 text-sm border border-brand-border rounded-md bg-brand-background focus:outline-none focus:ring-brand-accent focus:border-brand-accent appearance-none"
                >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </option>
                ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">Loading trips...</div>
          ) : filteredTrips.length === 0 ? (
            <div className="p-6 text-center">No trips found</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full table-fixed divide-y divide-brand-border">
                <colgroup>
                  <col className="w-[8%]" />
                  <col className="w-[12%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-brand-card border-b border-brand-border">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider whitespace-nowrap">ID</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider whitespace-nowrap">Client</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider whitespace-nowrap">Pickup</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider whitespace-nowrap">Dropoff</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider whitespace-nowrap">Invoice</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider whitespace-nowrap">Payment</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id} className={`hover:bg-brand-border/10 ${trip.status === 'pending' ? 'bg-brand-pending/5' : ''}`}>
                      <td className="px-2 py-3 text-sm truncate" title={trip.id}>
                        <span className="text-xs text-brand-accent font-mono">
                          {trip.id ? trip.id.substring(0, 8) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-sm font-medium">
                        {trip.client_name || 'N/A'}
                      </td>
                      <td className="px-2 py-3 text-sm" title={trip.pickup_location || trip.pickup_address}>
                        <div className="line-clamp-2">
                          {trip.pickup_location || trip.pickup_address || 'N/A'}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm" title={trip.dropoff_location || trip.destination_address}>
                        <div className="line-clamp-2">
                          {trip.dropoff_location || trip.destination_address || 'N/A'}
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${trip.status === 'completed' ? 'bg-brand-completed/20 text-brand-completed' : 
                            trip.status === 'in_progress' ? 'bg-brand-inProgress/20 text-brand-inProgress' : 
                            trip.status === 'cancelled' ? 'bg-brand-cancelled/20 text-brand-cancelled' : 
                            trip.status === 'upcoming' ? 'bg-brand-upcoming/20 text-brand-upcoming' : 
                            'bg-brand-pending/20 text-brand-pending'}`}>
                          {trip.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-sm">
                        {trip.has_invoice ? (
                          <div>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${trip.invoice_status === 'issued' ? 'bg-brand-upcoming/20 text-brand-upcoming' : 
                                trip.invoice_status === 'sent' ? 'bg-brand-inProgress/20 text-brand-inProgress' : 
                                'bg-brand-border/20'}`}>
                              {trip.invoice_status || 'unknown'}
                            </span>
                            <div className="text-xs mt-1 truncate">
                              {trip.invoice_id ? `#${trip.invoice_id.substring(0, 6)}...` : ''} 
                              {trip.invoice_amount ? `$${trip.invoice_amount?.toFixed(2)}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="opacity-50">No invoice</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm whitespace-nowrap">
                        {trip.has_invoice ? (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${trip.payment_status === 'paid' ? 'bg-brand-completed/20 text-brand-completed' : 
                              trip.payment_status === 'partial' ? 'bg-brand-pending/20 text-brand-pending' : 
                              trip.payment_status === 'overdue' ? 'bg-brand-cancelled/20 text-brand-cancelled' : 
                              'bg-brand-border/20'}`}>
                            {trip.payment_status || 'unpaid'}
                          </span>
                        ) : (
                          <span className="opacity-50">N/A</span>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        {trip.status === 'pending' && (
                          <button
                            onClick={() => handleApproveTrip(trip.id)}
                            disabled={approving === trip.id}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded bg-brand-accent text-brand-buttonText hover:opacity-90 transition-opacity focus:outline-none focus:ring-1 focus:ring-brand-accent disabled:opacity-50"
                          >
                            {approving === trip.id ? 'Approving...' : 'Approve'}
                          </button>
                        )}
                        {trip.status === 'completed' && !trip.has_invoice && (
                          <button
                            onClick={() => router.push(`/invoices/new?trip_id=${trip.id}`)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded bg-brand-accent text-brand-buttonText hover:opacity-90 transition-opacity focus:outline-none focus:ring-1 focus:ring-brand-accent"
                          >
                            Create Invoice
                          </button>
                        )}
                        {trip.has_invoice && (
                          <button
                            onClick={() => router.push(`/invoices/${trip.invoice_id}`)}
                            className="inline-flex items-center px-2 py-1 border border-brand-border text-xs font-medium rounded bg-brand-card hover:bg-brand-border/20 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-accent"
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