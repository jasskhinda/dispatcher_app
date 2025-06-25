'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

// Enhanced Dispatcher Dashboard with Monthly Filtering and Payment Status Management
export default function DispatcherFacilityDashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [facilityData, setFacilityData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [error, setError] = useState(null);
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
    
    const router = useRouter();
    const supabase = createClientComponentClient();

    // Generate month options for the past 12 months
    const generateMonthOptions = () => {
        const months = [];
        const now = new Date();
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const displayStr = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            months.push({ value: monthStr, label: displayStr });
        }
        
        return months;
    };

    const monthOptions = generateMonthOptions();

    useEffect(() => {
        // Set current month as default
        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(currentMonth);
    }, []);

    useEffect(() => {
        async function fetchFacilityDashboardData() {
            if (!selectedMonth) return;

            try {
                console.log('🔍 Fetching facility dashboard data for month:', selectedMonth);
                setLoading(true);

                // Check authentication
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError || !session) {
                    router.push('/login');
                    return;
                }

                setUser(session.user);

                // Parse selected month
                const [year, month] = selectedMonth.split('-');
                const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
                
                const startISO = startDate.toISOString();
                const endISO = endDate.toISOString();

                console.log(`📅 Fetching data for ${selectedMonth} (${startISO} to ${endISO})`);

                // Get all facilities
                const { data: facilities, error: facilitiesError } = await supabase
                    .from('facilities')
                    .select('id, name, contact_email, billing_email, phone_number, address')
                    .order('name');

                if (facilitiesError) {
                    console.error('Error fetching facilities:', facilitiesError);
                    setError('Failed to fetch facilities');
                    setLoading(false);
                    return;
                }

                console.log(`✅ Found ${facilities?.length || 0} facilities`);

                // Get payment status for all facilities for this month
                const { data: paymentStatuses, error: paymentError } = await supabase
                    .from('facility_payment_status')
                    .select('*')
                    .eq('invoice_month', parseInt(month))
                    .eq('invoice_year', parseInt(year));

                if (paymentError && paymentError.code !== 'PGRST116') {
                    console.log('Warning: Could not fetch payment statuses:', paymentError);
                }

                // Get trip counts and totals for each facility for this month
                const facilityPromises = facilities.map(async (facility) => {
                    const { data: trips, error: tripsError } = await supabase
                        .from('trips')
                        .select('id, price, status')
                        .eq('facility_id', facility.id)
                        .gte('pickup_time', startISO)
                        .lte('pickup_time', endISO)
                        .in('status', ['completed', 'upcoming', 'pending', 'confirmed']);

                    if (tripsError) {
                        console.error(`Error fetching trips for facility ${facility.id}:`, tripsError);
                        return null;
                    }

                    const billableTrips = trips?.filter(trip => trip.status === 'completed' && trip.price > 0) || [];
                    const totalAmount = billableTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
                    
                    // Find payment status for this facility
                    const paymentStatus = paymentStatuses?.find(ps => ps.facility_id === facility.id);

                    return {
                        ...facility,
                        tripCount: trips?.length || 0,
                        billableTrips: billableTrips.length,
                        totalAmount,
                        paymentStatus: paymentStatus || null,
                        monthYear: { month: parseInt(month), year: parseInt(year) }
                    };
                });

                const facilityResults = await Promise.all(facilityPromises);
                const validFacilities = facilityResults.filter(f => f !== null);

                console.log(`✅ Processed ${validFacilities.length} facilities with trip data`);
                setFacilityData(validFacilities);
                setLoading(false);

            } catch (err) {
                console.error('Error fetching facility dashboard data:', err);
                setError(`Failed to load dashboard: ${err.message}`);
                setLoading(false);
            }
        }

        if (selectedMonth) {
            fetchFacilityDashboardData();
        }
    }, [selectedMonth, router, supabase]);

    // Filter facilities based on payment status
    const filteredFacilities = facilityData.filter(facility => {
        if (filterPaymentStatus === 'all') return true;
        if (filterPaymentStatus === 'paid') return facility.paymentStatus?.status === 'PAID';
        if (filterPaymentStatus === 'unpaid') return !facility.paymentStatus || facility.paymentStatus.status !== 'PAID';
        return true;
    });

    // Calculate summary statistics
    const totalFacilities = facilityData.length;
    const paidFacilities = facilityData.filter(f => f.paymentStatus?.status === 'PAID').length;
    const unpaidFacilities = totalFacilities - paidFacilities;
    const totalRevenue = facilityData.reduce((sum, f) => sum + f.totalAmount, 0);
    const paidRevenue = facilityData.filter(f => f.paymentStatus?.status === 'PAID').reduce((sum, f) => sum + f.totalAmount, 0);

    // Toggle payment status for a facility
    const handleTogglePaymentStatus = async (facility) => {
        try {
            const newStatus = facility.paymentStatus?.status === 'PAID' ? 'UNPAID' : 'PAID';
            const now = new Date().toISOString();

            const paymentData = {
                facility_id: facility.id,
                invoice_month: facility.monthYear.month,
                invoice_year: facility.monthYear.year,
                total_amount: facility.totalAmount,
                status: newStatus,
                payment_date: newStatus === 'PAID' ? now : null,
                updated_at: now
            };

            const { data, error } = await supabase
                .from('facility_payment_status')
                .upsert([paymentData], {
                    onConflict: 'facility_id,invoice_month,invoice_year'
                })
                .select()
                .single();

            if (error) {
                console.error('Error updating payment status:', error);
                setError('Failed to update payment status');
            } else {
                // Update local state
                setFacilityData(prev => prev.map(f => 
                    f.id === facility.id 
                        ? { ...f, paymentStatus: data }
                        : f
                ));
            }
        } catch (err) {
            console.error('Error toggling payment status:', err);
            setError('Failed to update payment status');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-blue-600 text-6xl mb-4">⏳</div>
                    <h1 className="text-xl font-bold text-gray-900 mb-4">Loading Dispatcher Dashboard</h1>
                    <p className="text-gray-600">Fetching facility billing data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Dashboard Error</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Facility Billing Dashboard</h1>
                            <p className="text-sm text-gray-500">Monthly invoice management and payment tracking</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Month Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {monthOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Payment Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                                <select
                                    value={filterPaymentStatus}
                                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Facilities</option>
                                    <option value="paid">Paid Only</option>
                                    <option value="unpaid">Unpaid Only</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-3xl text-blue-600 mr-4">🏥</div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Facilities</p>
                                <p className="text-2xl font-bold text-gray-900">{totalFacilities}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-3xl text-green-600 mr-4">✅</div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                                <p className="text-2xl font-bold text-green-600">{paidFacilities}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-3xl text-yellow-600 mr-4">💰</div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Unpaid Invoices</p>
                                <p className="text-2xl font-bold text-yellow-600">{unpaidFacilities}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-3xl text-purple-600 mr-4">💳</div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-purple-600">${totalRevenue.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">Paid: ${paidRevenue.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Facilities Table */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            Facility Invoices for {monthOptions.find(m => m.value === selectedMonth)?.label}
                        </h3>
                        <p className="text-sm text-gray-500">
                            Showing {filteredFacilities.length} of {totalFacilities} facilities
                        </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Facility
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Trips
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payment Status
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredFacilities.map((facility, index) => (
                                    <tr key={facility.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{facility.name}</div>
                                                <div className="text-sm text-gray-500">{facility.billing_email || facility.contact_email}</div>
                                                {facility.phone_number && (
                                                    <div className="text-xs text-gray-400">📞 {facility.phone_number}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                <span className="font-medium">{facility.tripCount}</span> total
                                            </div>
                                            <div className="text-xs text-green-600">
                                                {facility.billableTrips} billable
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                ${facility.totalAmount.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleTogglePaymentStatus(facility)}
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                                    facility.paymentStatus?.status === 'PAID'
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                }`}
                                            >
                                                {facility.paymentStatus?.status === 'PAID' ? '✅ PAID' : '💰 UNPAID'}
                                            </button>
                                            {facility.paymentStatus?.payment_date && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Paid: {new Date(facility.paymentStatus.payment_date).toLocaleDateString('en-US')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <a
                                                    href={`/invoice/facility-monthly/${facility.id}-${selectedMonth}`}
                                                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    📄 View Invoice
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredFacilities.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">📊</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities found</h3>
                            <p className="text-gray-500">
                                {filterPaymentStatus === 'all' 
                                    ? 'No facilities have trips for this month.' 
                                    : `No facilities match the ${filterPaymentStatus} payment status filter.`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
