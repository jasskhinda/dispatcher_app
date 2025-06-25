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
            setError(null);
            
            // First, let's check if the facilities table exists and get some debug info
            console.log('🔧 DEBUG: Checking database connection...');
            
            // Fetch all facilities with enhanced debugging
            console.log('🔧 DEBUG: Querying facilities table...');
            const { data: facilitiesData, error: facilitiesError } = await supabase
                .from('facilities')
                .select('id, name, address, contact_email, phone_number, billing_email')
                .order('name', { ascending: true });

            if (facilitiesError) {
                console.error('❌ Facilities query error:', facilitiesError);
                throw facilitiesError;
            }

            console.log(`✅ Found ${facilitiesData?.length || 0} facilities`);
            console.log('🔧 DEBUG: Facility data:', facilitiesData);
            setFacilities(facilitiesData || []);

            // Fetch all facility trips with enhanced debugging
            console.log('🔧 DEBUG: Querying trips table...');
            const { data: tripsData, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .not('facility_id', 'is', null)
                .order('created_at', { ascending: false });

            if (tripsError) {
                console.error('❌ Trips query error:', tripsError);
                throw tripsError;
            }

            console.log(`✅ Found ${tripsData?.length || 0} facility trips`);
            console.log('🔧 DEBUG: Sample trip data:', tripsData?.slice(0, 2));
            
            // If no facilities found, show helpful message
            if (!facilitiesData || facilitiesData.length === 0) {
                console.log('⚠️ No facilities found in database');
                console.log('💡 This might be because:');
                console.log('   1. No facilities have been created yet');
                console.log('   2. Database connection issue');
                console.log('   3. Table doesn\'t exist');
                
                // Still continue to show empty state properly
                setFacilityStats([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

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

    // Test database connection and basic operations
    const testDatabaseConnection = async () => {
        try {
            console.log('🔌 Testing database connection...');
            
            // Test 1: Simple query to facilities table
            const { data: testQuery, error: testError } = await supabase
                .from('facilities')
                .select('count(*)')
                .limit(1);
            
            if (testError) {
                console.error('❌ Database query failed:', testError);
                alert('Database connection failed: ' + testError.message);
                return;
            }
            
            console.log('✅ Database connection works!', testQuery);
            
            // Test 2: Try to insert a single test facility
            console.log('📝 Testing facility insertion...');
            const testFacility = {
                name: 'Test Facility ' + Date.now(),
                address: '123 Test Street',
                contact_email: 'test@example.com',
                phone_number: '555-0123'
            };
            
            const { data: insertResult, error: insertError } = await supabase
                .from('facilities')
                .insert([testFacility])
                .select()
                .single();
            
            if (insertError) {
                console.error('❌ Insert failed:', insertError);
                alert('Insert failed: ' + insertError.message);
                return;
            }
            
            console.log('✅ Insert successful!', insertResult);
            alert('Database test successful! Check console for details.');
            
            // Clean up by refreshing data
            await fetchFacilityOverview();
            
        } catch (err) {
            console.error('💥 Test failed:', err);
            alert('Test failed: ' + err.message);
        }
    };

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

    const createTestFacilities = async () => {
        try {
            console.log('🔄 Create Test Facilities button clicked!');
            setRefreshing(true);
            setError(null);
            console.log('🏗️ Creating test facilities...');
            
            const testFacilities = [
                {
                    name: 'CareBridge Living',
                    address: '123 Healthcare Drive, Toronto, ON M5V 3A8',
                    contact_email: 'admin@carebridge.com',
                    billing_email: 'billing@carebridge.com',
                    phone_number: '(416) 555-0123'
                },
                {
                    name: 'Sunset Senior Care',
                    address: '456 Sunset Boulevard, Toronto, ON M6H 2K9',
                    contact_email: 'info@sunsetcare.com',
                    billing_email: 'billing@sunsetcare.com',
                    phone_number: '(416) 555-0456'
                },
                {
                    name: 'Maple Grove Medical Center',
                    address: '789 Maple Street, Toronto, ON M4B 1X2',
                    contact_email: 'contact@maplegrove.com',
                    billing_email: 'billing@maplegrove.com',
                    phone_number: '(416) 555-0789'
                }
            ];
            
            console.log('📝 About to create facilities:', testFacilities.length);
            
            for (const facilityData of testFacilities) {
                console.log(`📝 Creating facility: ${facilityData.name}...`);
                
                const { data: newFacility, error: createError } = await supabase
                    .from('facilities')
                    .insert([facilityData])
                    .select()
                    .single();
                
                if (createError) {
                    console.error(`❌ Error creating ${facilityData.name}:`, createError);
                    throw new Error(`Failed to create ${facilityData.name}: ${createError.message}`);
                } else {
                    console.log(`✅ Created: ${newFacility.name} with ID: ${newFacility.id}`);
                    
                    // Create a few test trips
                    console.log(`📋 Creating trips for ${newFacility.name}...`);
                    const testTrips = [
                        {
                            facility_id: newFacility.id,
                            pickup_address: facilityData.address,
                            destination_address: '999 Hospital Way, Toronto, ON',
                            pickup_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                            status: 'pending',
                            price: 45.00
                        },
                        {
                            facility_id: newFacility.id,
                            pickup_address: facilityData.address,
                            destination_address: '555 Medical Plaza, Toronto, ON',
                            pickup_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                            status: 'completed',
                            price: 50.00
                        }
                    ];
                    
                    for (const tripData of testTrips) {
                        console.log(`📋 Creating trip: ${tripData.status}...`);
                        const { error: tripError } = await supabase.from('trips').insert([tripData]);
                        if (tripError) {
                            console.error(`❌ Error creating trip:`, tripError);
                        } else {
                            console.log(`✅ Created trip: ${tripData.status}`);
                        }
                    }
                }
            }
            
            console.log('🎉 All test data created successfully!');
            
            // Refresh the data
            await fetchFacilityOverview();
            
        } catch (err) {
            console.error('💥 Error creating test facilities:', err);
            setError('Failed to create test facilities: ' + err.message);
        } finally {
            setRefreshing(false);
        }
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
                            {facilityStats.length === 0 && !loading && (
                                <button
                                    onClick={createTestFacilities}
                                    disabled={refreshing}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                                >
                                    {refreshing ? 'Creating...' : '🏗️ Create Test Data'}
                                </button>
                            )}
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
                                <p className="text-gray-500 text-lg mb-2">No facilities found</p>
                                <p className="text-gray-400 text-sm mb-6">
                                    {facilityStats.length === 0 && facilities.length === 0 
                                        ? "No facilities exist in the database yet. Create some test data to get started!"
                                        : "Facilities with trips will appear here."
                                    }
                                </p>
                                {facilityStats.length === 0 && facilities.length === 0 && (
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => {
                                                console.log('🧪 Test button clicked - basic functionality works!');
                                                alert('Button click detected! Check console for details.');
                                            }}
                                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors mb-2"
                                        >
                                            🧪 Test Button Click
                                        </button>
                                        <br />
                                        <button
                                            onClick={testDatabaseConnection}
                                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors mr-2"
                                        >
                                            🔌 Test Database
                                        </button>
                                        <button
                                            onClick={createTestFacilities}
                                            disabled={refreshing}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {refreshing ? 'Creating Test Data...' : '🏗️ Create Test Facilities & Trips'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
