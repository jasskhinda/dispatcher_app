'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import { format, parseISO, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { enUS } from 'date-fns/locale';

// Import calendar styles in the component (this will be included in the bundle)
export function CalendarStyles() {
  return (
    <style jsx global>{`
      /* Import react-big-calendar styles */
      @import 'react-big-calendar/lib/css/react-big-calendar.css';
      
      /* Custom calendar styling */
      .rbc-event {
        border-radius: 4px;
        padding: 2px 5px;
      }
      .rbc-event.upcoming-event {
        background-color: #818cf8; /* indigo-400 */
      }
      .rbc-event.pending-event {
        background-color: #fcd34d; /* amber-300 */
      }
      .rbc-event.in-progress-event {
        background-color: #60a5fa; /* blue-400 */
      }
      .rbc-event.completed-event {
        background-color: #34d399; /* emerald-400 */
      }
      .rbc-event.cancelled-event {
        background-color: #f87171; /* red-400 */
      }
      .rbc-event-label {
        font-weight: bold;
      }
      .rbc-today {
        background-color: #eff6ff; /* blue-50 */
      }
    `}</style>
  );
}

export default function TripCalendar() {
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  
  // State variables
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleStatuses, setVisibleStatuses] = useState({
    upcoming: true,
    pending: true,
    in_progress: true,
    completed: false,
    cancelled: false
  });
  const [view, setView] = useState('month');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  
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
    
    fetchTrips();
  }, [user, router, isDispatcher, signOut, dateRange]);
  
  // Fetch trips within the date range
  const fetchTrips = async () => {
    setLoading(true);
    setError('');
    
    try {
      const start = dateRange.start.toISOString();
      const end = dateRange.end.toISOString();
      
      const { data, error } = await supabase
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
          notes,
          client_name,
          users:client_id(first_name, last_name),
          driver:driver_id(first_name, last_name)
        `)
        .gte('scheduled_time', start)
        .lte('scheduled_time', end)
        .order('scheduled_time', { ascending: true });
        
      if (error) throw error;
      
      // Process the data for the calendar
      const processedTrips = data.map(trip => {
        // Get start and end time
        const startTime = new Date(trip.scheduled_time);
        const endTime = new Date(startTime);
        
        // Add estimated duration (or default to 30 minutes)
        endTime.setMinutes(endTime.getMinutes() + (trip.estimated_duration || 30));
        
        // Format the client name - use the denormalized field if available, otherwise use the join
        const clientName = trip.client_name || 
          (trip.users ? `${trip.users.first_name} ${trip.users.last_name}` : 'Unknown Client');
        
        // Format the driver name if a driver is assigned
        const driverName = trip.driver ? 
          `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unassigned';
        
        return {
          id: trip.id,
          title: `${clientName} - ${trip.pickup_location} to ${trip.dropoff_location}`,
          start: startTime,
          end: endTime,
          status: trip.status,
          resource: {
            id: trip.id,
            clientId: trip.client_id,
            clientName: clientName,
            driverId: trip.driver_id,
            driverName: driverName,
            pickup: trip.pickup_location,
            dropoff: trip.dropoff_location,
            notes: trip.notes
          }
        };
      });
      
      setTrips(processedTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setError('Failed to load trip data');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle range change in the calendar
  const handleRangeChange = (range) => {
    // Month view returns an object with start and end
    if (range.start && range.end) {
      setDateRange({
        start: new Date(range.start),
        end: new Date(range.end)
      });
    } 
    // Week and day view return an array of dates
    else if (Array.isArray(range)) {
      setDateRange({
        start: new Date(range[0]),
        end: new Date(range[range.length - 1])
      });
    }
  };
  
  // Toggle visibility of specific trip statuses
  const toggleStatus = (status) => {
    setVisibleStatuses(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };
  
  // Filter trips based on selected statuses
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => visibleStatuses[trip.status]);
  }, [trips, visibleStatuses]);
  
  // Custom calendar event styling
  const eventPropGetter = (event) => {
    const className = `${event.status}-event`;
    return { className };
  };
  
  // Custom toolbar component
  const CalendarToolbar = ({ label, onNavigate, onView }) => {
    return (
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between items-center">
        <div className="mb-4 sm:mb-0 flex items-center">
          <button
            type="button"
            onClick={() => onNavigate('PREV')}
            className="mr-2 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onNavigate('TODAY')}
            className="mr-2 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onNavigate('NEXT')}
            className="mr-4 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </button>
          <h2 className="text-lg font-medium">{label}</h2>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onView('month')}
            className={`mr-2 px-3 py-1 rounded-md text-sm font-medium ${
              view === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => onView('week')}
            className={`mr-2 px-3 py-1 rounded-md text-sm font-medium ${
              view === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => onView('day')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              view === 'day' 
                ? 'bg-blue-600 text-white' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Day
          </button>
        </div>
      </div>
    );
  };
  
  // Custom event component
  const EventComponent = ({ event }) => {
    return (
      <div>
        <div className="font-medium">{event.title}</div>
        {event.resource.driverId && (
          <div className="text-xs mt-1 truncate">{event.resource.driverName}</div>
        )}
      </div>
    );
  };
  
  // Date formatter for the calendar
  const formats = {
    dateFormat: 'dd',
    dayFormat: 'EEE dd/MM',
    monthHeaderFormat: 'MMMM yyyy',
    dayHeaderFormat: 'EEEE, MMMM d, yyyy',
    dayRangeHeaderFormat: ({ start, end }) => 
      `${format(start, 'MMMM d')} – ${format(end, 'MMMM d, yyyy')}`
  };
  
  // Handle event selection
  const handleSelectEvent = (event) => {
    router.push(`/trips/${event.id}`);
  };
  
  // Handle slot selection for new event creation
  const handleSelectSlot = ({ start }) => {
    // Format the date and set as query parameters
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const hours = String(start.getHours()).padStart(2, '0');
    const minutes = String(start.getMinutes()).padStart(2, '0');
    
    const dateParam = `${year}-${month}-${day}`;
    const timeParam = `${hours}:${minutes}`;
    
    router.push(`/trips/new?date=${dateParam}&time=${timeParam}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <CalendarStyles />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Trip Calendar</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/trips/new')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Create Trip
            </button>
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
        {/* Status filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center">
            <span className="mr-4 text-sm font-medium text-gray-700">Show:</span>
            
            <div className="flex items-center mr-4 mb-2 sm:mb-0">
              <input
                id="filter-upcoming"
                type="checkbox"
                checked={visibleStatuses.upcoming}
                onChange={() => toggleStatus('upcoming')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="filter-upcoming" className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-indigo-400 rounded-full mr-1"></span>
                Upcoming
              </label>
            </div>
            
            <div className="flex items-center mr-4 mb-2 sm:mb-0">
              <input
                id="filter-pending"
                type="checkbox"
                checked={visibleStatuses.pending}
                onChange={() => toggleStatus('pending')}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <label htmlFor="filter-pending" className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-amber-300 rounded-full mr-1"></span>
                Pending
              </label>
            </div>
            
            <div className="flex items-center mr-4 mb-2 sm:mb-0">
              <input
                id="filter-in-progress"
                type="checkbox"
                checked={visibleStatuses.in_progress}
                onChange={() => toggleStatus('in_progress')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="filter-in-progress" className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-blue-400 rounded-full mr-1"></span>
                In Progress
              </label>
            </div>
            
            <div className="flex items-center mr-4 mb-2 sm:mb-0">
              <input
                id="filter-completed"
                type="checkbox"
                checked={visibleStatuses.completed}
                onChange={() => toggleStatus('completed')}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="filter-completed" className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-emerald-400 rounded-full mr-1"></span>
                Completed
              </label>
            </div>
            
            <div className="flex items-center mb-2 sm:mb-0">
              <input
                id="filter-cancelled"
                type="checkbox"
                checked={visibleStatuses.cancelled}
                onChange={() => toggleStatus('cancelled')}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="filter-cancelled" className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-red-400 rounded-full mr-1"></span>
                Cancelled
              </label>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="bg-white shadow rounded-lg p-6 flex justify-center items-center" style={{ height: '700px' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <Calendar
              localizer={{
                format: (date, formatString) => format(date, formatString, { locale: enUS }),
                formats,
                startOfWeek: () => 0, // Start week on Sunday
                getDay: date => getDay(date)
              }}
              events={filteredTrips}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 700 }}
              views={['month', 'week', 'day']}
              defaultView="month"
              onView={setView}
              view={view}
              onRangeChange={handleRangeChange}
              components={{
                toolbar: props => (
                  <CalendarToolbar 
                    {...props} 
                    view={view}
                  />
                ),
                event: EventComponent
              }}
              eventPropGetter={eventPropGetter}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              popup
            />
          </div>
        )}
      </main>
    </div>
  );
}