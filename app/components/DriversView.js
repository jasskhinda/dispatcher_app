'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DriversView({ user, userProfile, drivers: initialDrivers }) {
  const router = useRouter();
  const [drivers, setDrivers] = useState(initialDrivers || []);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Main content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Drivers</h1>
          <button
            onClick={() => router.push('/drivers/add')}
            className="px-4 py-2 bg-brand-accent text-brand-buttonText rounded-md hover:opacity-90 transition-opacity flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Driver
          </button>
        </div>
        
        <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
          <div className="px-6 py-5 border-b border-brand-border flex justify-between">
            <h3 className="text-lg font-medium">All Drivers</h3>
            <span className="text-sm self-center">{drivers.length} drivers found</span>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">Loading drivers...</div>
          ) : drivers.length === 0 ? (
            <div className="p-6 text-center">
              No drivers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-brand-border">
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[20%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead className="bg-brand-card border-b border-brand-border">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Name</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Contact Info</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Vehicle</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Created</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-brand-accent uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {drivers.map((driver) => (
                    <tr 
                      key={driver.id} 
                      className="hover:bg-brand-border/10 cursor-pointer" 
                      onClick={() => router.push(`/drivers/${driver.id}`)}
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-brand-border rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {driver.first_name?.charAt(0) || ''}{driver.last_name?.charAt(0) || ''}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">
                              {driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unnamed Driver'}
                            </div>
                            <div className="text-xs opacity-75">
                              ID: {driver.id ? driver.id.substring(0, 8) + '...' : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm">{driver.email}</div>
                        <div className="text-sm opacity-75">{driver.phone_number || 'No phone'}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm">{driver.vehicle_model || 'Not specified'}</div>
                        <div className="text-xs opacity-75">{driver.vehicle_license || 'No license plate'}</div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          driver.status === 'active' ? 'bg-brand-completed/20 text-brand-completed' : 
                          driver.status === 'on_trip' ? 'bg-brand-inProgress/20 text-brand-inProgress' : 
                          driver.status === 'inactive' ? 'bg-brand-cancelled/20 text-brand-cancelled' : 
                          'bg-brand-pending/20 text-brand-pending'
                        }`}>
                          {driver.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm opacity-75">
                        {driver.created_at ? new Date(driver.created_at).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            router.push(`/drivers/${driver.id}`);
                          }}
                          className="text-brand-accent hover:opacity-80 mr-4"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            router.push(`/trips/new?driver_id=${driver.id}`);
                          }}
                          className="text-brand-accent hover:opacity-80"
                        >
                          Assign Trip
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