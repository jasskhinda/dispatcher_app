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
                                    <label className="text-sm font-medium text-gray-700">Status:</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                                Client Information
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
                                                    {trip.price && (
                                                        <div className="text-xs text-green-600 font-medium mt-1">
                                                            ${parseFloat(trip.price).toFixed(2)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                        <div className="text-sm font-medium text-gray-900 mb-2">
                                                            👤 {getClientDisplayName(trip)}
                                                        </div>
                                                        {trip.user_profile && (
                                                            <div className="space-y-1">
                                                                {trip.user_profile.email && (
                                                                    <div className="text-xs text-gray-600 flex items-center">
                                                                        <span className="text-blue-600 mr-1">📧</span>
                                                                        {trip.user_profile.email}
                                                                    </div>
                                                                )}
                                                                {trip.user_profile.phone_number && (
                                                                    <div className="text-xs text-gray-600 flex items-center">
                                                                        <span className="text-green-600 mr-1">📞</span>
                                                                        {trip.user_profile.phone_number}
                                                                    </div>
                                                                )}
                                                                {trip.user_profile.address && (
                                                                    <div className="text-xs text-gray-600 flex items-center">
                                                                        <span className="text-purple-600 mr-1">📍</span>
                                                                        <span className="truncate" title={trip.user_profile.address}>
                                                                            {trip.user_profile.address.length > 30 ? 
                                                                                `${trip.user_profile.address.substring(0, 30)}...` : 
                                                                                trip.user_profile.address
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-2 inline-block">
                                                            📱 Individual Booking
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                                                        {trip.status === 'pending' ? 'Waiting for Approval' : 
                                                         trip.status === 'approved_pending_payment' ? 'Approved - Processing Payment' :
                                                         trip.status === 'paid_in_progress' ? 'Paid & In Progress' :
                                                         trip.status === 'payment_failed' ? 'Payment Failed - Retry Required' :
                                                         trip.status === 'completed' ? 'Completed' :
                                                         trip.status === 'cancelled' ? 'Cancelled' :
                                                         trip.status === 'upcoming' ? 'Approved - Ready to Start' :
                                                         trip.status === 'in_process' ? 'In Process' :
                                                         trip.status}
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
                                                                    {actionLoading[trip.id] ? 'Approving...' : 'APPROVE'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'reject')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                                                                >
                                                                    {actionLoading[trip.id] ? 'Processing...' : 'REJECT'}
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {trip.status === 'approved_pending_payment' && (
                                                            <>
                                                                <div className="text-blue-600 text-sm bg-blue-100 px-3 py-2 rounded-md flex items-center">
                                                                    💳 Processing payment...
                                                                </div>
                                                                <button
                                                                    onClick={() => router.push(`/billing/individual-invoice?trip_id=${trip.id}`)}
                                                                    className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 shadow-sm"
                                                                >
                                                                    📄 INVOICE DETAILS
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {trip.status === 'paid_in_progress' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'complete')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                                                                >
                                                                    {actionLoading[trip.id] ? 'Completing...' : 'COMPLETE'}
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/billing/individual-invoice?trip_id=${trip.id}`)}
                                                                    className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 shadow-sm"
                                                                >
                                                                    💳 INVOICE DETAILS
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {trip.status === 'payment_failed' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleSendReminder(trip.id)}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                                                                >
                                                                    {actionLoading[trip.id] ? 'Sending...' : '📧 SEND PAYMENT REMINDER'}
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/billing/individual-invoice?trip_id=${trip.id}`)}
                                                                    className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 shadow-sm"
                                                                >
                                                                    📄 INVOICE DETAILS
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {trip.status === 'upcoming' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'complete')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                                                                >
                                                                    {actionLoading[trip.id] ? 'Completing...' : 'COMPLETE'}
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/billing/individual-invoice?trip_id=${trip.id}`)}
                                                                    className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 shadow-sm"
                                                                >
                                                                    📄 INVOICE DETAILS
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {trip.status === 'in_process' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleTripAction(trip.id, 'complete')}
                                                                    disabled={actionLoading[trip.id]}
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                                                                >
                                                                    {actionLoading[trip.id] ? 'Completing...' : 'COMPLETE'}
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/billing/individual-invoice?trip_id=${trip.id}`)}
                                                                    className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 shadow-sm"
                                                                >
                                                                    📄 INVOICE DETAILS
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {trip.status === 'completed' && (
                                                            <div className="text-green-600 text-sm bg-green-100 px-3 py-2 rounded-md flex items-center">
                                                                ✅ Trip Completed
                                                            </div>
                                                        )}
                                                        
                                                        {trip.status === 'cancelled' && (
                                                            <div className="text-red-600 text-sm bg-red-100 px-3 py-2 rounded-md flex items-center">
                                                                ❌ Trip Cancelled
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
        </div>
    );
}
