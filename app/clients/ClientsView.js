'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientsView({ user, userProfile, individualClients, managedClients, facilities }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedFacilities, setExpandedFacilities] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, client: null, type: null });
  const [deleting, setDeleting] = useState(false);

  // Group managed clients by facility
  const clientsByFacility = managedClients.reduce((acc, client) => {
    const facilityId = client.facility_id;
    if (!acc[facilityId]) {
      acc[facilityId] = [];
    }
    acc[facilityId].push(client);
    return acc;
  }, {});

  const toggleFacility = (facilityId) => {
    const newExpanded = new Set(expandedFacilities);
    if (newExpanded.has(facilityId)) {
      newExpanded.delete(facilityId);
    } else {
      newExpanded.add(facilityId);
    }
    setExpandedFacilities(newExpanded);
  };

  const totalClients = individualClients.length + managedClients.length;

  // Handle delete client
  const handleDeleteClient = (client, type = 'individual') => {
    setDeleteModal({
      isOpen: true,
      client,
      type
    });
  };

  // Handle delete facility
  const handleDeleteFacility = (facility) => {
    setDeleteModal({
      isOpen: true,
      client: facility,
      type: 'facility'
    });
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (!deleteModal.client) return;

    setDeleting(true);
    try {
      let endpoint;
      let body;

      if (deleteModal.type === 'facility') {
        endpoint = '/api/admin/delete-facility-simple';
        body = { facilityId: deleteModal.client.id };
      } else if (deleteModal.type === 'managed') {
        endpoint = '/api/admin/delete-managed-client';
        body = { managedClientId: deleteModal.client.id };
      } else {
        endpoint = '/api/admin/delete-client-simple';
        body = { clientId: deleteModal.client.id };
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok) {
        alert(`${deleteModal.type === 'facility' ? 'Facility' : 'Client'} deleted successfully`);
        window.location.reload(); // Refresh the page to update the data
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An unexpected error occurred during deletion');
    } finally {
      setDeleting(false);
      setDeleteModal({ isOpen: false, client: null, type: null });
    }
  };

  // Cancel deletion
  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, client: null, type: null });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage individual clients and facility members
              </p>
            </div>
            <button
              onClick={() => router.push('/clients/add')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Client
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="w-full px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                    <dd className="text-2xl font-bold text-gray-900">{totalClients}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Individual Clients</dt>
                    <dd className="text-2xl font-bold text-gray-900">{individualClients.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Facility Clients</dt>
                    <dd className="text-2xl font-bold text-gray-900">{managedClients.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Facilities</dt>
                    <dd className="text-2xl font-bold text-gray-900">{facilities.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="mb-8">
          {/* Individual Clients Section */}
          <div className="mb-8">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Individual Clients
                  <span className="ml-2 text-sm text-gray-500">({individualClients.length})</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Clients registered through the booking app</p>
              </div>
              
              {individualClients.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No individual clients found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trips</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Trip</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Since</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {individualClients.map((client) => (
                        <tr 
                          key={client.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {client.first_name?.charAt(0) || ''}{client.last_name?.charAt(0) || ''}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {client.first_name || ''} {client.last_name || ''} 
                                  {(!client.first_name && !client.last_name) && 'Unnamed Client'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {client.id ? client.id.substring(0, 8) : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{client.email || 'No email'}</div>
                            <div className="text-sm text-gray-500">{client.phone_number || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {client.trip_count || 0} trips
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {client.last_trip ? (
                              <div>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${client.recent_status === 'completed' ? 'bg-green-100 text-green-800' : 
                                    client.recent_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                                    client.recent_status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                    'bg-gray-100 text-gray-800'}`}>
                                  {client.recent_status || 'pending'}
                                </span>
                                <div className="text-xs text-gray-500 mt-1">
                                  {client.last_trip.pickup_time ? new Date(client.last_trip.pickup_time).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No trips</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/trips/new?client_id=${client.id}`);
                                }}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                              >
                                Book Trip
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClient(client, 'individual');
                                }}
                                className="text-red-600 hover:text-red-900 ml-4"
                                title="Delete Client"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Facility Clients Section */}
          <div>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Facility Clients
                  <span className="ml-2 text-sm text-gray-500">({managedClients.length})</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Clients managed by facilities</p>
              </div>

              {facilities.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No facilities found.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {facilities.map((facility) => {
                    const facilityClients = clientsByFacility[facility.id] || [];
                    const isExpanded = expandedFacilities.has(facility.id);
                    
                    return (
                      <div key={facility.id} className="bg-white">
                        <div 
                          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleFacility(facility.id)}
                        >
                          <div className="flex items-center">
                            <svg 
                              className={`w-5 h-5 mr-2 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="h-10 w-10 flex-shrink-0 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">{facility.name}</h3>
                              <p className="text-xs text-gray-500">{facilityClients.length} clients</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {facility.contact_email || 'No email'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFacility(facility);
                              }}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete Facility"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-gray-50 px-6 pb-4">
                            {facilityClients.length === 0 ? (
                              <div className="text-sm text-gray-500 text-center py-4">
                                No clients for this facility
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="text-xs text-gray-500 uppercase">
                                      <th className="px-4 py-2 text-left">Client</th>
                                      <th className="px-4 py-2 text-left">Contact</th>
                                      <th className="px-4 py-2 text-left">Trips</th>
                                      <th className="px-4 py-2 text-left">Last Trip</th>
                                      <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {facilityClients.map((client) => (
                                      <tr 
                                        key={client.id}
                                        className="hover:bg-white cursor-pointer transition-colors"
                                        onClick={() => router.push(`/clients/${client.id}`)}
                                      >
                                        <td className="px-4 py-3">
                                          <div className="flex items-center">
                                            <div className="h-8 w-8 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-medium text-gray-600">
                                                {client.first_name?.charAt(0) || ''}{client.last_name?.charAt(0) || ''}
                                              </span>
                                            </div>
                                            <div className="ml-3">
                                              <div className="text-sm font-medium text-gray-900">
                                                {client.first_name || ''} {client.last_name || ''}
                                                {(!client.first_name && !client.last_name) && 'Unnamed Client'}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="text-sm text-gray-900">{client.email || 'No email'}</div>
                                          <div className="text-sm text-gray-500">{client.phone_number || 'No phone'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                            {client.trip_count || 0} trips
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          {client.last_trip ? (
                                            <div>
                                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${client.recent_status === 'completed' ? 'bg-green-100 text-green-800' : 
                                                  client.recent_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                                                  client.recent_status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                                  'bg-gray-100 text-gray-800'}`}>
                                                {client.recent_status || 'pending'}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-sm text-gray-500">No trips</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <div className="flex items-center justify-end space-x-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/trips/new?client_id=${client.id}&type=managed`);
                                              }}
                                              className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                                            >
                                              Book Trip
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClient(client, 'managed');
                                              }}
                                              className="text-red-600 hover:text-red-900"
                                              title="Delete Managed Client"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
              onClick={!deleting ? cancelDelete : undefined}
            ></div>

            {/* Modal content */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Delete {deleteModal.type === 'facility' ? 'Facility' : 'Client'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete 
                        {deleteModal.type === 'facility' ? (
                          <span className="font-semibold">facility "{deleteModal.client?.name}"</span>
                        ) : (
                          <span className="font-semibold">
                            {deleteModal.client?.first_name} {deleteModal.client?.last_name} 
                            ({deleteModal.client?.email})
                          </span>
                        )}?
                      </p>
                      
                      {deleteModal.type === 'facility' && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-amber-700">
                                <strong>Complete Facility Deletion:</strong><br/>
                                • All facility administrators will be removed<br/>
                                • All associated clients will be deleted<br/>
                                • All trips and invoices will be permanently removed<br/>
                                • All managed client records will be cleared
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {deleteModal.type === 'managed' && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm text-blue-700">
                            <strong>Note:</strong> This will delete the managed client record and all associated trips. No user account will be affected.
                          </p>
                        </div>
                      )}
                      
                      {deleteModal.type === 'individual' && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-700">
                            <strong>Warning:</strong> This will permanently delete the client account, all trips, and remove their access to the system.
                          </p>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-500 mt-3">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={cancelDelete}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}