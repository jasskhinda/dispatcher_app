'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';

// Helper function to calculate days between two dates
function getDayCountInRange(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Make sure both dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    
    // Add 1 because the range is inclusive of both start and end dates
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  } catch (error) {
    console.error('Error calculating day count:', error);
    return 1;
  }
}

export default function OptimizePage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // State variables
  const [user, setUser] = useState(null);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is logged in
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          return;
        }
        
        if (!session) {
          console.log("No session found, redirecting to login");
          router.push('/login');
          return;
        }
        
        setUser(session.user);
        fetchData();
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    
    checkAuth();
  }, [supabase, router]);

  // Fetch data when date range changes
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [startDate, endDate, user]);

  // Main data fetching function
  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Reset success message when fetching new data
      setSuccessMessage('');
      
      // Date range for query
      const startOfRange = new Date(startDate);
      startOfRange.setHours(0, 0, 0, 0);
      
      const endOfRange = new Date(endDate);
      endOfRange.setHours(23, 59, 59, 999);
      
      // Validate date range
      if (startOfRange > endOfRange) {
        setError('Start date must be before end date');
        setLoading(false);
        return;
      }
      
      // Format for Supabase
      const startDateStr = startOfRange.toISOString();
      const endDateStr = endOfRange.toISOString();
      
      // Fetch trips for selected date with driver information
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select(`
          *,
          driver:driver_id(id, first_name, last_name, phone_number)
        `)
        .gte('pickup_time', startDateStr)
        .lt('pickup_time', endDateStr)
        .in('status', ['upcoming', 'pending'])
        .order('pickup_time', { ascending: true });
      
      if (tripsError) throw tripsError;
      
      console.log("Fetched trips:", trips?.length || 0);
      
      // First, fetch all client data at once to improve performance - get ALL profiles
      let allProfiles = [];
      try {
        // Only select fields that actually exist in the profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, phone_number');
          
        if (error) {
          console.log('Error details:', JSON.stringify(error));
          console.error('Error fetching profiles:', error?.message || 'Unknown error');
        } else {
          allProfiles = data || [];
          console.log(`Fetched ${allProfiles.length} profiles`);
        }
      } catch (err) {
        console.error('Exception fetching profiles:', err);
        // Continue with empty profiles array
      }

      // Create a map of clients by ID for fast lookup
      const clientsMap = {};
      if (allProfiles) {
        allProfiles.forEach(client => {
          clientsMap[client.id] = client;
        });
      }
      
      // For any missing users, try to supplement with basic info from the trips themselves
      const userIds = trips.map(trip => trip.user_id).filter(id => id && !clientsMap[id]);
      
      if (userIds.length > 0) {
        // Create placeholder profiles for users that don't have a profile record
        userIds.forEach(userId => {
          if (userId) {
            clientsMap[userId] = {
              id: userId,
              first_name: "Client",
              last_name: userId.substring(0, 8)
            };
          }
        });
      }
      
      // Process trips
      const processedTrips = (trips || []).map(trip => {
        const pickupDate = trip.pickup_time ? new Date(trip.pickup_time) : null;
        
        // Get client info from the map
        let clientName = 'Unknown Client';
        const clientData = clientsMap[trip.user_id];
        
        if (clientData) {
          if (clientData.first_name || clientData.last_name) {
            clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim();
          } else if (clientData.id) {
            // Use ID as fallback if no name is available
            clientName = `Client ${clientData.id.substring(0, 8)}`;
          }
        } else if (trip.user_id) {
          // If we can't find the client but have a user ID, use that as a fallback
          clientName = `Client ${trip.user_id.substring(0, 8)}`;
        }
        
        // Get driver name from the joined driver data
        let driverName = trip.driver_name || 'Unassigned';
        if (trip.driver) {
          driverName = `${trip.driver.first_name || ''} ${trip.driver.last_name || ''}`.trim();
        }
        
        // Use date-fns for consistent formatting across server and client
        const formattedTime = pickupDate ? format(pickupDate, 'h:mm a') : 'No time';
        const formattedDate = pickupDate ? format(pickupDate, 'MM/dd/yyyy') : 'No date';
        
        return {
          ...trip,
          client_name: clientName,
          client_data: clientData || null,
          driver_name: driverName,
          formatted_time: formattedTime,
          formatted_date: formattedDate,
          pickup_location: trip.pickup_address,
          dropoff_location: trip.destination_address,
          scheduled_time: trip.pickup_time
        };
      });

      setUpcomingTrips(processedTrips);
      
      // Fetch drivers with only necessary fields
      const { data: drivers, error: driversError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, phone_number')
        .eq('role', 'driver');
      
      if (driversError) throw driversError;
      
      console.log("Fetched drivers:", drivers?.length || 0);
      
      // Process drivers
      const processedDrivers = (drivers || []).map((driver, index) => ({
        id: driver.id,
        name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Driver ' + driver.id?.substring(0, 6),
        phone: driver.phone_number || 'No phone',
        status: 'available',
        vehicle: 'Standard Vehicle',
        rating: 4.5, // Fixed rating for consistency
        assigned: false,
        // Add an index to ensure stable ordering
        index: index
      }));
      
      setAvailableDrivers(processedDrivers);
    } catch (error) {
      console.error("Data fetching error:", error);
      setError(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run optimization
  const runOptimization = () => {
    if (upcomingTrips.length === 0) {
      setError('No upcoming trips to optimize');
      return;
    }
    
    if (availableDrivers.length === 0) {
      setError('No available drivers for optimization');
      return;
    }
    
    setOptimizing(true);
    setError('');
    setOptimizationResult(null);
    
    try {
      // Simple optimization logic
      const unassignedTrips = upcomingTrips.filter(trip => !trip.driver_id);
      const availableDriversList = [...availableDrivers];
      
      // Group trips by date
      const tripsByDate = {};
      unassignedTrips.forEach(trip => {
        if (trip.pickup_time) {
          // Get just the date part for grouping
          const tripDate = new Date(trip.pickup_time).toISOString().split('T')[0];
          
          if (!tripsByDate[tripDate]) {
            tripsByDate[tripDate] = [];
          }
          
          tripsByDate[tripDate].push(trip);
        }
      });
      
      // Create assignments
      const assignments = [];
      const driverAssignmentCounts = {};
      
      // Track driver assignments per day to avoid overbooking
      const driverDailyAssignments = {};
      
      // Initialize driver counts
      availableDriversList.forEach(driver => {
        driverAssignmentCounts[driver.id] = 0;
        driverDailyAssignments[driver.id] = {};
      });
      
      // Sort dates to process in chronological order
      const sortedDates = Object.keys(tripsByDate).sort();
      
      // Process each date
      sortedDates.forEach(date => {
        const tripsOnThisDate = tripsByDate[date];
        
        // Sort trips by time
        tripsOnThisDate.sort((a, b) => new Date(a.pickup_time) - new Date(b.pickup_time));
        
        // Process each trip for this date
        tripsOnThisDate.forEach(trip => {
          // Find available drivers for this date with fewest assignments
          const availableForDate = availableDriversList
            .filter(driver => {
              // Limit to 5 trips per driver per day
              return !driverDailyAssignments[driver.id][date] || driverDailyAssignments[driver.id][date] < 5;
            })
            .sort((a, b) => {
              // First by daily assignments
              const aDailyCount = driverDailyAssignments[a.id][date] || 0;
              const bDailyCount = driverDailyAssignments[b.id][date] || 0;
              if (aDailyCount !== bDailyCount) return aDailyCount - bDailyCount;
              
              // Then by total assignments across all days
              return driverAssignmentCounts[a.id] - driverAssignmentCounts[b.id];
            });
          
          // If no drivers available for this date, use any driver
          let driver;
          if (availableForDate.length > 0) {
            driver = availableForDate[0]; // Get driver with fewest assignments
          } else {
            driver = availableDriversList[0]; // Fallback
          }
          
          // Update assignment counts
          driverAssignmentCounts[driver.id] = (driverAssignmentCounts[driver.id] || 0) + 1;
          driverDailyAssignments[driver.id][date] = (driverDailyAssignments[driver.id][date] || 0) + 1;
          
          // Time adjustments to avoid overlapping trips
          const originalTime = new Date(trip.scheduled_time);
          const suggestedTime = new Date(originalTime);
          
          // Adjust time based on how many trips this driver already has on this day
          // Each trip adjusts by 30 minutes to avoid overlaps
          const driverDailyCount = driverDailyAssignments[driver.id][date];
          let timeAdjustment = 0;
          
          if (driverDailyCount > 1) {
            // Stagger trips by adding 30 minute blocks
            timeAdjustment = (driverDailyCount - 1) * 30;
            suggestedTime.setMinutes(originalTime.getMinutes() + timeAdjustment);
          }
          
          // Format dates consistently with date-fns
          const formattedDate = format(new Date(date), 'MM/dd/yyyy');
          const originalTimeFormatted = format(originalTime, 'h:mm a');
          const suggestedTimeFormatted = format(suggestedTime, 'h:mm a');
          
          assignments.push({
            trip_id: trip.id,
            driver_id: driver.id,
            original_time: originalTime.toISOString(),
            suggested_time: suggestedTime.toISOString(),
            trip_date: date,
            reasoning: `${driver.name} has ${driverDailyCount} trips on ${formattedDate}. ${
              timeAdjustment > 0 ? `Adjusted time by +${timeAdjustment} minutes to avoid overlap.` : 'No time adjustment needed.'
            }`,
            trip_info: {
              pickup: trip.pickup_location,
              dropoff: trip.dropoff_location,
              client: trip.client_name, // This is now the full name from the processed trip
              date: formattedDate
            },
            driver_name: driver.name,
            original_time_formatted: originalTimeFormatted,
            suggested_time_formatted: suggestedTimeFormatted,
            time_difference: timeAdjustment === 0 ? 'No change' : `+${timeAdjustment} min later`
          });
        });
      });
      
      // Sort assignments by date and time
      assignments.sort((a, b) => {
        if (a.trip_date !== b.trip_date) {
          return a.trip_date.localeCompare(b.trip_date);
        }
        return new Date(a.original_time) - new Date(b.original_time);
      });
      
      // Generate optimization summary
      const dateCount = sortedDates.length;
      const daysLabel = dateCount === 1 ? 'day' : 'days';
      
      setOptimizationResult({
        assignments,
        explanation: `Optimized ${assignments.length} trip assignments across ${dateCount} ${daysLabel} with ${availableDriversList.length} drivers. Drivers were assigned to minimize overlapping schedules and balance workload.`
      });
    } catch (error) {
      console.error("Optimization error:", error);
      setError(`Optimization failed: ${error.message}`);
    } finally {
      setOptimizing(false);
    }
  };

  // Apply optimization
  const applyOptimization = async () => {
    if (!optimizationResult?.assignments?.length) {
      setError('No optimization results to apply');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Update each trip one by one
      for (const assignment of optimizationResult.assignments) {
        const { error: updateError } = await supabase
          .from('trips')
          .update({
            driver_id: assignment.driver_id,
            driver_name: assignment.driver_name, // Keep for backward compatibility
            pickup_time: assignment.suggested_time,
            status: 'upcoming'
          })
          .eq('id', assignment.trip_id);
        
        if (updateError) throw updateError;
      }
      
      setSuccessMessage('Optimization applied successfully!');
      setOptimizationResult(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Apply optimization error:", error);
      setError(`Failed to apply optimization: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-background">
      {/* Header */}
      <header className="bg-brand-card shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trip Optimization</h1>
          <Link href="/dashboard" className="px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded">
            <p className="font-bold">Success</p>
            <p>{successMessage}</p>
          </div>
        )}
        
        {/* Layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1">
            <div className="bg-brand-card shadow rounded-lg p-6 mb-6 border border-brand-border">
              <h2 className="text-lg font-semibold mb-4">Optimization Controls</h2>
              
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start-date" className="block text-sm font-medium mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-brand-border rounded bg-brand-background"
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="block text-sm font-medium mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-brand-border rounded bg-brand-background"
                    />
                  </div>
                </div>
                <p className="text-xs opacity-70 mt-1 text-center">
                  {format(new Date(startDate), 'MM/dd/yyyy')} - {format(new Date(endDate), 'MM/dd/yyyy')}
                </p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm">
                  <span className="font-medium">Trips to optimize:</span> {upcomingTrips.length}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Available drivers:</span> {availableDrivers.length}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Date range:</span> {getDayCountInRange(startDate, endDate)} days
                </p>
              </div>
              
              <button
                onClick={runOptimization}
                disabled={optimizing || loading}
                className="w-full px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90 disabled:opacity-50 mb-2"
              >
                {optimizing ? 'Optimizing...' : 'Run Optimization'}
              </button>
              
              {optimizationResult && (
                <button
                  onClick={applyOptimization}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:opacity-90 disabled:opacity-50"
                >
                  Apply Optimization
                </button>
              )}
            </div>
          </div>
          
          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {/* Upcoming Trips */}
            <div className="bg-brand-card shadow rounded-lg p-6 mb-6 border border-brand-border">
              <h2 className="text-lg font-semibold mb-4">
                Upcoming Trips {startDate === endDate ? 
                  `(${format(new Date(startDate), 'MM/dd/yyyy')})` : 
                  `(${format(new Date(startDate), 'MM/dd/yyyy')} - ${format(new Date(endDate), 'MM/dd/yyyy')})`}
              </h2>
              
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-brand-border/20 rounded"></div>
                  ))}
                </div>
              ) : upcomingTrips.length === 0 ? (
                <p className="text-center opacity-70 py-4">No upcoming trips found for this date</p>
              ) : (
                <div className="space-y-3">
                  {upcomingTrips.map(trip => (
                    <div key={trip.id} className="p-3 border border-brand-border rounded-lg bg-brand-background">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <p className="font-medium text-brand-accent">{trip.client_name}</p>
                            <span className="ml-2 text-xs px-2 py-0.5 bg-brand-accent/10 rounded">
                              Client
                            </span>
                          </div>
                          <p className="text-sm opacity-70 mt-1">{trip.pickup_location} → {trip.dropoff_location}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{trip.formatted_date}, {trip.formatted_time}</p>
                          <p className="text-xs bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded inline-block mt-1">
                            {trip.status}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm flex justify-between">
                        <span><span className="font-medium">Driver:</span> {trip.driver_name || (trip.driver_id ? 'Loading...' : 'Unassigned')}</span>
                        <span className="text-xs px-2 py-1 bg-brand-border/10 rounded inline-block">
                          ID: {trip.id.substring(0, 8)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Optimization Results */}
            {optimizationResult && (
              <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
                <h2 className="text-lg font-semibold mb-4">Optimization Results</h2>
                
                <div className="p-4 bg-brand-accent/10 rounded-lg mb-4">
                  <p className="text-sm">{optimizationResult.explanation}</p>
                </div>
                
                <div>
                  {/* Group assignments by date */}
                  {(() => {
                    // Get unique dates from assignments
                    const dates = [...new Set(optimizationResult.assignments.map(a => a.trip_date))].sort();
                    
                    return dates.map(date => {
                      const assignmentsForDate = optimizationResult.assignments.filter(a => a.trip_date === date);
                      
                      return (
                        <div key={date} className="mb-6">
                          <h3 className="font-medium text-lg mb-2 border-b border-brand-border pb-1">
                            {format(new Date(date), 'EEE, MMM d, yyyy')}
                            <span className="ml-2 text-sm opacity-70">({assignmentsForDate.length} trips)</span>
                          </h3>
                          
                          <div className="space-y-3">
                            {assignmentsForDate.map((assignment, i) => (
                              <div key={i} className="p-4 border border-brand-border rounded-lg bg-brand-background">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium">Trip</h4>
                                    <div className="flex items-center">
                                      <p className="text-sm font-medium text-brand-accent">{assignment.trip_info.client}</p>
                                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-brand-accent/10 rounded">
                                        Client
                                      </span>
                                    </div>
                                    <p className="text-sm opacity-70 mt-1">{assignment.trip_info.pickup} → {assignment.trip_info.dropoff}</p>
                                    <p className="text-xs opacity-70 mt-1">ID: {assignment.trip_id.substring(0, 8)}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Assignment</h4>
                                    <p className="text-sm">Driver: {assignment.driver_name}</p>
                                    <p className="text-sm">
                                      Time: {assignment.suggested_time_formatted}
                                      {assignment.time_difference !== 'No change' && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-brand-accent/10 text-brand-accent">
                                          {assignment.time_difference}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs opacity-70 mt-1">{assignment.reasoning}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}