'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientsView({ user, userProfile, individualClients, managedClients, facilities }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedFacilities, setExpandedFacilities] = useState(new Set());

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Clients</h1>
              <p className="text-sm text-gray-600 mt-1">
                {totalClients} total clients ({individualClients.length} individual, {managedClients.length} facility-managed)
              </p>
            </div>
            <button
              onClick={() => router.push('/clients/add')}
              className="px-4 py-2 bg-[#7CCFD0] text-white rounded-md hover:bg-[#60BFC0] transition-colors font-medium"
            >
              Add New Client
            </button>
          </div>
        </div>

        {/* Individual Clients Section */}
        <div className="mb-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/trips/new?client_id=${client.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Book Trip
                          </button>
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
          <div className="bg-white shadow rounded-lg overflow-hidden">
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
                        <span className="text-sm text-gray-500">
                          {facility.contact_email || 'No email'}
                        </span>
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
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/trips/new?client_id=${client.id}&type=managed`);
                                          }}
                                          className="text-purple-600 hover:text-purple-900 text-sm"
                                        >
                                          Book Trip
                                        </button>
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
  );
}