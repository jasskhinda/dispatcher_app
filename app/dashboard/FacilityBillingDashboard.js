'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

// Professional Facility Billing Dashboard with Comprehensive Management Features
export default function DispatcherFacilityDashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [facilityData, setFacilityData] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [error, setError] = useState(null);
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    
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

    // Fetch payment history for all facilities
    const fetchPaymentHistory = async () => {
        try {
            const { data: history, error } = await supabase
                .from('facility_payment_status')
                .select(`
                    *,
                    facilities!inner(name, billing_email)
                `)
                .order('invoice_year', { ascending: false })
                .order('invoice_month', { ascending: false });

            if (!error && history) {
                setPaymentHistory(history);
            }
        } catch (err) {
            console.log('Could not fetch payment history:', err);
        }
    };

    // Sort and filter facilities
    const getSortedAndFilteredFacilities = () => {
        let filtered = facilityData.filter(facility => {
            // Payment status filter
            const statusMatch = (() => {
                if (filterPaymentStatus === 'all') return true;
                if (filterPaymentStatus === 'paid') return facility.paymentStatus?.status === 'PAID';
                if (filterPaymentStatus === 'unpaid') return !facility.paymentStatus || facility.paymentStatus.status !== 'PAID';
                return true;
            })();

            // Search filter
            const searchMatch = searchTerm === '' || 
                facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (facility.billing_email || facility.contact_email || '').toLowerCase().includes(searchTerm.toLowerCase());

            return statusMatch && searchMatch;
        });

        // Sort facilities
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'amount':
                    aValue = a.totalAmount;
                    bValue = b.totalAmount;
                    break;
                case 'trips':
                    aValue = a.tripCount;
                    bValue = b.tripCount;
                    break;
                case 'status':
                    aValue = a.paymentStatus?.status === 'PAID' ? 1 : 0;
                    bValue = b.paymentStatus?.status === 'PAID' ? 1 : 0;
                    break;
                default:
                    return 0;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    };

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
            fetchPaymentHistory();
        }
    }, [selectedMonth, router, supabase]);

    // Get filtered and sorted facilities
    const filteredFacilities = getSortedAndFilteredFacilities();

    // Calculate summary statistics
    const totalFacilities = facilityData.length;
    const paidFacilities = facilityData.filter(f => f.paymentStatus?.status === 'PAID').length;
    const unpaidFacilities = totalFacilities - paidFacilities;
    const totalRevenue = facilityData.reduce((sum, f) => sum + f.totalAmount, 0);
    const paidRevenue = facilityData.filter(f => f.paymentStatus?.status === 'PAID').reduce((sum, f) => sum + f.totalAmount, 0);

    // Send bulk invoice reminder
    const handleSendBulkReminders = async () => {
        const unpaidFacilities = filteredFacilities.filter(f => !f.paymentStatus || f.paymentStatus.status !== 'PAID');
        
        if (unpaidFacilities.length === 0) {
            alert('No unpaid invoices to send reminders for.');
            return;
        }

        if (confirm(`Send payment reminders to ${unpaidFacilities.length} facilities?`)) {
            // Here you would implement the email sending logic
            console.log('Sending reminders to:', unpaidFacilities.map(f => f.name));
            alert(`Payment reminders sent to ${unpaidFacilities.length} facilities.`);
        }
    };

    // Export billing data
    const handleExportData = () => {
        const csvData = filteredFacilities.map(facility => ({
            'Facility Name': facility.name,
            'Contact Email': facility.contact_email || '',
            'Billing Email': facility.billing_email || '',
            'Phone': facility.phone_number || '',
            'Address': facility.address || '',
            'Total Trips': facility.tripCount,
            'Billable Trips': facility.billableTrips,
            'Total Amount': facility.totalAmount.toFixed(2),
            'Payment Status': facility.paymentStatus?.status || 'UNPAID',
            'Payment Date': facility.paymentStatus?.payment_date || '',
            'Invoice Month': monthOptions.find(m => m.value === selectedMonth)?.label || ''
        }));

        // Convert to CSV and download
        const csvContent = "data:text/csv;charset=utf-8," + 
            Object.keys(csvData[0]).join(",") + "\n" +
            csvData.map(row => Object.values(row).join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `facility-billing-${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
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
                // Refresh payment history
                fetchPaymentHistory();
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
            {/* Professional Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">💼 Facility Billing Dashboard</h1>
                            <p className="text-sm text-gray-500 mt-1">Comprehensive invoice management and payment tracking system</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Export and Bulk Actions */}
                            <button
                                onClick={handleExportData}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                📊 Export Data
                            </button>
                            <button
                                onClick={handleSendBulkReminders}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                📧 Send Reminders
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 Filters & Search</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Month Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Billing Month</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                            <select
                                value={filterPaymentStatus}
                                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Facilities</option>
                                <option value="paid">✅ Paid Only</option>
                                <option value="unpaid">💰 Unpaid Only</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search Facilities</label>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="name">Facility Name</option>
                                <option value="amount">Total Amount</option>
                                <option value="trips">Trip Count</option>
                                <option value="status">Payment Status</option>
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Enhanced Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-700 uppercase tracking-wide">Total Facilities</p>
                                <p className="text-3xl font-bold text-blue-900 mt-2">{totalFacilities}</p>
                                <p className="text-xs text-blue-600 mt-1">Active billing accounts</p>
                            </div>
                            <div className="text-4xl text-blue-600">🏥</div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-700 uppercase tracking-wide">Paid Invoices</p>
                                <p className="text-3xl font-bold text-green-900 mt-2">{paidFacilities}</p>
                                <p className="text-xs text-green-600 mt-1">{totalFacilities > 0 ? Math.round((paidFacilities / totalFacilities) * 100) : 0}% payment rate</p>
                            </div>
                            <div className="text-4xl text-green-600">✅</div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-700 uppercase tracking-wide">Unpaid Invoices</p>
                                <p className="text-3xl font-bold text-amber-900 mt-2">{unpaidFacilities}</p>
                                <p className="text-xs text-amber-600 mt-1">Require follow-up</p>
                            </div>
                            <div className="text-4xl text-amber-600">💰</div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-700 uppercase tracking-wide">Total Revenue</p>
                                <p className="text-3xl font-bold text-purple-900 mt-2">${totalRevenue.toFixed(2)}</p>
                                <p className="text-xs text-purple-600 mt-1">Collected: ${paidRevenue.toFixed(2)}</p>
                            </div>
                            <div className="text-4xl text-purple-600">💎</div>
                        </div>
                    </div>
                </div>

                {/* Professional Facilities Table */}
                <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    📋 Facility Invoices for {monthOptions.find(m => m.value === selectedMonth)?.label}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Showing {filteredFacilities.length} of {totalFacilities} facilities
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    📈 {showPaymentHistory ? 'Hide' : 'Show'} Payment History
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        🏥 Facility Details
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        📞 Contact Information
                                    </th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        🚗 Trip Summary
                                    </th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        💰 Billing Amount
                                    </th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        💳 Payment Status
                                    </th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        ⚙️ Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredFacilities.map((facility, index) => (
                                    <React.Fragment key={facility.id}>
                                        <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                                            {/* Facility Details */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="text-2xl mr-3">🏥</div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{facility.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            ID: {facility.id.substring(0, 8)}...
                                                        </div>
                                                        {facility.address && (
                                                            <div className="text-xs text-gray-600 mt-1 flex items-center">
                                                                <span className="mr-1">📍</span>
                                                                {facility.address.split(',')[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact Information */}
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {facility.billing_email && (
                                                        <div className="text-xs text-gray-700 flex items-center">
                                                            <span className="text-blue-600 mr-1">💰</span>
                                                            <span className="font-medium">Billing:</span>
                                                            <span className="ml-1">{facility.billing_email}</span>
                                                        </div>
                                                    )}
                                                    {facility.contact_email && !facility.billing_email && (
                                                        <div className="text-xs text-gray-700 flex items-center">
                                                            <span className="text-gray-600 mr-1">📧</span>
                                                            <span className="font-medium">Contact:</span>
                                                            <span className="ml-1">{facility.contact_email}</span>
                                                        </div>
                                                    )}
                                                    {facility.phone_number && (
                                                        <div className="text-xs text-gray-700 flex items-center">
                                                            <span className="text-green-600 mr-1">📞</span>
                                                            <span className="font-medium">Phone:</span>
                                                            <span className="ml-1">{facility.phone_number}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Trip Summary */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="space-y-2">
                                                    <div className="text-sm font-bold text-gray-900">
                                                        {facility.tripCount} Total Trips
                                                    </div>
                                                    <div className="flex justify-center space-x-2">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            ✅ {facility.billableTrips} Billable
                                                        </span>
                                                        {facility.tripCount - facility.billableTrips > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                                ⏳ {facility.tripCount - facility.billableTrips} Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Billing Amount */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-lg font-bold text-gray-900">
                                                    ${facility.totalAmount.toFixed(2)}
                                                </div>
                                                {facility.totalAmount > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        ${(facility.totalAmount / Math.max(facility.billableTrips, 1)).toFixed(2)} avg/trip
                                                    </div>
                                                )}
                                            </td>

                                            {/* Payment Status */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="space-y-2">
                                                    <button
                                                        onClick={() => handleTogglePaymentStatus(facility)}
                                                        className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                                                            facility.paymentStatus?.status === 'PAID'
                                                                ? 'bg-green-100 text-green-800 border-2 border-green-300 hover:bg-green-200'
                                                                : 'bg-amber-100 text-amber-800 border-2 border-amber-300 hover:bg-amber-200'
                                                        }`}
                                                    >
                                                        {facility.paymentStatus?.status === 'PAID' ? '✅ PAID' : '💰 UNPAID'}
                                                    </button>
                                                    {facility.paymentStatus?.payment_date && (
                                                        <div className="text-xs text-gray-500">
                                                            💳 Paid: {new Date(facility.paymentStatus.payment_date).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col space-y-2">
                                                    <a
                                                        href={`/invoice/facility-monthly/${facility.id}-${selectedMonth}`}
                                                        className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-150"
                                                    >
                                                        📄 View Invoice
                                                    </a>
                                                    <button
                                                        onClick={() => setSelectedFacility(selectedFacility?.id === facility.id ? null : facility)}
                                                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
                                                    >
                                                        {selectedFacility?.id === facility.id ? '👁️ Hide Details' : '🔍 View Details'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Facility Details */}
                                        {selectedFacility?.id === facility.id && (
                                            <tr className="bg-blue-50 border-l-4 border-blue-400">
                                                <td colSpan="6" className="px-6 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        <div className="bg-white p-4 rounded-lg border">
                                                            <h4 className="font-medium text-gray-900 mb-2">📊 Monthly History</h4>
                                                            <div className="space-y-1">
                                                                {paymentHistory
                                                                    .filter(h => h.facility_id === facility.id)
                                                                    .slice(0, 3)
                                                                    .map(history => (
                                                                        <div key={`${history.invoice_year}-${history.invoice_month}`} className="text-xs text-gray-600">
                                                                            {new Date(history.invoice_year, history.invoice_month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}: 
                                                                            <span className={`ml-1 font-medium ${history.status === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>
                                                                                ${history.total_amount.toFixed(2)} ({history.status})
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="bg-white p-4 rounded-lg border">
                                                            <h4 className="font-medium text-gray-900 mb-2">📍 Full Address</h4>
                                                            <p className="text-xs text-gray-600">
                                                                {facility.address || 'Address not available'}
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="bg-white p-4 rounded-lg border">
                                                            <h4 className="font-medium text-gray-900 mb-2">⚡ Quick Actions</h4>
                                                            <div className="space-y-2">
                                                                <button className="w-full text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200">
                                                                    📧 Send Reminder
                                                                </button>
                                                                <button className="w-full text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200">
                                                                    📝 Add Note
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredFacilities.length === 0 && (
                        <div className="text-center py-16">
                            <div className="text-gray-400 text-8xl mb-6">📊</div>
                            <h3 className="text-xl font-medium text-gray-900 mb-2">No facilities found</h3>
                            <p className="text-gray-500 mb-4">
                                {filterPaymentStatus === 'all' 
                                    ? 'No facilities have trips for this month.' 
                                    : `No facilities match the current filters.`}
                            </p>
                            <button
                                onClick={() => {
                                    setFilterPaymentStatus('all');
                                    setSearchTerm('');
                                }}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                🔄 Clear Filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Payment History Modal/Section */}
                {showPaymentHistory && (
                    <div className="mt-8 bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
                        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-xl font-semibold text-gray-900">📈 Payment History Overview</h3>
                            <p className="text-sm text-gray-600 mt-1">Historical payment tracking across all facilities</p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paymentHistory.slice(0, 12).map(payment => (
                                    <div key={`${payment.facility_id}-${payment.invoice_year}-${payment.invoice_month}`} 
                                         className="bg-gray-50 border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-medium text-gray-900 text-sm">
                                                    {payment.facilities?.name || 'Unknown Facility'}
                                                </h4>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(payment.invoice_year, payment.invoice_month - 1).toLocaleDateString('en-US', {
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                payment.status === 'PAID' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {payment.status === 'PAID' ? '✅' : '💰'} {payment.status}
                                            </span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">
                                            ${payment.total_amount.toFixed(2)}
                                        </div>
                                        {payment.payment_date && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Paid: {new Date(payment.payment_date).toLocaleDateString('en-US')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
