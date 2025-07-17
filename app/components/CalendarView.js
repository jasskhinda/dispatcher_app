'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function CalendarView({ user, userProfile, trips: initialTrips, drivers = [] }) {
  const router = useRouter();
  const [trips, setTrips] = useState(initialTrips || []);
  const [filteredTrips, setFilteredTrips] = useState(initialTrips || []);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState(['all']);

  // Filter trips based on selected driver and status
  useEffect(() => {
    let filtered = trips;
    
    // Filter by driver
    if (selectedDriver === 'unassigned') {
      filtered = filtered.filter(trip => !trip.driver_id);
    } else if (selectedDriver !== 'all') {
      filtered = filtered.filter(trip => trip.driver_id === selectedDriver);
    }
    
    // Filter by status
    if (!selectedStatuses.includes('all')) {
      filtered = filtered.filter(trip => {
        return selectedStatuses.some(status => {
          const statusKey = status.toLowerCase().replace(' ', '_');
          return trip.status === statusKey;
        });
      });
    }
    
    setFilteredTrips(filtered);
  }, [selectedDriver, selectedStatuses, trips]);

  // Group trips by date for the calendar view
  const tripsByDate = filteredTrips.reduce((acc, trip) => {
    const date = new Date(trip.pickup_time);
    const dateStr = date.toISOString().split('T')[0];
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(trip);
    return acc;
  }, {}); 

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDay.getDate();
    
    // Create days array with empty slots for previous month days
    const days = Array(startingDayOfWeek).fill(null);
    
    // Add the days of the current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigate to previous/next month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  // Show trip details
  const showTripDetails = (trip) => {
    setSelectedTrip(trip);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedTrip(null);
  };

  // Handle status filter changes
  const handleStatusChange = (status) => {
    if (status === 'All') {
      setSelectedStatuses(['all']);
    } else {
      setSelectedStatuses(prev => {
        const newStatuses = prev.filter(s => s !== 'all');
        if (newStatuses.includes(status)) {
          const filtered = newStatuses.filter(s => s !== status);
          return filtered.length === 0 ? ['all'] : filtered;
        } else {
          return [...newStatuses, status];
        }
      });
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
              <p className="mt-2 text-sm text-gray-600">
                View and manage transportation schedules
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status and driver filters */}
        <div className="bg-white shadow-sm rounded-lg py-6 px-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Filters */}
            <div>
              <div className="flex flex-wrap items-center">
                <span className="text-sm font-medium text-gray-700 mr-4 mb-2">Status:</span>
                {['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map(status => (
                  <div key={status} className="flex items-center mr-4 mb-2">
                    <input
                      id={`filter-${status.toLowerCase().replace(' ', '-')}`}
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={selectedStatuses.includes('all') ? status === 'All' : selectedStatuses.includes(status)}
                      onChange={() => handleStatusChange(status)}
                    />
                    <label htmlFor={`filter-${status.toLowerCase().replace(' ', '-')}`} className="ml-2 text-sm text-gray-700 whitespace-nowrap">
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Driver filter */}
            <div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-3">Driver:</span>
                <div className="relative inline-block w-64">
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="block appearance-none w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Drivers</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.first_name && driver.last_name 
                          ? `${driver.first_name} ${driver.last_name}`
                          : driver.email || `Driver ${driver.id.substring(0, 6)}`}
                      </option>
                    ))}
                    <option value="unassigned">Unassigned Trips</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Calendar view */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <div className="mb-6 flex flex-col sm:flex-row sm:justify-between items-center">
            <div className="mb-4 sm:mb-0 flex items-center">
              <button onClick={goToPreviousMonth} className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button onClick={goToNextMonth} className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="mx-4 text-xl font-bold text-gray-900">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button onClick={goToToday} className="ml-2 px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">
                Today
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <button className="px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-700 font-medium">
                Month
              </button>
              <button className="px-3 py-1 text-sm rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900">
                Week
              </button>
              <button className="px-3 py-1 text-sm rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900">
                Day
              </button>
            </div>
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Calendar header */}
            {dayNames.map(day => (
              <div key={day} className="bg-gray-50 p-3 text-center font-semibold text-sm text-gray-700">
                {day}
              </div>
            ))}
            
            {/* Calendar cells */}
            {calendarDays.map((day, index) => {
              if (!day) {
                // Empty cell for days before the start of the month
                return <div key={`empty-${index}`} className="bg-gray-50 h-28 p-2"></div>;
              }
              
              const dateStr = day.toISOString().split('T')[0];
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = day.toDateString() === selectedDate.toDateString();
              const dayTrips = tripsByDate[dateStr] || [];
              
              const getStatusColor = (status) => {
                switch (status) {
                  case 'completed': return 'bg-green-100 text-green-800 border-green-200';
                  case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
                  case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
                  case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
                  case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                  default: return 'bg-gray-100 text-gray-800 border-gray-200';
                }
              };
              
              return (
                <div 
                  key={dateStr}
                  className={`relative h-28 p-2 bg-white overflow-hidden hover:bg-gray-50 cursor-pointer transition-colors ${
                    isToday ? 'bg-blue-50 border-2 border-blue-200' : ''
                  } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex items-center justify-center w-6 h-6 mb-1">
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-blue-600 font-bold' : 'text-gray-900'
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {dayTrips.slice(0, 3).map((trip, idx) => (
                      <div 
                        key={idx} 
                        onClick={(e) => {
                          e.stopPropagation();
                          showTripDetails(trip);
                        }}
                        className={`text-xs rounded px-1 py-0.5 truncate cursor-pointer hover:shadow-sm transition-shadow border ${
                          getStatusColor(trip.status)
                        }`}
                        title={`${new Date(trip.pickup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${trip.client_name || 'Client'}`}
                      >
                        <div className="font-medium truncate">
                          {new Date(trip.pickup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="truncate opacity-90">
                          {trip.client_name || 'Client'}
                        </div>
                      </div>
                    ))}
                    {dayTrips.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayTrips.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      
      {/* Trip Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
              onClick={closeModal}
            ></div>

            {/* Modal content */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-200">
              {selectedTrip && (
                <>
                  <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900" id="modal-title">Trip Details</h3>
                    <button
                      onClick={closeModal}
                      className="rounded-md hover:bg-gray-100 p-1 text-gray-500 hover:text-gray-700"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Trip information - left column */}
                      <div className="md:col-span-2">
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-md font-medium">Trip Information</h4>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium
                              ${selectedTrip.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                selectedTrip.status === 'in_progress' ? 'bg-orange-100 text-orange-800' : 
                                selectedTrip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                selectedTrip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 
                                'bg-yellow-100 text-yellow-800'}`}>
                              {selectedTrip.status.replace('_', ' ')}
                            </span>
                          </div>
                          <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
                            <div>
                              <dt className="text-sm font-medium opacity-70">Pickup Time</dt>
                              <dd className="mt-1 text-sm">{formatTime(selectedTrip.pickup_time)}</dd>
                            </div>
                            
                            {selectedTrip.return_pickup_time && (
                              <div>
                                <dt className="text-sm font-medium opacity-70">Return Pickup Time</dt>
                                <dd className="mt-1 text-sm">{formatTime(selectedTrip.return_pickup_time)}</dd>
                              </div>
                            )}
                            
                            <div>
                              <dt className="text-sm font-medium text-gray-700">Route</dt>
                              <dd className="mt-1 text-sm">
                                <div className="flex items-center mb-2">
                                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block mr-2 flex-shrink-0"></span>
                                  <span className="text-gray-900">{selectedTrip.pickup_location}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block mr-2 flex-shrink-0"></span>
                                  <span className="text-gray-900">{selectedTrip.dropoff_location}</span>
                                </div>
                              </dd>
                            </div>
                            
                            <div>
                              <dt className="text-sm font-medium opacity-70">Estimated Duration</dt>
                              <dd className="mt-1 text-sm">{selectedTrip.estimated_duration || 30} minutes</dd>
                            </div>
                            
                            {selectedTrip.special_requirements && (
                              <div>
                                <dt className="text-sm font-medium opacity-70">Special Requirements</dt>
                                <dd className="mt-1 text-sm">{selectedTrip.special_requirements}</dd>
                              </div>
                            )}
                            
                            {selectedTrip.notes && (
                              <div>
                                <dt className="text-sm font-medium opacity-70">Notes</dt>
                                <dd className="mt-1 text-sm">{selectedTrip.notes}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>
                      
                      {/* Client and driver information - right column */}
                      <div>
                        {/* Client information */}
                        <div className="mb-6">
                          <h4 className="text-md font-medium mb-3">Client Information</h4>
                          {selectedTrip.client_name ? (
                            <dl className="space-y-2">
                              <div>
                                <dt className="text-sm font-medium opacity-70">Name</dt>
                                <dd className="mt-1 text-sm">
                                  {selectedTrip.client_name}
                                </dd>
                              </div>
                              {selectedTrip.phone_number && (
                                <div>
                                  <dt className="text-sm font-medium opacity-70">Phone</dt>
                                  <dd className="mt-1 text-sm">{selectedTrip.phone_number}</dd>
                                </div>
                              )}
                              {selectedTrip.user_id && (
                                <div>
                                  <dt className="text-sm font-medium opacity-70">User ID</dt>
                                  <dd className="mt-1 text-sm text-xs opacity-60">{selectedTrip.user_id.substring(0, 8)}...</dd>
                                </div>
                              )}
                            </dl>
                          ) : (
                            <p className="text-sm opacity-70">Client information not available</p>
                          )}
                        </div>
                        
                        {/* Driver information */}
                        <div>
                          <h4 className="text-md font-medium mb-3">Driver Information</h4>
                          {selectedTrip.driver_name ? (
                            <dl className="space-y-2">
                              <div>
                                <dt className="text-sm font-medium opacity-70">Name</dt>
                                <dd className="mt-1 text-sm">
                                  {selectedTrip.driver_name}
                                </dd>
                              </div>
                              {selectedTrip.driver_phone && (
                                <div>
                                  <dt className="text-sm font-medium opacity-70">Phone</dt>
                                  <dd className="mt-1 text-sm">{selectedTrip.driver_phone}</dd>
                                </div>
                              )}
                            </dl>
                          ) : (
                            <p className="text-sm opacity-70">No driver assigned to this trip</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
                    <button
                      onClick={() => {
                        closeModal();
                        router.push(`/trips/${selectedTrip.id}`);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      View Full Details
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}