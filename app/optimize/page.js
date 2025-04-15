'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

export default function OptimizePage() {
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  
  // State variables
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  
  // OpenAI API configuration
  const [apiKey, setApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  
  useEffect(() => {
    // Get API key from localStorage or environment variable
    const savedApiKey = typeof window !== 'undefined' ? localStorage.getItem('openai_api_key') : null;
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);
  
  // Save API key to localStorage
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey);
      setApiKeyError('');
      setSuccessMessage('API key saved. It is stored only in your browser.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setApiKeyError('Please enter a valid API key');
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Ensure user has dispatcher role
    if (!isDispatcher()) {
      signOut();
      router.push('/login?error=Access denied. This application is only for dispatchers.');
      return;
    }

    // Fetch data when selected date changes
    fetchTripsAndDrivers();
    
  }, [user, router, isDispatcher, signOut, selectedDate]);

  // Fetch upcoming trips and available drivers
  const fetchTripsAndDrivers = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch upcoming trips for the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Format dates for Supabase
      const startDateStr = startOfDay.toISOString();
      const endDateStr = endOfDay.toISOString();
      
      // Fetch upcoming trips
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          client_id,
          driver_id,
          pickup_location,
          dropoff_location,
          scheduled_time,
          estimated_duration,
          status,
          users:client_id(first_name, last_name, phone_number)
        `)
        .gte('scheduled_time', startDateStr)
        .lt('scheduled_time', endDateStr)
        .in('status', ['upcoming', 'pending'])
        .order('scheduled_time', { ascending: true });
        
      if (tripsError) throw tripsError;
      
      // Fetch all drivers
      const { data: drivers, error: driversError } = await supabase
        .from('users')
        .select(`
          id, 
          first_name, 
          last_name,
          phone_number,
          driver_details(*)
        `)
        .eq('role', 'driver')
        .not('driver_details.status', 'eq', 'inactive');
        
      if (driversError) throw driversError;
      
      // Process the data
      const processedTrips = trips.map(trip => ({
        ...trip,
        client_name: trip.users ? `${trip.users.first_name} ${trip.users.last_name}` : 'Unknown',
        client_phone: trip.users?.phone_number,
        // Format the scheduled time for display
        formatted_time: new Date(trip.scheduled_time).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      }));
      
      const processedDrivers = drivers.filter(driver => driver.driver_details).map(driver => ({
        id: driver.id,
        name: `${driver.first_name} ${driver.last_name}`,
        phone: driver.phone_number,
        status: driver.driver_details?.status || 'unknown',
        vehicle: driver.driver_details?.vehicle_info,
        rating: driver.driver_details?.rating || 0,
        // Check if driver is already assigned to any of the fetched trips
        assigned: trips.some(trip => trip.driver_id === driver.id)
      }));
      
      setUpcomingTrips(processedTrips);
      setAvailableDrivers(processedDrivers);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load trips and drivers');
    } finally {
      setLoading(false);
    }
  };

  // Run optimization using OpenAI
  const runOptimization = async () => {
    if (!apiKey) {
      setApiKeyError('Please enter your OpenAI API key');
      return;
    }
    
    if (upcomingTrips.length === 0) {
      setError('No upcoming trips to optimize');
      return;
    }
    
    const availableDriversCount = availableDrivers.filter(d => !d.assigned).length;
    if (availableDriversCount === 0) {
      setError('No available drivers for optimization');
      return;
    }
    
    setOptimizing(true);
    setError('');
    setOptimizationResult(null);
    
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Note: In production, API calls should be made server-side
      });
      
      // Prepare the data for the AI
      const tripsData = upcomingTrips.map(trip => ({
        id: trip.id,
        pickup: trip.pickup_location,
        dropoff: trip.dropoff_location,
        time: trip.scheduled_time,
        duration: trip.estimated_duration || 30, // Default 30 minutes if not specified
        current_driver_id: trip.driver_id || null
      }));
      
      const driversData = availableDrivers
        .filter(driver => driver.status === 'available' || driver.status === 'off_duty')
        .map(driver => ({
          id: driver.id,
          name: driver.name,
          rating: driver.rating,
          currently_assigned: driver.assigned
        }));
      
      // Prepare the prompt for the AI
      const prompt = `
You are an expert trip dispatcher AI that optimizes driver assignments and schedules.

DATE: ${new Date(selectedDate).toDateString()}

UPCOMING TRIPS (${tripsData.length}):
${JSON.stringify(tripsData, null, 2)}

AVAILABLE DRIVERS (${driversData.length}):
${JSON.stringify(driversData, null, 2)}

Your task:
1. Analyze the upcoming trips and available drivers
2. Optimize driver assignments to minimize travel time and maximize efficiency
3. Suggest minor adjustments to trip schedules (within 15 minutes) to improve overall efficiency
4. Consider driver ratings when making assignments
5. If a trip already has a driver assigned, evaluate if it's optimal or suggest a reassignment

Return your response as a JSON object with the following structure:
{
  "assignments": [
    {
      "trip_id": "123",
      "driver_id": "456",
      "original_time": "2023-05-01T14:30:00Z",
      "suggested_time": "2023-05-01T14:35:00Z", 
      "reasoning": "This driver is closest to the pickup location and has a high rating."
    }
  ],
  "explanation": "Overall explanation of the optimization strategy."
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a trip optimization assistant that helps dispatchers allocate drivers efficiently."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse the AI response
      const responseText = response.choices[0].message.content;
      const optimizationData = JSON.parse(responseText);
      
      // Enhance the optimization result with human-readable names
      const enhancedAssignments = optimizationData.assignments.map(assignment => {
        const trip = upcomingTrips.find(t => t.id === assignment.trip_id);
        const driver = availableDrivers.find(d => d.id === assignment.driver_id);
        
        return {
          ...assignment,
          trip_info: trip ? {
            pickup: trip.pickup_location,
            dropoff: trip.dropoff_location,
            client: trip.client_name
          } : null,
          driver_name: driver ? driver.name : 'Unknown Driver',
          original_time_formatted: assignment.original_time ? 
            new Date(assignment.original_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
            'N/A',
          suggested_time_formatted: assignment.suggested_time ? 
            new Date(assignment.suggested_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
            'N/A',
          time_difference: calculateTimeDifference(assignment.original_time, assignment.suggested_time)
        };
      });
      
      setOptimizationResult({
        ...optimizationData,
        assignments: enhancedAssignments
      });
      
    } catch (error) {
      console.error('Optimization error:', error);
      setError(`Optimization failed: ${error.message}`);
    } finally {
      setOptimizing(false);
    }
  };
  
  // Calculate time difference between original and suggested times
  const calculateTimeDifference = (originalTime, suggestedTime) => {
    if (!originalTime || !suggestedTime) return 'No change';
    
    const original = new Date(originalTime);
    const suggested = new Date(suggestedTime);
    const diffMinutes = Math.round((suggested - original) / (60 * 1000));
    
    if (diffMinutes === 0) return 'No change';
    return diffMinutes > 0 ? `+${diffMinutes} min later` : `${diffMinutes} min earlier`;
  };
  
  // Apply the optimization results
  const applyOptimization = async () => {
    if (!optimizationResult || !optimizationResult.assignments) {
      setError('No optimization results to apply');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Process each assignment sequentially
      for (const assignment of optimizationResult.assignments) {
        // Update driver assignment
        const { error: assignError } = await supabase
          .from('trips')
          .update({ 
            driver_id: assignment.driver_id,
            scheduled_time: assignment.suggested_time || assignment.original_time,
            // If trip was pending and now has a driver, change status to upcoming
            status: 'upcoming'
          })
          .eq('id', assignment.trip_id);
          
        if (assignError) throw assignError;
      }
      
      setSuccessMessage('Optimization applied successfully!');
      
      // Refresh the data
      await fetchTripsAndDrivers();
      
      // Clear the optimization result
      setOptimizationResult(null);
      
    } catch (error) {
      console.error('Error applying optimization:', error);
      setError('Failed to apply optimization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Trip Optimization</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OpenAI API Key Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">OpenAI API Configuration</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              This feature uses OpenAI's API to optimize trip scheduling and driver assignment. 
              You need to provide your OpenAI API key. The key is stored only in your browser.
            </p>
            <div className="flex">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Key
              </button>
            </div>
            {apiKeyError && <p className="mt-2 text-sm text-red-600">{apiKeyError}</p>}
            {successMessage && <p className="mt-2 text-sm text-green-600">{successMessage}</p>}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Filters and Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Optimization Controls</h2>
              
              <div className="mb-4">
                <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date to Optimize
                </label>
                <input
                  type="date"
                  id="date-select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Trips to optimize:</span> {upcomingTrips.length}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Available drivers:</span> {availableDrivers.filter(d => !d.assigned).length}
                </p>
              </div>
              
              <button
                onClick={runOptimization}
                disabled={optimizing || loading || !apiKey}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 mb-2"
              >
                {optimizing ? 'Optimizing...' : 'Run AI Optimization'}
              </button>
              
              {optimizationResult && (
                <button
                  onClick={applyOptimization}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  Apply Optimization
                </button>
              )}
              
              {error && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
            
            {/* Driver List */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Available Drivers</h2>
              {loading ? (
                <div className="animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-gray-200 rounded mb-2"></div>
                  ))}
                </div>
              ) : availableDrivers.length === 0 ? (
                <p className="text-gray-500 text-center">No drivers available</p>
              ) : (
                <div className="overflow-y-auto max-h-96">
                  {availableDrivers.map(driver => (
                    <div key={driver.id} className="mb-3 p-3 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{driver.name}</p>
                          <div className="text-sm text-gray-500">{driver.vehicle}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium
                          ${driver.assigned 
                            ? 'bg-blue-100 text-blue-800' 
                            : driver.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'}`}>
                          {driver.assigned ? 'Assigned' : driver.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <span className="text-yellow-500 mr-1">★</span>
                        <span className="text-sm">{driver.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Trips and Optimization Results */}
          <div className="lg:col-span-2">
            {/* Upcoming Trips */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Upcoming Trips ({selectedDate})</h2>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : upcomingTrips.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No upcoming trips found for this date</p>
              ) : (
                <div className="overflow-y-auto max-h-96">
                  {upcomingTrips.map(trip => (
                    <div key={trip.id} className="mb-4 p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{trip.client_name}</p>
                          <div className="text-sm text-gray-500">
                            <div className="flex items-center mt-1">
                              <span className="h-2 w-2 rounded-full bg-green-500 inline-block mr-2"></span>
                              {trip.pickup_location}
                            </div>
                            <div className="flex items-center mt-1">
                              <span className="h-2 w-2 rounded-full bg-red-500 inline-block mr-2"></span>
                              {trip.dropoff_location}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{trip.formatted_time}</div>
                          <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full
                            ${trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {trip.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <span className="font-medium mr-2">Driver:</span>
                        {trip.driver_id ? (
                          <span>{availableDrivers.find(d => d.id === trip.driver_id)?.name || 'Assigned Driver'}</span>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Optimization Results */}
            {optimizationResult && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Optimization Results</h2>
                <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-medium text-indigo-800 mb-2">AI Strategy</h3>
                  <p className="text-sm text-indigo-700">{optimizationResult.explanation}</p>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-2">Suggested Assignments</h3>
                <div className="overflow-y-auto max-h-96">
                  {optimizationResult.assignments.map((assignment, index) => (
                    <div key={index} className="mb-4 p-4 border rounded-lg bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900">Trip Details</h4>
                          {assignment.trip_info && (
                            <div className="mt-1 text-sm">
                              <p><span className="font-medium">Client:</span> {assignment.trip_info.client}</p>
                              <p className="mt-1">
                                <span className="font-medium">Pickup:</span> {assignment.trip_info.pickup}
                              </p>
                              <p className="mt-1">
                                <span className="font-medium">Dropoff:</span> {assignment.trip_info.dropoff}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900">Assignment</h4>
                          <div className="mt-1 text-sm">
                            <p><span className="font-medium">Driver:</span> {assignment.driver_name}</p>
                            <p className="mt-1">
                              <span className="font-medium">Original Time:</span> {assignment.original_time_formatted}
                            </p>
                            <p className="mt-1">
                              <span className="font-medium">Suggested Time:</span> {assignment.suggested_time_formatted}
                              {assignment.time_difference !== 'No change' && (
                                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                                  assignment.time_difference.includes('earlier') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {assignment.time_difference}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm">
                        <p className="text-gray-600"><span className="font-medium">Reasoning:</span> {assignment.reasoning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}