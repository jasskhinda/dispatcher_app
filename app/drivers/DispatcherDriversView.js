'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DispatcherDriversView({ user, userProfile, drivers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, driver: null, loading: false });
  const [deleteError, setDeleteError] = useState('');
  const router = useRouter();

  // Filtering and sorting logic
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      searchTerm === '' || 
      driver.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone_number?.includes(searchTerm) ||
      driver.vehicle?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.vehicle?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.vehicle?.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && driver.status === 'active') ||
      (filterStatus === 'inactive' && driver.status === 'inactive') ||
      (filterStatus === 'on_trip' && driver.status === 'on_trip') ||
      (filterStatus === 'pending_verification' && driver.status === 'pending_verification') ||
      (filterStatus === 'with_vehicle' && driver.vehicle);
    
    return matchesSearch && matchesStatus;
  });

  // Sort the filtered drivers
  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? (a.full_name || '').localeCompare(b.full_name || '')
        : (b.full_name || '').localeCompare(a.full_name || '');
    } else if (sortBy === 'email') {
      return sortOrder === 'asc' 
        ? (a.email || '').localeCompare(b.email || '')
        : (b.email || '').localeCompare(a.email || '');
    } else if (sortBy === 'trips') {
      return sortOrder === 'asc' 
        ? (a.trip_count || 0) - (b.trip_count || 0)
        : (b.trip_count || 0) - (a.trip_count || 0);
    } else if (sortBy === 'completed_trips') {
      return sortOrder === 'asc' 
        ? (a.completed_trips || 0) - (b.completed_trips || 0)
        : (b.completed_trips || 0) - (a.completed_trips || 0);
    } else if (sortBy === 'last_trip') {
      const dateA = a.last_trip ? new Date(a.last_trip.created_at) : new Date(0);
      const dateB = b.last_trip ? new Date(b.last_trip.created_at) : new Date(0);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  const getStatusBadge = (status) => {
    if (!status) status = 'inactive';
    
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
      on_trip: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'On Trip' },
      pending_verification: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Verification' },
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleAssignTrip = (driverId) => {
    router.push(`/drivers/${driverId}/assign-trip`);
  };

  const handleDeleteDriver = (driver) => {
    setDeleteModal({ isOpen: true, driver, loading: false });
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!deleteModal.driver) return;
    
    setDeleteModal(prev => ({ ...prev, loading: true }));
    setDeleteError('');
    
    try {
      const response = await fetch(`/api/dispatcher/delete-driver?driverId=${deleteModal.driver.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setDeleteError(result.error || 'Deletion failed');
        setDeleteModal(prev => ({ ...prev, loading: false }));
        return;
      }
      
      // Success - refresh the page
      setDeleteModal({ isOpen: false, driver: null, loading: false });
      router.refresh();
      
    } catch (error) {
      console.error('Delete error:', error);
      setDeleteError('An unexpected error occurred');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, driver: null, loading: false });
    setDeleteError('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Driver Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage all drivers, vehicles, and trip assignments
              </p>
            </div>
            <Link
              href="/drivers/add"
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Driver
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Drivers</p>
                <p className="text-2xl font-semibold text-gray-900">{drivers.length}</p>
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
                <p className="text-sm font-medium text-gray-500">Active Drivers</p>
                <p className="text-2xl font-semibold text-gray-900">{drivers.filter(d => d.status === 'active').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">On Trip</p>
                <p className="text-2xl font-semibold text-gray-900">{drivers.filter(d => d.status === 'on_trip').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">With Vehicle</p>
                <p className="text-2xl font-semibold text-gray-900">{drivers.filter(d => d.vehicle).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, vehicle..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Drivers</option>
                <option value="active">Active</option>
                <option value="on_trip">On Trip</option>
                <option value="inactive">Inactive</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="with_vehicle">With Vehicle</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="trips">Trip Count</option>
                <option value="completed_trips">Completed Trips</option>
                <option value="last_trip">Last Trip Date</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-lg font-medium">No drivers found</p>
                        <p className="text-sm">Try adjusting your search or filter criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unnamed Driver'}
                            </div>
                            <div className="text-xs text-gray-500">ID: {driver.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{driver.email || 'No email'}</div>
                        <div className="text-sm text-gray-500">{driver.phone_number || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(driver.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {driver.vehicle ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{driver.vehicle.make} {driver.vehicle.model}</div>
                            <div className="text-gray-500">{driver.vehicle.license_plate}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No vehicle assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {driver.trip_count || 0} trips
                          </div>
                          <div className="text-green-600">
                            {driver.completed_trips || 0} completed
                          </div>
                          <div className="text-xs text-gray-500">
                            Last: {formatDate(driver.last_trip?.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <Link
                            href={`/drivers/${driver.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors border border-gray-300"
                          >
                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Link>
                          <button
                            onClick={() => handleAssignTrip(driver.id)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-md transition-colors border border-blue-300"
                          >
                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Assign
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(driver)}
                            className="inline-flex items-center px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-md transition-colors border border-red-300"
                          >
                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {sortedDrivers.length} of {drivers.length} drivers
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 13.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                  Delete Driver
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete{' '}
                    <span className="font-medium">
                      {deleteModal.driver?.full_name || `${deleteModal.driver?.first_name} ${deleteModal.driver?.last_name}`}
                    </span>?
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    This action cannot be undone. The driver's profile and associated data will be permanently removed.
                  </p>
                  {deleteError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{deleteError}</p>
                    </div>
                  )}
                </div>
                <div className="items-center px-4 py-3">
                  <div className="flex space-x-3">
                    <button
                      onClick={cancelDelete}
                      disabled={deleteModal.loading}
                      className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      disabled={deleteModal.loading}
                      className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {deleteModal.loading ? 'Deleting...' : 'Delete'}
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