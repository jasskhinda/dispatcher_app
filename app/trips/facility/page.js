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
            
            // Fetch trips with facility information using JOIN (with cache busting)
            console.log('🔧 Fetching trips with facility information using JOIN...');
            const { data: tripsData, error: tripsError } = await supabase
                .from('trips')
                .select(`
                    *,
                    facilities!inner(
                        id,
                        name,
                        address,
                        contact_email,
                        phone_number,
                        billing_email,
                        facility_type
                    )
                `)
                .not('facility_id', 'is', null)
                .order('created_at', { ascending: false });

            if (tripsError) {
                console.error('❌ Trips query error:', tripsError);
                throw tripsError;
            }

            console.log(`✅ Found ${tripsData?.length || 0} facility trips`);
            
            // Debug: Check trip date ranges
            if (tripsData && tripsData.length > 0) {
                const tripDates = tripsData.map(trip => ({
                    id: trip.id,
                    pickup_time: trip.pickup_time,
                    created_at: trip.created_at,
                    status: trip.status,
                    price: trip.price
                }));
                console.log('🗓️ Trip date range analysis:');
                console.log('   First trip:', tripDates[tripDates.length - 1]);
                console.log('   Latest trip:', tripDates[0]);
                console.log('   Sample trips:', tripDates.slice(0, 3));
            }

            if (!tripsData || tripsData.length === 0) {
                console.log('⚠️ No facility trips found');
                setFacilityStats([]);
                setFacilities([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Facility data is now included in the trips data via JOIN
            console.log('✅ Facility data included via JOIN - no separate fetch needed');

            // Group trips by facility_id to build facility information
            const facilityTripsMap = {};
            tripsData.forEach(trip => {
                if (!facilityTripsMap[trip.facility_id]) {
                    facilityTripsMap[trip.facility_id] = [];
                }
                facilityTripsMap[trip.facility_id].push(trip);
            });

            console.log('🏗️ Building facility overview from', Object.keys(facilityTripsMap).length, 'facilities');

            // Create facility stats for each facility
            const facilityStatsResults = Object.entries(facilityTripsMap).map(([facilityId, facilityTrips]) => {
                // Get facility details from the first trip's joined data
                const facilityDetails = facilityTrips[0]?.facilities;
                console.log(`🔍 Processing facility ${facilityId}:`, facilityDetails ? `Found: ${facilityDetails.name}` : 'Not found in joined data');
                
                // Enhanced debugging for data accuracy
                console.log(`\n🏥 FACILITY ${facilityId} ANALYSIS:`);
                console.log(`   Total trips found: ${facilityTrips.length}`);
                
                // Detailed status breakdown with debugging
                const statusCounts = {};
                facilityTrips.forEach(trip => {
                    const status = trip.status || 'unknown';
                    statusCounts[status] = (statusCounts[status] || 0) + 1;
                });
                console.log('   Status breakdown:', statusCounts);
                
                // Log any unusual statuses for debugging
                const knownStatuses = ['pending', 'upcoming', 'completed', 'confirmed', 'cancelled'];
                const unknownStatuses = Object.keys(statusCounts).filter(status => !knownStatuses.includes(status));
                if (unknownStatuses.length > 0) {
                    console.log(`   ⚠️ Unknown statuses found:`, unknownStatuses);
                    unknownStatuses.forEach(status => {
                        const tripsWithThisStatus = facilityTrips.filter(trip => trip.status === status);
                        console.log(`     - "${status}": ${tripsWithThisStatus.length} trips`);
                        if (tripsWithThisStatus.length > 0) {
                            console.log(`       Sample trip:`, {
                                id: tripsWithThisStatus[0].id,
                                pickup_time: tripsWithThisStatus[0].pickup_time,
                                created_at: tripsWithThisStatus[0].created_at
                            });
                        }
                    });
                }
                
                // Get unique clients for this facility
                const uniqueClientIds = [...new Set(facilityTrips.map(trip => trip.managed_client_id || trip.user_id).filter(Boolean))];
                console.log(`   Unique clients: ${uniqueClientIds.length}`);
                
                // Calculate trip statistics with enhanced accuracy
                const totalTrips = facilityTrips.length;
                const pendingTrips = facilityTrips.filter(trip => trip.status === 'pending').length;
                const upcomingTrips = facilityTrips.filter(trip => trip.status === 'upcoming').length;
                const inProcessTrips = facilityTrips.filter(trip => trip.status === 'in_process').length;
                const completedTrips = facilityTrips.filter(trip => trip.status === 'completed').length;
                const confirmedTrips = facilityTrips.filter(trip => trip.status === 'confirmed').length;
                const cancelledTrips = facilityTrips.filter(trip => trip.status === 'cancelled').length;
                const otherTrips = facilityTrips.filter(trip => 
                    !['pending', 'upcoming', 'in_process', 'completed', 'confirmed', 'cancelled'].includes(trip.status)
                ).length;
                
                // FIXED: Match facility app billing logic - only completed trips with valid prices
                const billableTrips = facilityTrips.filter(trip => 
                    trip.status === 'completed' && 
                    trip.price && 
                    parseFloat(trip.price) > 0
                );
                
                const totalAmount = billableTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
                
                console.log(`   Completed trips: ${completedTrips}`);
                console.log(`   Billable trips: ${billableTrips.length}`);
                console.log(`   Total billable amount: $${totalAmount.toFixed(2)}`);
                
                // Debug individual billable trips
                if (billableTrips.length > 0) {
                    console.log('   Billable trip details:');
                    billableTrips.forEach(trip => {
                        const date = trip.pickup_time ? new Date(trip.pickup_time).toLocaleDateString() : 'No date';
                        console.log(`     - ${date}: $${trip.price} (${trip.id})`);
                    });
                }

                // Use facility name from facilities table or fallback
                let facilityName = facilityDetails?.name;
                if (!facilityName) {
                    // Only use fallback logic if we truly cannot get the facility name
                    facilityName = `Healthcare Facility ${facilityId.substring(0, 8)}...`;
                }

                const result = {
                    id: facilityId,
                    name: facilityName,
                    address: facilityDetails?.address || 'Address not available',
                    contact_email: facilityDetails?.contact_email || 'Email not available',
                    billing_email: facilityDetails?.billing_email || 'billing@compassionatecaretransportation.com',
                    phone_number: facilityDetails?.phone_number || 'Phone not available',
                    clientCount: uniqueClientIds.length,
                    totalTrips,
                    pendingTrips,
                    upcomingTrips,
                    inProcessTrips,
                    completedTrips,
                    confirmedTrips,
                    cancelledTrips,
                    otherTrips,
                    statusBreakdown: statusCounts, // Add detailed status breakdown
                    totalAmount
                };
                
                console.log('   Final facility stats:', result);
                return result;
            });

            console.log('✅ Facility stats calculated:', facilityStatsResults);
            
            // Debug: Check for data accuracy with facility app
            const carebridgeFacility = facilityStatsResults.find(f => f.name.includes('CareBridge'));
            if (carebridgeFacility) {
                console.log('\n🔍 DATA ACCURACY CHECK:');
                console.log(`Expected: 14 trips, $676.80 (from facility app)`);
                console.log(`Actual: ${carebridgeFacility.totalTrips} trips, $${carebridgeFacility.totalAmount.toFixed(2)}`);
                
                const tripsDiff = carebridgeFacility.totalTrips - 14;
                const amountDiff = carebridgeFacility.totalAmount - 676.80;
                
                if (Math.abs(tripsDiff) > 0 || Math.abs(amountDiff) > 0.01) {
                    console.log(`⚠️ Discrepancy detected - trips: ${tripsDiff}, amount: $${amountDiff.toFixed(2)}`);
                } else {
                    console.log('✅ Data matches facility app!');
                }
            }
            
            setFacilities(facilityStatsResults);
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

    // Validate data accuracy against facility app expectations
    const validateDataAccuracy = (facilityStats) => {
        const carebridgeFacility = facilityStats.find(f => f.name.includes('CareBridge'));
        if (carebridgeFacility) {
            console.log('\n🔍 DATA ACCURACY VALIDATION:');
            console.log('Expected (from facility app): 14 trips, $676.80');
            console.log(`Actual (dispatcher app): ${carebridgeFacility.totalTrips} trips, $${carebridgeFacility.totalAmount.toFixed(2)}`);
            
            const tripsDiff = carebridgeFacility.totalTrips - 14;
            const amountDiff = carebridgeFacility.totalAmount - 676.80;
            
            if (Math.abs(tripsDiff) > 0) {
                console.log(`⚠️ Trip count discrepancy: ${tripsDiff > 0 ? '+' : ''}${tripsDiff}`);
            }
            if (Math.abs(amountDiff) > 0.01) {
                console.log(`⚠️ Amount discrepancy: ${amountDiff > 0 ? '+' : ''}$${amountDiff.toFixed(2)}`);
            }
            
            if (Math.abs(tripsDiff) <= 0 && Math.abs(amountDiff) <= 0.01) {
                console.log('✅ Data matches facility app expectations!');
            } else {
                console.log('🔧 Data needs adjustment to match facility app');
            }
        }
    };

    // Test database connection and basic operations
    const testDatabaseConnection = async () => {
        try {
            console.log('🔌 Testing database connection...');
            
            // Test 1: Simple query to facilities table (fixed syntax)
            const { data: testQuery, error: testError } = await supabase
                .from('facilities')
                .select('id, name')
                .limit(5);
            
            if (testError) {
                console.error('❌ Database query failed:', testError);
                alert('Database connection failed: ' + testError.message);
                return;
            }
            
            console.log('✅ Database connection works!', testQuery);
            console.log(`📊 Found ${testQuery?.length || 0} existing facilities`);
            
            if (testQuery && testQuery.length > 0) {
                alert(`Database connection successful! Found ${testQuery.length} existing facilities. Check console for details.`);
                console.log('🏥 Existing facilities:', testQuery);
                
                // Just refresh the display since facilities already exist
                await fetchFacilityOverview();
            } else {
                alert('Database connection works but no facilities found. Will need to create test data.');
            }
            
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
        inProcessTrips: facilityStats.reduce((sum, f) => sum + (f.inProcessTrips || 0), 0),
        completedTrips: facilityStats.reduce((sum, f) => sum + f.completedTrips, 0),
        confirmedTrips: facilityStats.reduce((sum, f) => sum + (f.confirmedTrips || 0), 0),
        cancelledTrips: facilityStats.reduce((sum, f) => sum + (f.cancelledTrips || 0), 0),
        otherTrips: facilityStats.reduce((sum, f) => sum + (f.otherTrips || 0), 0),
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
            
            // Since we're having RLS issues, let's try a different approach
            // Instead of creating facilities, let's create a demo with mock data
            console.log('💡 Due to RLS restrictions, creating demo data with mock facilities...');
            
            // Create mock facility data for demonstration
            const mockFacilities = [
                {
                    id: 'demo-facility-1',
                    name: 'CareBridge Living (Demo)',
                    address: '123 Healthcare Drive, Toronto, ON M5V 3A8',
                    contact_email: 'admin@carebridge.com',
                    billing_email: 'billing@carebridge.com',
                    phone_number: '(416) 555-0123',
                    clientCount: 5,
                    totalTrips: 12,
                    pendingTrips: 3,
                    upcomingTrips: 4,
                    completedTrips: 5,
                    totalAmount: 650.00
                },
                {
                    id: 'demo-facility-2',
                    name: 'Sunset Senior Care (Demo)',
                    address: '456 Sunset Boulevard, Toronto, ON M6H 2K9',
                    contact_email: 'info@sunsetcare.com',
                    billing_email: 'billing@sunsetcare.com',
                    phone_number: '(416) 555-0456',
                    clientCount: 8,
                    totalTrips: 18,
                    pendingTrips: 2,
                    upcomingTrips: 6,
                    completedTrips: 10,
                    totalAmount: 890.00
                },
                {
                    id: 'demo-facility-3',
                    name: 'Maple Grove Medical (Demo)',
                    address: '789 Maple Street, Toronto, ON M4B 1X2',
                    contact_email: 'contact@maplegrove.com',
                    billing_email: 'billing@maplegrove.com',
                    phone_number: '(416) 555-0789',
                    clientCount: 12,
                    totalTrips: 25,
                    pendingTrips: 5,
                    upcomingTrips: 8,
                    completedTrips: 12,
                    totalAmount: 1240.00
                }
            ];
            
            console.log('✅ Demo facilities created:', mockFacilities.length);
            
            // Set the mock data directly
            setFacilities(mockFacilities);
            setFacilityStats(mockFacilities);
            
            // Show success message
            setError(null);
            console.log('🎉 Demo multi-facility overview is now displayed!');
            console.log('💡 This demonstrates the functionality with mock data.');
            console.log('🔧 To use real data, the RLS policies need to be updated to allow dispatcher access to facilities.');
            
        } catch (err) {
            console.error('💥 Error creating demo facilities:', err);
            setError('Failed to create demo facilities: ' + err.message);
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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

                    {/* Show additional status cards only if they have values */}
                    {overallStats.confirmedTrips > 0 && (
                        <div className="bg-white rounded-lg shadow p-6 text-center">
                            <div className="text-3xl font-bold text-teal-600 mb-2">{overallStats.confirmedTrips}</div>
                            <div className="text-sm font-medium text-gray-700">Confirmed</div>
                            <div className="text-xs text-gray-500 mt-1">Ready for pickup</div>
                        </div>
                    )}

                    {overallStats.inProcessTrips > 0 && (
                        <div className="bg-white rounded-lg shadow p-6 text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-2">{overallStats.inProcessTrips}</div>
                            <div className="text-sm font-medium text-gray-700">In Process</div>
                            <div className="text-xs text-gray-500 mt-1">Paid & Active</div>
                        </div>
                    )}

                    {overallStats.cancelledTrips > 0 && (
                        <div className="bg-white rounded-lg shadow p-6 text-center">
                            <div className="text-3xl font-bold text-red-600 mb-2">{overallStats.cancelledTrips}</div>
                            <div className="text-sm font-medium text-gray-700">Cancelled</div>
                            <div className="text-xs text-gray-500 mt-1">Not completed</div>
                        </div>
                    )}

                    {overallStats.otherTrips > 0 && (
                        <div className="bg-white rounded-lg shadow p-6 text-center">
                            <div className="text-3xl font-bold text-purple-600 mb-2">{overallStats.otherTrips}</div>
                            <div className="text-sm font-medium text-gray-700">Other Status</div>
                            <div className="text-xs text-gray-500 mt-1">Various statuses</div>
                        </div>
                    )}
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

                {/* Detailed Status Breakdown - Only show if there are multiple facilities or complex statuses */}
                {facilityStats.some(f => f.statusBreakdown && Object.keys(f.statusBreakdown).length > 3) && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Detailed Status Breakdown</h3>
                        <div className="space-y-4">
                            {facilityStats.map((facility) => {
                                if (!facility.statusBreakdown || Object.keys(facility.statusBreakdown).length <= 3) return null;
                                
                                return (
                                    <div key={facility.id} className="border-l-4 border-blue-500 pl-4">
                                        <h4 className="font-medium text-gray-900 mb-2">🏥 {facility.name}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(facility.statusBreakdown).map(([status, count]) => {
                                                const statusColors = {
                                                    'pending': 'bg-yellow-100 text-yellow-800',
                                                    'upcoming': 'bg-blue-100 text-blue-800',
                                                    'in_process': 'bg-blue-600 text-white',
                                                    'completed': 'bg-green-100 text-green-800',
                                                    'confirmed': 'bg-teal-100 text-teal-800',
                                                    'cancelled': 'bg-red-100 text-red-800',
                                                    'draft': 'bg-gray-100 text-gray-800',
                                                    'scheduled': 'bg-indigo-100 text-indigo-800',
                                                    'in_progress': 'bg-orange-100 text-orange-800'
                                                };
                                                const colorClass = statusColors[status] || 'bg-purple-100 text-purple-800';
                                                
                                                return (
                                                    <span key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                                                        {count} {status.replace('_', ' ')}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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
                                                    <div className="grid grid-cols-4 gap-1 text-xs">
                                                        <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-center">
                                                            <div className="font-bold">{facility.pendingTrips}</div>
                                                            <div>Pending</div>
                                                        </div>
                                                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center">
                                                            <div className="font-bold">{facility.upcomingTrips}</div>
                                                            <div>Upcoming</div>
                                                        </div>
                                                        {facility.inProcessTrips > 0 && (
                                                            <div className="bg-blue-600 text-white px-2 py-1 rounded text-center">
                                                                <div className="font-bold">{facility.inProcessTrips}</div>
                                                                <div>In Process</div>
                                                            </div>
                                                        )}
                                                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-center">
                                                            <div className="font-bold">{facility.completedTrips}</div>
                                                            <div>Completed</div>
                                                        </div>
                                                        {facility.confirmedTrips > 0 && (
                                                            <div className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-center">
                                                                <div className="font-bold">{facility.confirmedTrips}</div>
                                                                <div>Confirmed</div>
                                                            </div>
                                                        )}
                                                        {facility.cancelledTrips > 0 && (
                                                            <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-center">
                                                                <div className="font-bold">{facility.cancelledTrips}</div>
                                                                <div>Cancelled</div>
                                                            </div>
                                                        )}
                                                        {facility.otherTrips > 0 && (
                                                            <div 
                                                                className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-center cursor-help" 
                                                                title={facility.statusBreakdown ? `Other statuses: ${Object.entries(facility.statusBreakdown).filter(([status]) => !['pending', 'upcoming', 'in_process', 'completed', 'confirmed', 'cancelled'].includes(status)).map(([status, count]) => `${count} ${status}`).join(', ')}` : 'Other statuses'}
                                                            >
                                                                <div className="font-bold">{facility.otherTrips}</div>
                                                                <div>Other</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Show detailed breakdown if there are unusual statuses */}
                                                    {facility.statusBreakdown && Object.keys(facility.statusBreakdown).some(status => !['pending', 'upcoming', 'in_process', 'completed', 'confirmed', 'cancelled'].includes(status)) && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                                            <div className="text-xs text-gray-600 font-medium mb-1">Detailed Status:</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {Object.entries(facility.statusBreakdown)
                                                                    .filter(([status]) => !['pending', 'upcoming', 'in_process', 'completed', 'confirmed', 'cancelled'].includes(status))
                                                                    .map(([status, count]) => (
                                                                        <span 
                                                                            key={status} 
                                                                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                                                        >
                                                                            {count} {status.replace('_', ' ')}
                                                                        </span>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    )}
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
                                                        Invoice $ Trips
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
                                            {refreshing ? 'Creating Demo Data...' : '🎭 Create Demo Multi-Facility View'}
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
