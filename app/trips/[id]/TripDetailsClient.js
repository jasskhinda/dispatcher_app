'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TripDetailsClient({ trip, user }) {
  const router = useRouter();
  const [error, setError] = useState('');

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-brand-background">
      {/* Header */}
      <header className="bg-brand-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trip Details</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/calendar')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-brand-accent hover:opacity-90"
            >
              Calendar View
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md bg-brand-border/20 hover:bg-brand-border/30"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
            <div className="bg-brand-cancelled/10 border-l-4 border-brand-cancelled p-4 mb-4">
              <p className="text-sm text-brand-cancelled">{error}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/calendar')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-accent hover:opacity-90"
              >
                Return to Calendar
              </button>
            </div>
          </div>
        ) : trip && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Trip information - left column */}
            <div className="md:col-span-2">
              <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
                <div className="px-6 py-5 border-b border-brand-border flex justify-between items-center">
                  <h3 className="text-lg font-medium">Trip Information</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium
                    ${trip.status === 'completed' ? 'bg-brand-completed/20 text-brand-completed' : 
                      trip.status === 'in_progress' ? 'bg-brand-inProgress/20 text-brand-inProgress' : 
                      trip.status === 'cancelled' ? 'bg-brand-cancelled/20 text-brand-cancelled' : 
                      trip.status === 'upcoming' ? 'bg-brand-upcoming/20 text-brand-upcoming' : 
                      'bg-brand-pending/20 text-brand-pending'}`}>
                    {trip.status?.replace('_', ' ') || 'pending'}
                  </span>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div className="col-span-2">
                      <dt className="text-sm font-medium opacity-70">Pickup Time</dt>
                      <dd className="mt-1 text-sm">{formatTime(trip.pickup_time)}</dd>
                    </div>
                    
                    {trip.return_pickup_time && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium opacity-70">Return Pickup Time</dt>
                        <dd className="mt-1 text-sm">{formatTime(trip.return_pickup_time)}</dd>
                      </div>
                    )}
                    
                    <div className="col-span-2">
                      <dt className="text-sm font-medium opacity-70">Route</dt>
                      <dd className="mt-1 text-sm">
                        <div className="flex items-center mb-2">
                          <span className="h-2 w-2 rounded-full bg-brand-completed inline-block mr-2 flex-shrink-0"></span>
                          <span>{trip.pickup_address || trip.pickup_location}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-brand-cancelled inline-block mr-2 flex-shrink-0"></span>
                          <span>{trip.destination_address || trip.dropoff_location}</span>
                        </div>
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium opacity-70">Estimated Duration</dt>
                      <dd className="mt-1 text-sm">{trip.estimated_duration || 30} minutes</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium opacity-70">Created At</dt>
                      <dd className="mt-1 text-sm">{formatTime(trip.created_at)}</dd>
                    </div>
                    
                    {trip.special_requirements && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium opacity-70">Special Requirements</dt>
                        <dd className="mt-1 text-sm">{trip.special_requirements}</dd>
                      </div>
                    )}
                    
                    {trip.notes && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium opacity-70">Notes</dt>
                        <dd className="mt-1 text-sm">{trip.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
            
            {/* Client and driver information - right column */}
            <div>
              {/* Client information */}
              <div className="bg-brand-card shadow rounded-lg overflow-hidden mb-6 border border-brand-border">
                <div className="px-6 py-5 border-b border-brand-border">
                  <h3 className="text-lg font-medium">Client Information</h3>
                </div>
                <div className="p-6">
                  {trip.client_name ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium opacity-70">Name</dt>
                        <dd className="mt-1 text-sm">
                          {trip.client_name}
                        </dd>
                      </div>
                      {trip.phone_number && (
                        <div>
                          <dt className="text-sm font-medium opacity-70">Phone</dt>
                          <dd className="mt-1 text-sm">{trip.phone_number}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm opacity-70">Client information not available</p>
                  )}
                </div>
              </div>
              
              {/* Driver information */}
              <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
                <div className="px-6 py-5 border-b border-brand-border">
                  <h3 className="text-lg font-medium">Driver Information</h3>
                </div>
                <div className="p-6">
                  {trip.driver_name ? (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium opacity-70">Name</dt>
                        <dd className="mt-1 text-sm">
                          {trip.driver_name}
                        </dd>
                      </div>
                      {trip.driver_phone && (
                        <div>
                          <dt className="text-sm font-medium opacity-70">Phone</dt>
                          <dd className="mt-1 text-sm">{trip.driver_phone}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <div>
                      <p className="text-sm opacity-70 mb-4">No driver assigned to this trip</p>
                      <button
                        onClick={() => router.push('/optimize')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-brand-accent hover:opacity-90"
                      >
                        Optimize Assignments
                      </button>
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