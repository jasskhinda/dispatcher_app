'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function IndividualTripsPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [trips, setTrips] = useState([]);
    const [filteredTrips, setFilteredTrips] = useState([]);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [actionMessage, setActionMessage] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [userProfiles, setUserProfiles] = useState([]);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [showDriverAssignModal, setShowDriverAssignModal] = useState(false);
    const [assigningTripId, setAssigningTripId] = useState(null);
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [assignmentLoading, setAssignmentLoading] = useState(false);
    
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        getSession();
    }, []);

    useEffect(() => {
        filterTrips();
    }, [trips, statusFilter]);

    async function getSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/login');
                return;
            }

            setUser(session.user);
            await fetchIndividualTrips();
            
        } catch (err) {
            console.error('Session error:', err);
            setError('Authentication error: ' + err.message);
            setLoading(false);
        }
    }

    async function fetchIndividualTrips() {
        try {
            console.log('🔍 Fetching individual trips (BookingCCT app only)...');
            
            // Fetch trips from booking app (has user_id but NO facility_id)
            // CRITICAL: This query must exclude ALL facility trips
            const { data: rawTripsData, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .is('facility_id', null)
                .not('user_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(100);

            if (tripsError) throw tripsError;

            console.log(`✅ Raw query returned ${rawTripsData?.length || 0} trips`);

            // ADDITIONAL SAFETY: Filter out any trips that somehow have facility_id
            // This handles data inconsistency where trips might have both user_id and facility_id
            const tripsData = rawTripsData?.filter(trip => {
                const isIndividualTrip = !trip.facility_id && trip.user_id;
                if (!isIndividualTrip) {
                    console.warn(`⚠️ Filtering out non-individual trip: ${trip.id} (facility_id: ${trip.facility_id}, user_id: ${trip.user_id})`);
                }
                return isIndividualTrip;
            }) || [];

            console.log(`✅ After filtering: ${tripsData.length} confirmed individual trips`);

            // Get user profiles for the trips separately (to avoid schema relationship issues)
            let userProfiles = [];
            if (tripsData && tripsData.length > 0) {
                const userIds = [...new Set(tripsData.map(trip => trip.user_id).filter(Boolean))];
                
                if (userIds.length > 0) {
                    console.log(`🔍 Fetching ${userIds.length} user profiles...`);
                    
                    const { data: profilesData, error: profilesError } = await supabase
                        .from('profiles')
                        .select('id, first_name, last_name, phone_number, address, email')
                        .in('id', userIds);

                    if (profilesError) {
                        console.warn('Could not fetch user profiles:', profilesError);
                    } else {
                        userProfiles = profilesData || [];
                        console.log(`   ✅ Fetched ${userProfiles.length} user profiles`);
                    }
                }
            }

            // Enhance trips with user profile information
            const enhancedTrips = tripsData?.map(trip => {
                const userProfile = userProfiles.find(profile => profile.id === trip.user_id);
                return {
                    ...trip,
                    user_profile: userProfile
                };
            }) || [];

            setUserProfiles(userProfiles);
            setTrips(enhancedTrips);
            setLoading(false);

        } catch (err) {
            console.error('Error fetching individual trips:', err);
            setError('Failed to load individual trips: ' + err.message);
            setLoading(false);
        }
    }

    function filterTrips() {
        let filtered = trips;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(trip => trip.status === statusFilter);
        }

        setFilteredTrips(filtered);
    }

    // Fetch available drivers
    async function fetchAvailableDrivers() {
        try {
            const { data: drivers, error: driversError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, phone_number, email')
                .eq('role', 'driver')
                .order('first_name');

            if (driversError) throw driversError;

            setAvailableDrivers(drivers || []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            setActionMessage('❌ Failed to load drivers');
        }
    }

    // Handle driver assignment
    async function handleDriverAssignment() {
        if (!selectedDriverId || !assigningTripId) return;

        setAssignmentLoading(true);
        try {
            const { error } = await supabase
                .from('trips')
                .update({ 
                    driver_id: selectedDriverId,
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                })
                .eq('id', assigningTripId);

            if (error) throw error;

            setActionMessage('✅ Driver assigned successfully');
            setShowDriverAssignModal(false);
            setSelectedDriverId('');
            setAssigningTripId(null);
            
            // Refresh trips
            await fetchIndividualTrips();
        } catch (error) {
            console.error('Error assigning driver:', error);
            setActionMessage('❌ Failed to assign driver');
        } finally {
            setAssignmentLoading(false);
        }
    }

    // Open driver assignment modal
    function openDriverAssignModal(tripId) {
        setAssigningTripId(tripId);
        setSelectedDriverId('');
        setShowDriverAssignModal(true);
        if (availableDrivers.length === 0) {
            fetchAvailableDrivers();
        }
    }

    // Close driver assignment modal
    function closeDriverAssignModal() {
        setShowDriverAssignModal(false);
        setSelectedDriverId('');
        setAssigningTripId(null);
    }

    // Handle marking trip as complete
    async function handleCompleteTrip(tripId) {
        try {
            setActionLoading(prev => ({ ...prev, [tripId]: true }));
            setActionMessage('');

            const { error } = await supabase
                .from('trips')
                .update({ 
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tripId);

            if (error) throw error;

            setActionMessage('✅ Trip marked as completed successfully');
            
            // Refresh trips
            await fetchIndividualTrips();
        } catch (error) {
            console.error('Error completing trip:', error);
            setActionMessage('❌ Failed to complete trip');
        } finally {
            setActionLoading(prev => ({ ...prev, [tripId]: false }));
        }
    }

    async function handleTripAction(tripId, action) {
        try {
            setActionLoading(prev => ({ ...prev, [tripId]: true }));
            setActionMessage('');

            const response = await fetch('/api/trips/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tripId: tripId,
                    action: action,
                    reason: action === 'reject' ? prompt('Please provide a reason for rejecting this trip:') : undefined
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to ${action} trip`);
            }

            console.log(`✅ Trip ${action} result:`, result);

            // Show appropriate success message based on action and payment status
            let message = `✅ Trip ${action}d successfully`;
            if (action === 'approve' && result.payment?.charged) {
                message += ` - Payment processed: $${result.payment.amount}`;
            } else if (action === 'approve' && result.payment?.status === 'failed') {
                message += ` - ⚠️ Payment failed: ${result.payment.error}`;
            } else if (action === 'approve' && result.payment?.fallback) {
                message += ` - ⚠️ ${result.warning || 'Payment will be processed manually'}`;
            } else if (action === 'approve' && result.warning) {
                message += ` - ⚠️ ${result.warning}`;
            }

            setActionMessage(message);

            // Refresh the page to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error(`Error ${action}ing trip:`, error);
            setActionMessage(`❌ Failed to ${action} trip: ${error.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [tripId]: false }));
        }
    }

    async function handleSendReminder(tripId) {
        try {
            setActionLoading(prev => ({ ...prev, [tripId]: true }));
            setActionMessage('');

            const response = await fetch('/api/trips/send-reminder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tripId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send payment reminder');
            }

            setActionMessage('✅ Payment reminder sent successfully to client');

            // Refresh data to show updated reminder count
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error sending reminder:', error);
            setActionMessage(`❌ Failed to send reminder: ${error.message}`);
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

    const getClientDisplayName = (trip) => {
        if (trip.user_profile) {
            return `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim() || 'Unknown User';
        }
        return 'User Profile Not Available';
    };

    const getClientContactInfo = (trip) => {
        if (!trip.user_profile) return null;
        
        return {
            name: getClientDisplayName(trip),
            email: trip.user_profile.email || 'No email',
            phone: trip.user_profile.phone_number || 'No phone',
            address: trip.user_profile.address || 'No address'
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading individual trips...</p>
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
                            <h1 className="text-3xl font-bold text-gray-900">👤 Individual Trips</h1>
                            <p className="mt-2 text-gray-600">
                                Manage trips from individual booking applications
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
                                onClick={() => router.push('/trips/facility')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                            >
                                🏥 Facility Trips
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

                {/* Filters and Trip Table */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Individual Trip Management</h2>
                            
                            {/* Filters */}
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm font-bold text-gray-900">Status:</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending Approval</option>
                                        <option value="approved_pending_payment">Approved - Processing Payment</option>
                                        <option value="paid_in_progress">Paid & In Progress</option>
                                        <option value="payment_failed">Payment Failed</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                
                                <div className="text-sm font-bold text-gray-900">
                                    Showing {filteredTrips.length} trips
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        {filteredTrips.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Trip Info
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Client
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Pickup
                                            </th>
                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredTrips.map((trip) => (
                                            <tr key={trip.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-3">
                                                    <div className="text-sm">
                                                        <div className="font-medium text-gray-900">#{trip.id.slice(0, 6)}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            <div className="truncate max-w-xs" title={trip.pickup_location || trip.pickup_address}>
                                                                📍 {(trip.pickup_location || trip.pickup_address || 'Pickup').substring(0, 30)}...
                                                            </div>
                                                            <div className="truncate max-w-xs" title={trip.dropoff_location || trip.destination_address}>
                                                                → {(trip.dropoff_location || trip.destination_address || 'Destination').substring(0, 30)}...
                                                            </div>
                                                        </div>
                                                        {trip.price && (
                                                            <div className="text-sm font-semibold text-green-600 mt-1">
                                                                ${parseFloat(trip.price).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="text-sm">
                                                        <div className="font-medium text-gray-900">
                                                            {getClientDisplayName(trip)}
                                                        </div>
                                                        {trip.user_profile && (
                                                            <div className="mt-1 space-y-0.5">
                                                                {trip.user_profile.email && (
                                                                    <div className="text-xs text-gray-500 truncate max-w-[200px]" title={trip.user_profile.email}>
                                                                        {trip.user_profile.email}
                                                                    </div>
                                                                )}
                                                                {trip.user_profile.phone_number && (
                                                                    <div className="text-xs text-gray-500">
                                                                        {trip.user_profile.phone_number}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                                            Individual
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                                        trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        trip.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        trip.status === 'approved_pending_payment' ? 'bg-blue-100 text-blue-800' :
                                                        trip.status === 'paid_in_progress' ? 'bg-green-600 text-white' :
                                                        trip.status === 'payment_failed' ? 'bg-red-600 text-white' :
                                                        trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                                        trip.status === 'in_process' ? 'bg-blue-600 text-white' :
                                                        trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {trip.status === 'pending' ? 'Pending' : 
                                                         trip.status === 'approved_pending_payment' ? 'Processing' :
                                                         trip.status === 'paid_in_progress' ? 'Paid' :
                                                         trip.status === 'payment_failed' ? 'Failed' :
                                                         trip.status === 'completed' ? 'Completed' :
                                                         trip.status === 'cancelled' ? 'Cancelled' :
                                                         trip.status === 'upcoming' ? 'Upcoming' :
                                                         trip.status === 'in_process' ? 'In Process' :
                                                         trip.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-900">
                                                    <div className="text-xs">
                                                        {new Date(trip.pickup_time).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(trip.pickup_time).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-1">
                                                        {/* Edit Button - Only for non-completed trips */}
                                                        {trip.status !== 'completed' && trip.status !== 'cancelled' && (
                                                            <button
                                                                onClick={() => router.push(`/trips/${trip.id}`)}
                                                                className="inline-flex items-center bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-200"
                                                                title="View & Edit Trip"
                                                            >
                                                                ✏️ EDIT
                                                            </button>
                                                        )}
                                                        
                                                        {trip.status === 'pending' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'approve')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                                >
                                                                    {actionLoading[trip.id] ? '...' : '✅ APPROVE'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'reject')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                                >
                                                                    {actionLoading[trip.id] ? '...' : '❌ REJECT'}
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {trip.status === 'approved_pending_payment' && (
                                                            <span className="text-blue-600 text-xs bg-blue-100 px-2 py-1 rounded">
                                                                💳 Processing...
                                                            </span>
                                                        )}
                                                        
                                                        {trip.status === 'paid_in_progress' && (
                                                            <button 
                                                                onClick={() => handleTripAction(trip.id, 'complete')}
                                                                disabled={actionLoading[trip.id]}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                            >
                                                                {actionLoading[trip.id] ? '...' : '✅ COMPLETE'}
                                                            </button>
                                                        )}
                                                        
                                                        {trip.status === 'payment_failed' && (
                                                            <button 
                                                                onClick={() => handleSendReminder(trip.id)}
                                                                disabled={actionLoading[trip.id]}
                                                                className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                            >
                                                                {actionLoading[trip.id] ? '...' : '📧 REMIND'}
                                                            </button>
                                                        )}
                                                        
                                                        {trip.status === 'upcoming' && (
                                                            <>
                                                                {!trip.driver_id && (
                                                                    <button 
                                                                        onClick={() => openDriverAssignModal(trip.id)}
                                                                        className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-200"
                                                                    >
                                                                        🚗 ASSIGN DRIVER
                                                                    </button>
                                                                )}
                                                                {trip.driver_id && (
                                                                    <button 
                                                                        onClick={() => handleTripAction(trip.id, 'complete')}
                                                                        disabled={actionLoading[trip.id]}
                                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                                    >
                                                                        {actionLoading[trip.id] ? '...' : '✅ COMPLETE'}
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        
                                                        {(trip.status === 'in_process' || trip.status === 'in_progress') && (
                                                            <button 
                                                                onClick={() => handleCompleteTrip(trip.id)}
                                                                disabled={actionLoading[trip.id]}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                            >
                                                                {actionLoading[trip.id] ? 'Completing...' : '✅ COMPLETE'}
                                                            </button>
                                                        )}
                                                        
                                                        {trip.status === 'completed' && (
                                                            <span className="text-green-600 text-xs">
                                                                ✅ Completed
                                                            </span>
                                                        )}
                                                        
                                                        {trip.status === 'cancelled' && (
                                                            <span className="text-red-600 text-xs">
                                                                ❌ Cancelled
                                                            </span>
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
                                <div className="text-gray-400 text-6xl mb-4">👤</div>
                                <p className="text-gray-500 text-lg">No individual trips found</p>
                                <p className="text-gray-400 text-sm">
                                    {statusFilter !== 'all' ? 
                                        'Try adjusting your filters to see more trips.' :
                                        'Trips from individual booking applications will appear here.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Driver Assignment Modal */}
            {showDriverAssignModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Assign Driver to Trip
                            </h3>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Driver:
                                </label>
                                <select
                                    value={selectedDriverId}
                                    onChange={(e) => setSelectedDriverId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="">Choose a driver...</option>
                                    {availableDrivers.map(driver => (
                                        <option key={driver.id} value={driver.id}>
                                            {driver.first_name} {driver.last_name}
                                            {driver.phone_number && ` • ${driver.phone_number}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={closeDriverAssignModal}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDriverAssignment}
                                    disabled={!selectedDriverId || assignmentLoading}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {assignmentLoading ? 'Assigning...' : 'Assign Driver'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
