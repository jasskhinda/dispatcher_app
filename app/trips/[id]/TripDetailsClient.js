'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EditTripForm from '../../components/EditTripForm';

export default function TripDetailsClient({ trip, user }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(trip);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);


  // Handle trip edit save
  const handleTripSave = (updatedTrip) => {
    setCurrentTrip(updatedTrip);
    setShowEditForm(false);
  };

  // Handle trip edit cancel
  const handleTripEditCancel = () => {
    setShowEditForm(false);
  };

  // Handle marking trip as complete
  const handleMarkComplete = async () => {
    if (!currentTrip.id) return;
    
    setIsMarkingComplete(true);
    setError('');
    
    try {
      const response = await fetch('/api/trips/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: currentTrip.id,
          action: 'complete'
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Error marking trip complete:', result);
        setError(result.details || result.error || 'Failed to mark trip as complete. Please try again.');
      } else {
        // Update the current trip state with the returned data
        setCurrentTrip({
          ...currentTrip,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: result.trip.updated_at
        });
      }
    } catch (error) {
      console.error('Error marking trip complete:', error);
      setError('Failed to mark trip as complete. Please try again.');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Format time for display with US date format
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format edit date for display
  const formatEditDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trip Details</h1>
            <p className="text-sm text-gray-600 mt-1">Trip ID: {currentTrip.id.slice(0, 8)}...</p>
          </div>
          <div className="flex items-center space-x-3">
            {currentTrip.status === 'in_progress' && (
              <button
                onClick={handleMarkComplete}
                disabled={isMarkingComplete}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 shadow-sm transition-colors"
              >
                {isMarkingComplete ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Completing...
                  </>
                ) : (
                  <>
                    ✅ Mark Complete
                  </>
                )}
              </button>
            )}
            {(currentTrip.status === 'pending' || currentTrip.status === 'upcoming' || currentTrip.status === 'approved') && currentTrip.status !== 'completed' && (
              <button
                onClick={() => setShowEditForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                ✏️ Edit Trip
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : currentTrip && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Trip information - main column */}
            <div className="lg:col-span-3">
              <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Trip Information</h3>
                  <span className={`px-3 py-1 text-sm rounded-full font-medium
                    ${currentTrip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      currentTrip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                      currentTrip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                      currentTrip.status === 'upcoming' ? 'bg-indigo-100 text-indigo-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {currentTrip.status?.replace('_', ' ') || 'pending'}
                  </span>
                </div>
                
                {/* Last Edited Notification */}
                {currentTrip.last_edited_by && currentTrip.last_edited_at && (
                  <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Last Edited
                        </p>
                        <p className="text-sm text-blue-700">
                          {formatEditDate(currentTrip.last_edited_at)}
                        </p>
                        <p className="text-sm font-medium text-blue-800 mt-1">
                          📝 EDITED BY {currentTrip.edited_by_role?.toUpperCase() || 'UNKNOWN'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-6">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-600">Pickup Time</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatTime(currentTrip.pickup_time)}</dd>
                    </div>
                    
                    {currentTrip.return_pickup_time && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-600">Return Pickup Time</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatTime(currentTrip.return_pickup_time)}</dd>
                      </div>
                    )}
                    
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-600">Route</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <div className="flex items-center mb-2">
                          <span className="h-2 w-2 rounded-full bg-green-500 inline-block mr-2 flex-shrink-0"></span>
                          <span>{currentTrip.pickup_address || currentTrip.pickup_location}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-red-500 inline-block mr-2 flex-shrink-0"></span>
                          <span>{currentTrip.destination_address || currentTrip.dropoff_location}</span>
                        </div>
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Estimated Duration</dt>
                      <dd className="mt-1 text-sm text-gray-900">{currentTrip.estimated_duration || 30} minutes</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Created At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatTime(currentTrip.created_at)}</dd>
                    </div>
                    
                    {/* Edit Tracking Information */}
                    {currentTrip.last_edited_by && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-600">Last Edited</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatTime(currentTrip.last_edited_at || currentTrip.updated_at)}
                          <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            ✏️ EDITED BY {currentTrip.edited_by_role?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </dd>
                      </div>
                    )}
                    
                    {currentTrip.special_requirements && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-600">Special Requirements</dt>
                        <dd className="mt-1 text-sm text-gray-900">{currentTrip.special_requirements}</dd>
                      </div>
                    )}
                    
                    {currentTrip.notes && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-600">Notes</dt>
                        <dd className="mt-1 text-sm text-gray-900">{currentTrip.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
            
            {/* Client & Facility Information - right column */}
            <div>
              {/* Client & Facility Information */}
              <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-6 border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Client & Facility Information</h3>
                </div>
                <div className="p-6 space-y-6">
                  {/* Facility Information */}
                  {currentTrip.facility && (
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        🏥 Facility
                      </h4>
                      <dl className="space-y-3 pl-4 border-l-2 border-blue-200">
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Facility Name</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-medium">
                            {currentTrip.facility.name}
                          </dd>
                        </div>
                        {currentTrip.facility.contact_email && (
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Contact Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{currentTrip.facility.contact_email}</dd>
                          </div>
                        )}
                        {currentTrip.facility.phone_number && (
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Contact Phone</dt>
                            <dd className="mt-1 text-sm text-gray-900">{currentTrip.facility.phone_number}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}

                  {/* Client Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                      👤 Client
                    </h4>
                    {(() => {
                      // Enhanced client name resolution with debugging
                      console.log('🔍 Client resolution debug:', {
                        trip_id: currentTrip.id,
                        user_id: currentTrip.user_id,
                        managed_client_id: currentTrip.managed_client_id,
                        has_user_profile: !!currentTrip.user_profile,
                        has_managed_client: !!currentTrip.managed_client,
                        managed_client_data: currentTrip.managed_client,
                        client_name: currentTrip.client_name,
                        client_first_name: currentTrip.client_first_name,
                        passenger_name: currentTrip.passenger_name
                      });
                      
                      // Priority 1: Get client name from managed_client data if available
                      let clientName = null;
                      if (currentTrip.managed_client?.first_name) {
                        clientName = `${currentTrip.managed_client.first_name} ${currentTrip.managed_client.last_name || ''}`.trim();
                        console.log('✅ Using managed client name:', clientName);
                      }
                      // Priority 2: Get client name from user_profile data if available
                      else if (currentTrip.user_profile?.first_name) {
                        clientName = `${currentTrip.user_profile.first_name} ${currentTrip.user_profile.last_name || ''}`.trim();
                        console.log('✅ Using user profile name:', clientName);
                      }
                      // Priority 3: Use existing client_name fields
                      else if (currentTrip.client_name) {
                        clientName = currentTrip.client_name;
                        console.log('✅ Using existing client_name field:', clientName);
                      }
                      else if (currentTrip.client_first_name) {
                        clientName = currentTrip.client_first_name;
                        console.log('✅ Using client_first_name field:', clientName);
                      }
                      else if (currentTrip.passenger_name) {
                        clientName = currentTrip.passenger_name;
                        console.log('✅ Using passenger_name field:', clientName);
                      }
                      // Priority 4: Create descriptive fallbacks only as last resort
                      else if (currentTrip.managed_client_id) {
                        clientName = `Managed Client ${currentTrip.managed_client_id.slice(0, 8)}`;
                        console.log('⚠️ Using managed client ID fallback:', clientName);
                      } else if (currentTrip.user_id) {
                        clientName = `Client ${currentTrip.user_id.slice(0, 8)}`;
                        console.log('⚠️ Using user ID fallback:', clientName);
                      }
                      
                      const clientPhone = currentTrip.phone_number || 
                                        currentTrip.client_phone || 
                                        (currentTrip.user_profile ? currentTrip.user_profile.phone_number : null) ||
                                        (currentTrip.managed_client ? currentTrip.managed_client.phone_number : null);
                      
                      const clientEmail = currentTrip.user_profile?.email || currentTrip.managed_client?.email;
                      
                      return clientName ? (
                        <dl className="space-y-3 pl-4 border-l-2 border-green-200">
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Client Name</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-medium">
                              {clientName}
                              {currentTrip.managed_client_id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Facility Managed
                                </span>
                              )}
                              {currentTrip.user_id && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Direct Client
                                </span>
                              )}
                            </dd>
                          </div>
                          {clientEmail && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Email</dt>
                              <dd className="mt-1 text-sm text-gray-900">{clientEmail}</dd>
                            </div>
                          )}
                          {clientPhone && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Phone</dt>
                              <dd className="mt-1 text-sm text-gray-900">{clientPhone}</dd>
                            </div>
                          )}
                          {currentTrip.managed_client?.address && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Address</dt>
                              <dd className="mt-1 text-sm text-gray-900">{currentTrip.managed_client.address}</dd>
                            </div>
                          )}
                          {currentTrip.managed_client?.accessibility_needs && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Accessibility Needs</dt>
                              <dd className="mt-1 text-sm text-gray-900">{currentTrip.managed_client.accessibility_needs}</dd>
                            </div>
                          )}
                          {currentTrip.managed_client?.medical_requirements && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Medical Requirements</dt>
                              <dd className="mt-1 text-sm text-gray-900">{currentTrip.managed_client.medical_requirements}</dd>
                            </div>
                          )}
                          {currentTrip.managed_client?.emergency_contact && (
                            <div>
                              <dt className="text-sm font-medium text-gray-600">Emergency Contact</dt>
                              <dd className="mt-1 text-sm text-gray-900">{currentTrip.managed_client.emergency_contact}</dd>
                            </div>
                          )}
                        </dl>
                      ) : (
                        <div className="pl-4 border-l-2 border-yellow-200">
                          <div className="bg-yellow-50 p-3 rounded-md">
                            <p className="text-sm text-gray-700 mb-2">⚠️ Client information not fully available</p>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>Trip ID: {currentTrip.id}</div>
                              {currentTrip.user_id && <div>User ID: {currentTrip.user_id.slice(0, 8)}...</div>}
                              {currentTrip.managed_client_id && <div>Managed Client ID: {currentTrip.managed_client_id.slice(0, 8)}...</div>}
                              {currentTrip.facility_id && <div>Facility ID: {currentTrip.facility_id.slice(0, 8)}...</div>}
                              {!currentTrip.user_id && !currentTrip.managed_client_id && <div>No client identifiers found</div>}
                              <div className="mt-2 pt-2 border-t border-yellow-200">
                                <div className="font-medium">Available Data:</div>
                                <div>Has user_profile: {currentTrip.user_profile ? 'Yes' : 'No'}</div>
                                <div>Has managed_client: {currentTrip.managed_client ? 'Yes' : 'No'}</div>
                                <div>Client name field: {currentTrip.client_name || 'Not set'}</div>
                                <div>Passenger name field: {currentTrip.passenger_name || 'Not set'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Driver Information Section */}
              <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-6 border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Driver Information</h3>
                </div>
                <div className="p-6">
                  {currentTrip.driver ? (
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        🚗 Assigned Driver
                      </h4>
                      <dl className="space-y-3 pl-4 border-l-2 border-blue-200">
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Driver Name</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-medium">
                            {currentTrip.driver.full_name || `${currentTrip.driver.first_name || ''} ${currentTrip.driver.last_name || ''}`.trim() || 'Unnamed Driver'}
                          </dd>
                        </div>
                        {currentTrip.driver.email && (
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{currentTrip.driver.email}</dd>
                          </div>
                        )}
                        {currentTrip.driver.phone_number && (
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Phone</dt>
                            <dd className="mt-1 text-sm text-gray-900">{currentTrip.driver.phone_number}</dd>
                          </div>
                        )}
                        {currentTrip.driver.vehicle_model && (
                          <div>
                            <dt className="text-sm font-medium text-gray-600">Vehicle</dt>
                            <dd className="mt-1 text-sm text-gray-900">{currentTrip.driver.vehicle_model}</dd>
                          </div>
                        )}
                        {currentTrip.driver.vehicle_license && (
                          <div>
                            <dt className="text-sm font-medium text-gray-600">License Plate</dt>
                            <dd className="mt-1 text-sm text-gray-900">{currentTrip.driver.vehicle_license}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Status</dt>
                          <dd className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              currentTrip.driver.status === 'available' ? 'bg-green-100 text-green-800' : 
                              currentTrip.driver.status === 'on_trip' ? 'bg-orange-100 text-orange-800' : 
                              currentTrip.driver.status === 'offline' ? 'bg-red-100 text-red-800' : 
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {currentTrip.driver.status?.replace('_', ' ') || 'Available'}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        🚫 No Driver Assigned
                      </h4>
                      <div className="pl-4 border-l-2 border-gray-200">
                        <p className="text-sm text-gray-600 mb-4">No driver assigned to this trip</p>
                        <button
                          onClick={() => router.push('/drivers')}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Assign Driver
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit Trip Form Modal */}
      {showEditForm && (
        <EditTripForm 
          trip={currentTrip}
          onSave={handleTripSave}
          onCancel={handleTripEditCancel}
        />
      )}
    </div>
  );
}