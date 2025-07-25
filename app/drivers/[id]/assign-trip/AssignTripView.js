'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DebugInfo from './DebugInfo';

export default function AssignTripView({ user, userProfile, driver, availableTrips, allTrips, assignedTrips, waitingTrips = [], rejectedTrips = [], allDrivers, tripsFetchError }) {
  const router = useRouter();
  
  // Debug logging to verify data
  console.log('🎯 AssignTripView loaded with data:', {
    availableTripsCount: availableTrips?.length,
    sampleTrip: availableTrips?.[0] ? {
      id: availableTrips[0].id,
      profiles: availableTrips[0].profiles,
      facility: availableTrips[0].facility
    } : null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [assignModal, setAssignModal] = useState({ isOpen: false, trip: null, loading: false });
  const [assignError, setAssignError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [actionMessage, setActionMessage] = useState('');

  // Filter and sort trips - separate recent and completed
  const filteredTrips = availableTrips.filter(trip => {
    const matchesSearch = 
      searchTerm === '' || 
      trip.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.pickup_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.destination_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.facility?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || 
      trip.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Filter trips for the two sections
  // RECENT TRIPS: Only upcoming trips (approved by dispatcher) that need driver assignment
  const recentTrips = availableTrips.filter(trip => 
    trip.status === 'upcoming' && !trip.driver_id
  );
  
  // COMPLETED TRIPS: Only trips that THIS SPECIFIC driver has completed/cancelled
  const completedTrips = availableTrips.filter(trip => 
    trip.driver_id === driver.id && ['completed', 'cancelled'].includes(trip.status)
  );

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (sortBy === 'created_at') {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'pickup_time') {
      const dateA = new Date(a.pickup_time || a.created_at);
      const dateB = new Date(b.pickup_time || b.created_at);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'client') {
      const nameA = a.profiles?.full_name || '';
      const nameB = b.profiles?.full_name || '';
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }
    return 0;
  });

  const handleAssignTrip = (trip) => {
    setAssignModal({ isOpen: true, trip, loading: false });
    setAssignError('');
  };

  const confirmAssignment = async () => {
    if (!assignModal.trip) return;
    
    setAssignModal(prev => ({ ...prev, loading: true }));
    setAssignError('');
    
    try {
      const response = await fetch('/api/trips/assign-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: assignModal.trip.id,
          driverId: driver.id
        }),
      });
      
      const result = await response.json();
      
      console.log('Assignment response:', { status: response.status, result });
      
      if (!response.ok) {
        const errorMessage = result.details ? `${result.error}: ${result.details}` : result.error || 'Assignment failed';
        console.error('Assignment failed:', errorMessage);
        setAssignError(errorMessage);
        setAssignModal(prev => ({ ...prev, loading: false }));
        return;
      }
      
      // Success - redirect back to driver details
      router.push(`/drivers/${driver.id}?success=Trip%20assigned%20successfully`);
      
    } catch (error) {
      console.error('Assignment error:', error);
      setAssignError('An unexpected error occurred');
      setAssignModal(prev => ({ ...prev, loading: false }));
    }
  };

  const cancelAssignment = () => {
    setAssignModal({ isOpen: false, trip: null, loading: false });
    setAssignError('');
  };

  const handleCompleteTrip = async (tripId) => {
    if (!confirm('Are you sure you want to mark this trip as completed? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [tripId]: true }));
      setActionMessage('');

      const response = await fetch('/api/trips/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tripId: tripId,
          action: 'complete'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete trip');
      }

      setActionMessage('✅ Trip completed successfully!');
      
      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh();
      }, 1000);

    } catch (error) {
      console.error('Error completing trip:', error);
      setActionMessage(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [tripId]: false }));
      setTimeout(() => setActionMessage(''), 5000);
    }
  };

  // Helper function to render trip table
  const renderTripTable = (trips, sectionTitle, showAssignButton = false, showCompleteButton = false) => {
    const sectionDescription = sectionTitle === "RECENT TRIPS" 
      ? "Upcoming trips approved by dispatcher that can be assigned to this driver"
      : sectionTitle === "ASSIGNED TRIPS"
      ? "Trips currently assigned to this driver that can be marked as completed"
      : sectionTitle === "WAITING ACCEPTANCE"
      ? "Trips assigned to this driver that are awaiting driver acceptance"
      : sectionTitle === "REJECTED TRIPS"
      ? "Trips that have been rejected by this driver"
      : "Past trips that this driver has completed or cancelled";
      
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">{sectionTitle}</h3>
          <p className="text-sm text-gray-600 mt-1">{sectionDescription} • {trips.length} trip(s)</p>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Trip ID
              </th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                Client
              </th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                Route
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Status
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Pickup Date
              </th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trips.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center max-w-md mx-auto">
                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
                    <p className="text-sm text-gray-500">No trips in this category yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs font-mono text-gray-900" title={trip.id}>
                      {trip.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          {trip.facility ? (
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        {trip.facility ? (
                          <>
                            <div className="text-xs font-medium text-blue-600 truncate">
                              {trip.facility.name}
                            </div>
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {trip.profiles?.full_name || 
                               `${trip.profiles?.first_name || ''} ${trip.profiles?.last_name || ''}`.trim() || 
                               trip.client_name ||
                               'Unknown Client'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {trip.profiles?.email || trip.client_email || 'No email'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {trip.profiles?.full_name || 
                               `${trip.profiles?.first_name || ''} ${trip.profiles?.last_name || ''}`.trim() || 
                               trip.client_name ||
                               'Unknown Client'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {trip.profiles?.email || trip.client_email || 'No email'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-xs text-gray-900">
                      <div className="font-medium truncate" title={trip.pickup_address}>
                        From: {trip.pickup_address?.substring(0, 30) || 'Not specified'}{trip.pickup_address?.length > 30 ? '...' : ''}
                      </div>
                      <div className="text-gray-500 truncate" title={trip.destination_address}>
                        To: {trip.destination_address?.substring(0, 30) || 'Not specified'}{trip.destination_address?.length > 30 ? '...' : ''}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    {getStatusBadge(trip.status)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-xs text-gray-500">
                    <div>{formatDate(trip.pickup_time || trip.created_at)}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center space-x-1">
                      <button
                        onClick={() => router.push(`/trips/${trip.id}`)}
                        className="inline-flex items-center px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded border transition-colors"
                        title="View trip details"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      
                      {showAssignButton && !trip.driver_id && (
                        <button
                          onClick={() => handleAssignTrip(trip)}
                          className="inline-flex items-center px-2 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded border transition-colors"
                          title="Assign this trip to driver"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Assign
                        </button>
                      )}
                      
                      {showCompleteButton && trip.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteTrip(trip.id)}
                          disabled={actionLoading[trip.id]}
                          className="inline-flex items-center px-2 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mark trip as completed"
                        >
                          {actionLoading[trip.id] ? '...' : '✓ Complete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      upcoming: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Upcoming' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
      scheduled: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Scheduled' },
      created: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Created' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      awaiting_driver_acceptance: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Awaiting Acceptance' },
      in_progress: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
    };
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Unknown' };
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Message */}
        {actionMessage && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${
            actionMessage.includes('Error') 
              ? 'bg-red-100 border border-red-400 text-red-700'
              : 'bg-green-100 border border-green-400 text-green-700'
          }`}>
            <p className="font-semibold">{actionMessage}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assign Trip to Driver</h1>
              <p className="mt-2 text-sm text-gray-600">
                Select a trip to assign to {driver.full_name || `${driver.first_name} ${driver.last_name}`}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/drivers/${driver.id}`}
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Driver
              </Link>
              <Link
                href="/drivers"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                All Drivers
              </Link>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <DebugInfo trips={availableTrips} />

        {/* Driver Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-12 w-12">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unnamed Driver'}
                </h3>
                <p className="text-sm text-gray-500">{driver.email}</p>
                <p className="text-xs text-blue-600 font-medium mt-1">🚗 Available for Assignment</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx={4} cy={4} r={3} />
                </svg>
                Active
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Trips</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by client, pickup, destination..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Trips</option>
                <option value="upcoming">Upcoming</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at">Date Created</option>
                <option value="pickup_time">Pickup Time</option>
                <option value="client">Client Name</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Trips</p>
                <p className="text-2xl font-semibold text-gray-900">{allTrips.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Assignable Trips</p>
                <p className="text-2xl font-semibold text-gray-900">{availableTrips.filter(trip => (trip.status === 'approved' || trip.status === 'upcoming') && !trip.driver_id).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Trips</p>
                <p className="text-2xl font-semibold text-gray-900">{availableTrips.filter(trip => trip.status === 'upcoming').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Filtered Results</p>
                <p className="text-2xl font-semibold text-gray-900">{sortedTrips.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Available Drivers</p>
                <p className="text-2xl font-semibold text-gray-900">{allDrivers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Trip Assignment for {driver.full_name || `${driver.first_name} ${driver.last_name}`}</h2>
          <p className="text-sm text-gray-600 mt-1">Manage trip assignments for this driver</p>
        </div>

        {/* ASSIGNED TRIPS Section - Trips currently assigned to this driver */}
        {renderTripTable(
          assignedTrips || [], 
          "ASSIGNED TRIPS", 
          false,  // No assign button for assigned trips
          true    // Show complete button for assigned trips
        )}

        {/* WAITING ACCEPTANCE Section - Trips assigned to this driver awaiting acceptance */}
        {renderTripTable(
          waitingTrips || [], 
          "WAITING ACCEPTANCE", 
          false,  // No assign button for waiting trips
          false   // No complete button for waiting trips
        )}

        {/* REJECTED TRIPS Section - Trips rejected by this driver */}
        {renderTripTable(
          rejectedTrips || [], 
          "REJECTED TRIPS", 
          false,  // No assign button for rejected trips
          false   // No complete button for rejected trips
        )}

        {/* RECENT TRIPS Section - Upcoming trips available for assignment */}
        {renderTripTable(
          recentTrips, 
          "RECENT TRIPS", 
          true  // Show assign button for this section
        )}

        {/* COMPLETED TRIPS Section - Past trips completed by this driver */}
        {renderTripTable(
          completedTrips, 
          "COMPLETED TRIPS", 
          false  // No assign button for completed trips
        )}

        {/* Assignment Confirmation Modal */}
        {assignModal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                  Assign Trip
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Assign trip for{' '}
                    <span className="font-medium">
                      {assignModal.trip?.profiles?.full_name || 'Unknown Client'}
                    </span>{' '}
                    to driver{' '}
                    <span className="font-medium">
                      {driver.full_name || `${driver.first_name} ${driver.last_name}`}
                    </span>?
                  </p>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-left">
                    <p className="text-xs text-blue-700">
                      <strong>From:</strong> {assignModal.trip?.pickup_address || 'Not specified'}<br/>
                      <strong>To:</strong> {assignModal.trip?.destination_address || 'Not specified'}<br/>
                      <strong>Time:</strong> {formatDate(assignModal.trip?.pickup_time || assignModal.trip?.created_at)}
                    </p>
                  </div>
                  {assignError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{assignError}</p>
                    </div>
                  )}
                </div>
                <div className="items-center px-4 py-3">
                  <div className="flex space-x-3">
                    <button
                      onClick={cancelAssignment}
                      disabled={assignModal.loading}
                      className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmAssignment}
                      disabled={assignModal.loading}
                      className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {assignModal.loading ? 'Assigning...' : 'Assign Trip'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}