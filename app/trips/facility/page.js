'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function FacilityTripsPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [trips, setTrips] = useState([]);
    const [filteredTrips, setFilteredTrips] = useState([]);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [actionMessage, setActionMessage] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [facilityFilter, setFacilityFilter] = useState('all');
    const [facilities, setFacilities] = useState([]);
    
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        getSession();
    }, []);

    useEffect(() => {
        filterTrips();
    }, [trips, statusFilter, facilityFilter]);

    async function getSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/login');
                return;
            }

            setUser(session.user);
            await fetchFacilityTrips();
            
        } catch (err) {
            console.error('Session error:', err);
            setError('Authentication error: ' + err.message);
            setLoading(false);
        }
    }

    async function fetchFacilityTrips() {
        try {
            console.log('🔍 Fetching facility trips...');
            
            // Fetch trips from facility app (has facility_id)
            const { data: tripsData, error: tripsError } = await supabase
                .from('trips')
                .select(`
                    *,
                    facilities(id, name, address, contact_email, phone_number),
                    managed_clients(id, first_name, last_name, facility_id)
                `)
                .not('facility_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(100);

            if (tripsError) throw tripsError;

            console.log(`✅ Found ${tripsData?.length || 0} facility trips`);

            // Get unique facilities for filter
            const uniqueFacilities = [...new Set(tripsData?.map(trip => trip.facilities).filter(Boolean))];
            setFacilities(uniqueFacilities);

            setTrips(tripsData || []);
            setLoading(false);

        } catch (err) {
            console.error('Error fetching facility trips:', err);
            setError('Failed to load facility trips: ' + err.message);
            setLoading(false);
        }
    }

    function filterTrips() {
        let filtered = trips;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(trip => trip.status === statusFilter);
        }

        if (facilityFilter !== 'all') {
            filtered = filtered.filter(trip => trip.facility_id === facilityFilter);
        }

        setFilteredTrips(filtered);
    }

    async function handleTripAction(tripId, action) {
        try {
            setActionLoading(prev => ({ ...prev, [tripId]: true }));
            setActionMessage('');

            let newStatus;
            let message;
            let updateData = {
                id: tripId,
                updated_at: new Date().toISOString()
            };

            switch (action) {
                case 'approve':
                    newStatus = 'upcoming';
                    message = '✅ Trip approved successfully';
                    updateData.status = newStatus;
                    break;
                case 'reject':
                    newStatus = 'cancelled';
                    message = '❌ Trip rejected';
                    updateData.status = newStatus;
                    updateData.cancellation_reason = 'Rejected by dispatcher';
                    break;
                case 'complete':
                    newStatus = 'completed';
                    message = '🎉 Trip marked as completed';
                    updateData.status = newStatus;
                    break;
            }

            const { error } = await supabase
                .from('trips')
                .update(updateData)
                .eq('id', tripId);

            if (error) throw error;

            // Update local state
            setTrips(prevTrips => 
                prevTrips.map(trip => 
                    trip.id === tripId 
                        ? { ...trip, status: newStatus, updated_at: new Date().toISOString() }
                        : trip
                )
            );

            setActionMessage(message);
            setTimeout(() => setActionMessage(''), 3000);

        } catch (err) {
            console.error(`Error ${action}ing trip:`, err);
            setActionMessage(`Error: ${err.message}`);
            setTimeout(() => setActionMessage(''), 5000);
        } finally {
            setActionLoading(prev => ({ ...prev, [tripId]: false }));
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading facility trips...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-4">Error Loading Trips</h1>
                    <p className="text-red-600 mb-6">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">🏥 Facility Trips</h1>
                            <p className="mt-2 text-gray-600">
                                Manage trips from facility applications
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                            >
                                ← Back to Dashboard
                            </button>
                            <button
                                onClick={() => router.push('/trips/individual')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                            >
                                👤 Individual Trips
                            </button>
                        </div>
                    </div>
                </div>

                {/* Action Message */}
                {actionMessage && (
                    <div className={`mb-6 p-4 rounded-lg ${actionMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {actionMessage}
                    </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">T</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Facility Trips</p>
                                <p className="text-2xl font-semibold text-gray-900">{filteredTrips.length}</p>
                                <p className="text-xs text-gray-400">From {facilities.length} facilities</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">P</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Pending</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {filteredTrips.filter(t => t.status === 'pending').length}
                                </p>
                                <p className="text-xs text-gray-400">Awaiting approval</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">U</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Upcoming</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {filteredTrips.filter(t => t.status === 'upcoming').length}
                                </p>
                                <p className="text-xs text-gray-400">Scheduled</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">C</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Completed</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {filteredTrips.filter(t => t.status === 'completed').length}
                                </p>
                                <p className="text-xs text-gray-400">Finished trips</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Trip Table */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Facility Trip Management</h2>
                            
                            {/* Filters */}
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm font-medium text-gray-700">Status:</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="upcoming">Upcoming</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm font-medium text-gray-700">Facility:</label>
                                    <select
                                        value={facilityFilter}
                                        onChange={(e) => setFacilityFilter(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Facilities</option>
                                        {facilities.map((facility) => (
                                            <option key={facility.id} value={facility.id}>
                                                {facility.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="text-xs text-gray-500">
                                    Showing {filteredTrips.length} trips
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        {filteredTrips.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Trip Details
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Facility & Client
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Pickup Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredTrips.map((trip) => (
                                            <tr key={trip.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {trip.id.slice(0, 8)}...
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {trip.pickup_location || trip.pickup_address || 'Pickup location'} 
                                                        <br />→ {trip.dropoff_location || trip.destination_address || 'Destination'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        🏥 {trip.facilities?.name || 'Unknown Facility'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        👤 {trip.managed_clients ? 
                                                            `${trip.managed_clients.first_name} ${trip.managed_clients.last_name}` : 
                                                            'Client information not available'
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        trip.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                                        trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {trip.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatDate(trip.pickup_time)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        {trip.status === 'pending' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'approve')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                                                                >
                                                                    {actionLoading[trip.id] ? 'Approving...' : 'Approve'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'reject')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                                                                >
                                                                    {actionLoading[trip.id] ? 'Processing...' : 'Reject'}
                                                                </button>
                                                            </>
                                                        )}
                                                        {trip.status === 'upcoming' && (
                                                            <button 
                                                                onClick={() => handleTripAction(trip.id, 'complete')}
                                                                disabled={actionLoading[trip.id]}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                                                            >
                                                                {actionLoading[trip.id] ? 'Completing...' : 'Complete'}
                                                            </button>
                                                        )}
                                                        {trip.status === 'completed' && (
                                                            <a
                                                                href={`/invoice/facility-monthly/${trip.facility_id}-${new Date(trip.pickup_time).getFullYear()}-${String(new Date(trip.pickup_time).getMonth() + 1).padStart(2, '0')}`}
                                                                className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 shadow-sm"
                                                            >
                                                                📄 Monthly Invoice
                                                            </a>
                                                        )}
                                                        {trip.status === 'cancelled' && (
                                                            <div className="text-red-600 text-xs">
                                                                <div className="font-semibold">❌ Rejected</div>
                                                                {trip.cancellation_reason && (
                                                                    <div className="text-gray-500 mt-1 max-w-xs">
                                                                        {trip.cancellation_reason}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-6xl mb-4">🏥</div>
                                <p className="text-gray-500 text-lg">No facility trips found</p>
                                <p className="text-gray-400 text-sm">
                                    {statusFilter !== 'all' || facilityFilter !== 'all' ? 
                                        'Try adjusting your filters to see more trips.' :
                                        'Trips from facility applications will appear here.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
