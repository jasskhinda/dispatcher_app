'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientsView({ user, userProfile, clients: initialClients }) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients || []);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Main content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => router.push('/clients/add')}
            className="px-4 py-2 bg-brand-accent text-brand-buttonText rounded-md hover:opacity-90 transition-opacity"
          >
            Add New Client
          </button>
        </div>
        
        <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
          <div className="px-6 py-5 border-b border-brand-border flex justify-between">
            <h3 className="text-lg font-medium">All Clients</h3>
            <span className="text-sm self-center">{clients.length} clients found</span>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center">
              No clients found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-brand-border">
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[20%]" />
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead className="bg-brand-card border-b border-brand-border">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Name</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Contact Info</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Trips</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Last Trip</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Created</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-brand-accent uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {clients.map((client) => (
                    <tr 
                      key={client.id} 
                      className="hover:bg-brand-border/10 cursor-pointer" 
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-brand-border rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {client.first_name?.charAt(0) || ''}{client.last_name?.charAt(0) || ''}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">
                              {client.full_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client'}
                            </div>
                            <div className="text-xs opacity-75">
                              ID: {client.id ? client.id.substring(0, 8) + '...' : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm">{client.email}</div>
                        <div className="text-sm opacity-75">{client.phone_number || 'No phone'}</div>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-accent/10 text-brand-accent">
                          {client.trip_count || 0} trips
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        {client.last_trip ? (
                          <div>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${client.recent_status === 'completed' ? 'bg-brand-completed/20 text-brand-completed' : 
                                client.recent_status === 'in_progress' ? 'bg-brand-inProgress/20 text-brand-inProgress' : 
                                client.recent_status === 'cancelled' ? 'bg-brand-cancelled/20 text-brand-cancelled' : 
                                client.recent_status === 'upcoming' ? 'bg-brand-upcoming/20 text-brand-upcoming' : 
                                'bg-brand-pending/20 text-brand-pending'}`}>
                              {client.recent_status || 'pending'}
                            </span>
                            <div className="text-xs mt-1 opacity-75">
                              {client.last_trip.created_at ? new Date(client.last_trip.created_at).toLocaleDateString() : 'Unknown date'}
                            </div>
                          </div>
                        ) : (
                          <span className="opacity-50">No trips</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm opacity-75">
                        {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            router.push(`/clients/${client.id}`);
                          }}
                          className="text-brand-accent hover:opacity-80 mr-4"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            router.push(`/trips/new?client_id=${client.id}`);
                          }}
                          className="text-brand-accent hover:opacity-80"
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