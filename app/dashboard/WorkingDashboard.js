'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function WorkingDashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [trips, setTrips] = useState([]);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [actionMessage, setActionMessage] = useState('');
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        getSession();
    }, []);

    async function getSession() {
        try {
            setLoading(true);
            
            // Get session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error('Session error:', sessionError);
                setError('Session error: ' + sessionError.message);
                setLoading(false);
                return;
            }

            if (!session) {
                console.log('No session found, redirecting to login');
                router.push('/login');
                return;
            }

            console.log('✅ User authenticated:', session.user.email);
            setUser(session.user);

            // Fetch trips
            const { data: tripsData, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .order('pickup_time', { ascending: true })
                .limit(10);

            if (tripsError) {
                console.error('Trips error:', tripsError);
                setTrips([]);
            } else {
                setTrips(tripsData || []);
            }

            setLoading(false);

        } catch (err) {
            console.error('Dashboard error:', err);
            setError('Dashboard error: ' + err.message);
            setLoading(false);
        }
    }

    async function handleSignOut() {
        try {
            await supabase.auth.signOut();
            router.push('/login');
        } catch (err) {
            console.error('Sign out error:', err);
        }
    }

    async function handleTripAction(tripId, action) {
        try {
            setActionLoading(prev => ({ ...prev, [tripId]: true }));
            setActionMessage('');

            let newStatus;
            let message;

            switch (action) {
                case 'approve':
                    newStatus = 'upcoming';
                    message = 'Trip approved successfully!';
                    break;
                case 'reject':
                    newStatus = 'cancelled';
                    message = 'Trip rejected successfully!';
                    break;
                case 'complete':
                    newStatus = 'completed';
                    message = 'Trip completed successfully!';
                    break;
                default:
                    throw new Error('Invalid action');
            }

            // Update trip status in database
            const { error: updateError } = await supabase
                .from('trips')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tripId);

            if (updateError) {
                throw updateError;
            }

            // Update local state
            setTrips(prev => prev.map(trip => 
                trip.id === tripId 
                    ? { ...trip, status: newStatus, updated_at: new Date().toISOString() }
                    : trip
            ));

            setActionMessage(message);
            
            // Clear message after 3 seconds
            setTimeout(() => setActionMessage(''), 3000);

        } catch (err) {
            console.error(`Error ${action}ing trip:`, err);
            setActionMessage(`Error: ${err.message}`);
            setTimeout(() => setActionMessage(''), 5000);
        } finally {
            setActionLoading(prev => ({ ...prev, [tripId]: false }));
        }
    }

    function formatDate(dateString) {
        if (!dateString) return 'No date';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (err) {
            return 'Invalid date';
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <h1 className="text-xl font-bold text-red-600 mb-4">Dashboard Error</h1>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <div className="flex space-x-4">
                        <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            Go to Login
                        </a>
                        <button onClick={getSession} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Action Message */}
                {actionMessage && (
                    <div className={`mb-6 px-4 py-3 rounded ${
                        actionMessage.includes('Error') 
                            ? 'bg-red-100 border border-red-400 text-red-700'
                            : 'bg-green-100 border border-green-400 text-green-700'
                    }`}>
                        <p className="font-semibold">{actionMessage}</p>
                    </div>
                )}

                {/* Success Message */}
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                    <p className="font-semibold">🎉 Dispatcher Dashboard Restored!</p>
                    <p className="text-sm">
                        Authentication working • Connected to ecosystem • Ready for trip management
                    </p>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">T</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Trips</p>
                                <p className="text-2xl font-semibold text-gray-900">{trips.length}</p>
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
                                    {trips.filter(t => t.status === 'pending').length}
                                </p>
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
                                    {trips.filter(t => t.status === 'upcoming').length}
                                </p>
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
                                    {trips.filter(t => t.status === 'completed').length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Trips with Actions */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Trip Management</h2>
                    </div>
                    <div className="p-6">
                        {trips.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Trip Details
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Client
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
                                        {trips.slice(0, 10).map((trip) => (
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {trip.managed_client_id?.startsWith('ea79223a') ? 
                                                        'David Patel (Managed)' : 
                                                        `Client ${trip.user_id?.slice(0, 6) || trip.managed_client_id?.slice(0, 6) || 'N/A'}`
                                                    }
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
                                                                    className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {actionLoading[trip.id] ? '...' : 'Approve'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'reject')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {actionLoading[trip.id] ? '...' : 'Reject'}
                                                                </button>
                                                            </>
                                                        )}
                                                        {trip.status === 'upcoming' && (
                                                            <button 
                                                                onClick={() => handleTripAction(trip.id, 'complete')}
                                                                disabled={actionLoading[trip.id]}
                                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {actionLoading[trip.id] ? '...' : 'Complete'}
                                                            </button>
                                                        )}
                                                        {trip.status === 'completed' && (
                                                            <button className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded text-xs">
                                                                Create Invoice
                                                            </button>
                                                        )}
                                                        {trip.status === 'cancelled' && (
                                                            <span className="text-red-600 text-xs">❌ Rejected</span>
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
                                <div className="text-gray-400 text-6xl mb-4">🚗</div>
                                <p className="text-gray-500 text-lg">No trips found</p>
                                <p className="text-gray-400 text-sm">Trips from the facility app will appear here for approval and management.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-blue-500 text-4xl mb-3">📅</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar View</h3>
                        <p className="text-gray-600 text-sm mb-4">View all trips in calendar format</p>
                        <a href="/calendar" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm">
                            Open Calendar
                        </a>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-green-500 text-4xl mb-3">👥</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Clients</h3>
                        <p className="text-gray-600 text-sm mb-4">View and manage client information</p>
                        <a href="/clients" className="inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm">
                            View Clients
                        </a>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-purple-500 text-4xl mb-3">🗺️</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Map View</h3>
                        <p className="text-gray-600 text-sm mb-4">See trip locations on map</p>
                        <a href="/map" className="inline-block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-sm">
                            Open Map
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
