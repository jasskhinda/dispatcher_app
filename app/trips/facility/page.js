'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function FacilityOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [facilities, setFacilities] = useState([]);
    const [facilityStats, setFacilityStats] = useState([]);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        getSession();
    }, []);

    async function getSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/login');
                return;
            }

            setUser(session.user);
            await fetchFacilityOverview();
            
        } catch (err) {
            console.error('Session error:', err);
            setError('Authentication error: ' + err.message);
            setLoading(false);
        }
    }

    async function fetchFacilityOverview() {
        try {
            console.log('🔍 Fetching facility overview...');
            setRefreshing(true);
            
            // Fetch all facilities
            const { data: facilitiesData, error: facilitiesError } = await supabase
                .from('facilities')
                .select('id, name, address, contact_email, phone_number, billing_email')
                .order('name', { ascending: true });

            if (facilitiesError) throw facilitiesError;

            console.log(`✅ Found ${facilitiesData?.length || 0} facilities`);
            setFacilities(facilitiesData || []);

            // Fetch all facility trips
            const { data: tripsData, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .not('facility_id', 'is', null)
                .order('created_at', { ascending: false });

            if (tripsError) throw tripsError;

            console.log(`✅ Found ${tripsData?.length || 0} facility trips`);

            // Get managed clients count for each facility
            const facilityStatsPromises = facilitiesData?.map(async (facility) => {
                const facilityTrips = tripsData?.filter(trip => trip.facility_id === facility.id) || [];
                
                // Get unique clients for this facility
                const uniqueClientIds = [...new Set(facilityTrips.map(trip => trip.managed_client_id || trip.user_id).filter(Boolean))];
                
                // Calculate totals
                const totalTrips = facilityTrips.length;
                const pendingTrips = facilityTrips.filter(trip => trip.status === 'pending').length;
                const upcomingTrips = facilityTrips.filter(trip => trip.status === 'upcoming').length;
                const completedTrips = facilityTrips.filter(trip => trip.status === 'completed').length;
                const totalAmount = facilityTrips
                    .filter(trip => trip.status === 'completed' && trip.price > 0)
                    .reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);

                return {
                    ...facility,
                    clientCount: uniqueClientIds.length,
                    totalTrips,
                    pendingTrips,
                    upcomingTrips,
                    completedTrips,
                    totalAmount
                };
            }) || [];

            const facilityStatsResults = await Promise.all(facilityStatsPromises);
            setFacilityStats(facilityStatsResults);
            
            setLoading(false);
            setRefreshing(false);

        } catch (err) {
            console.error('Error fetching facility overview:', err);
            setError('Failed to load facility overview: ' + err.message);
            setLoading(false);
            setRefreshing(false);
        }
    }

    // Calculate overall statistics
    const overallStats = {
        totalFacilities: facilityStats.length,
        totalTrips: facilityStats.reduce((sum, f) => sum + f.totalTrips, 0),
        pendingTrips: facilityStats.reduce((sum, f) => sum + f.pendingTrips, 0),
        upcomingTrips: facilityStats.reduce((sum, f) => sum + f.upcomingTrips, 0),
        completedTrips: facilityStats.reduce((sum, f) => sum + f.completedTrips, 0),
        totalAmount: facilityStats.reduce((sum, f) => sum + f.totalAmount, 0)
    };

    const handleMonthlyInvoice = (facilityId) => {
        // Generate URL for current month by default
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const monthlyUrl = `/invoice/facility-monthly/${facilityId}-${year}-${month}`;
        router.push(monthlyUrl);
    };

    const handleRefresh = async () => {
        await fetchFacilityOverview();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

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
                            <h1 className="text-3xl font-bold text-gray-900">🏥 Multi-Facility Overview</h1>
                            <p className="mt-2 text-gray-600">
                                Comprehensive dashboard for all facility operations
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                            >
                                {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                            </button>
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
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700">
                        {error}
                    </div>
                )}

                {/* Overall Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">{overallStats.totalFacilities}</div>
                        <div className="text-sm font-medium text-gray-700">Total Facilities</div>
                        <div className="text-xs text-gray-500 mt-1">Active facilities</div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">{overallStats.totalTrips}</div>
                        <div className="text-sm font-medium text-gray-700">Total Trips</div>
                        <div className="text-xs text-gray-500 mt-1">All time</div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-3xl font-bold text-yellow-600 mb-2">{overallStats.pendingTrips}</div>
                        <div className="text-sm font-medium text-gray-700">Pending</div>
                        <div className="text-xs text-gray-500 mt-1">Awaiting approval</div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">{overallStats.upcomingTrips}</div>
                        <div className="text-sm font-medium text-gray-700">Upcoming</div>
                        <div className="text-xs text-gray-500 mt-1">Scheduled</div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">{overallStats.completedTrips}</div>
                        <div className="text-sm font-medium text-gray-700">Completed</div>
                        <div className="text-xs text-gray-500 mt-1">Finished trips</div>
                    </div>
                </div>

                {/* Total Revenue Card */}
                <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg shadow p-6 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">💰 Total Revenue</h3>
                            <div className="text-4xl font-bold">{formatCurrency(overallStats.totalAmount)}</div>
                            <div className="text-green-100 text-sm mt-1">From {overallStats.completedTrips} completed trips</div>
                        </div>
                        <div className="text-6xl opacity-20">💰</div>
                    </div>
                </div>

                {/* Facility Overview Table */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">🏥 Facility Overview</h2>
                        <p className="text-sm text-gray-600 mt-1">Detailed breakdown by facility</p>
                    </div>
                    
                    <div className="p-6">
                        {facilityStats.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Facility
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Clients Associated
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Trips
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status Breakdown
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Amount
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {facilityStats.map((facility) => (
                                            <tr key={facility.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        🏥 {facility.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {facility.address && facility.address.substring(0, 50)}
                                                        {facility.address && facility.address.length > 50 && '...'}
                                                    </div>
                                                    {facility.contact_email && (
                                                        <div className="text-xs text-blue-600 mt-1">
                                                            📧 {facility.contact_email}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {facility.clientCount}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        unique clients
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="text-2xl font-bold text-purple-600">
                                                        {facility.totalTrips}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        total trips
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-center">
                                                            <div className="font-bold">{facility.pendingTrips}</div>
                                                            <div>Pending</div>
                                                        </div>
                                                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center">
                                                            <div className="font-bold">{facility.upcomingTrips}</div>
                                                            <div>Upcoming</div>
                                                        </div>
                                                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-center">
                                                            <div className="font-bold">{facility.completedTrips}</div>
                                                            <div>Completed</div>
                                                        </div>
                                                        <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-center">
                                                            <div className="font-bold">{facility.totalTrips - facility.pendingTrips - facility.upcomingTrips - facility.completedTrips}</div>
                                                            <div>Other</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="text-lg font-bold text-green-600">
                                                        {formatCurrency(facility.totalAmount)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        from completed trips
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => handleMonthlyInvoice(facility.id)}
                                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm mb-2 w-full"
                                                    >
                                                        📄 Monthly Invoice
                                                    </button>
                                                    <div className="text-xs text-gray-500 text-center">
                                                        View current month billing
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
                                <p className="text-gray-500 text-lg">No facilities found</p>
                                <p className="text-gray-400 text-sm">
                                    Facilities with trips will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
