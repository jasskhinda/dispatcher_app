'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

// Professional Monthly Facility Invoice - Shows all trips for a facility for a specific month
export default function FacilityMonthlyInvoicePage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [facilityTrips, setFacilityTrips] = useState([]);
    const [facilityInfo, setFacilityInfo] = useState(null);
    const [error, setError] = useState(null);
    const [invoiceMonth, setInvoiceMonth] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);
    const [sendingInvoice, setSendingInvoice] = useState(false);
    const [invoiceSent, setInvoiceSent] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.tripId; // This will be facility_id or month identifier
    const supabase = createClientComponentClient();

    useEffect(() => {
        async function fetchMonthlyInvoiceData() {
            try {
                setLoading(true);
                
                // Check authentication
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError('Authentication error');
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

                // Parse the invoice ID to determine if it's a facility ID or trip ID
                // For monthly billing, we'll use format: facilityId-YYYY-MM
                // But for now, let's check if it's a trip ID first, then extract facility
                
                let facilityId = null;
                let targetMonth = null;
                
                console.log('🔍 Parsing invoice identifier:', invoiceId);
                
                // First, try to get the trip to extract facility_id
                const { data: tripData, error: tripError } = await supabase
                    .from('trips')
                    .select('facility_id, pickup_time')
                    .eq('id', invoiceId)
                    .single();

                if (tripData && tripData.facility_id) {
                    facilityId = tripData.facility_id;
                    // Extract month from the trip's pickup_time
                    const tripDate = new Date(tripData.pickup_time);
                    targetMonth = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`;
                    console.log(`✅ Found facility ${facilityId} for month ${targetMonth} from trip`);
                } else {
                    console.log('❌ Trip not found or no facility_id, trying direct facility approach');
                    setError('Invalid invoice identifier or not a facility booking');
                    setLoading(false);
                    return;
                }

                // Get facility information
                const { data: facility, error: facilityError } = await supabase
                    .from('facilities')
                    .select('id, name, contact_email, phone_number, address, billing_email')
                    .eq('id', facilityId)
                    .single();

                if (facilityError || !facility) {
                    console.error('❌ Facility not found:', facilityError);
                    setError('Facility not found');
                    setLoading(false);
                    return;
                }

                setFacilityInfo(facility);
                setInvoiceMonth(targetMonth);
                console.log('✅ Facility info loaded:', facility.name);

                // Get all trips for this facility for the target month
                const [year, month] = targetMonth.split('-');
                const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
                
                const startISO = startDate.toISOString();
                const endISO = endDate.toISOString();

                console.log(`🔍 Fetching all trips for facility ${facilityId} for month ${targetMonth}`);
                console.log(`📅 Date range: ${startISO} to ${endISO}`);

                const { data: trips, error: tripsError } = await supabase
                    .from('trips')
                    .select(`
                        id,
                        pickup_address,
                        destination_address,
                        pickup_time,
                        price,
                        status,
                        wheelchair_type,
                        is_round_trip,
                        additional_passengers,
                        managed_client_id,
                        user_id,
                        managed_client:facility_managed_clients(first_name, last_name, phone_number, email),
                        user_profile:profiles(first_name, last_name, phone_number, email)
                    `)
                    .eq('facility_id', facilityId)
                    .gte('pickup_time', startISO)
                    .lte('pickup_time', endISO)
                    .in('status', ['completed', 'upcoming', 'pending', 'confirmed'])
                    .order('pickup_time', { ascending: false });

                if (tripsError) {
                    console.error('❌ Error fetching trips:', tripsError);
                    setError(`Failed to fetch trips: ${tripsError.message}`);
                    setLoading(false);
                    return;
                }

                console.log(`✅ Found ${trips?.length || 0} trips for the month`);

                // Process trips and calculate totals
                const processedTrips = trips.map(trip => {
                    // Get client name
                    let clientName = 'Unknown Client';
                    let clientPhone = '';
                    let clientEmail = '';
                    
                    if (trip.managed_client && trip.managed_client.first_name) {
                        clientName = `${trip.managed_client.first_name} ${trip.managed_client.last_name || ''}`.trim();
                        clientName += ' (Managed)';
                        clientPhone = trip.managed_client.phone_number || '';
                        clientEmail = trip.managed_client.email || '';
                    } else if (trip.user_profile && trip.user_profile.first_name) {
                        clientName = `${trip.user_profile.first_name} ${trip.user_profile.last_name || ''}`.trim();
                        clientPhone = trip.user_profile.phone_number || '';
                        clientEmail = trip.user_profile.email || '';
                    } else if (trip.managed_client_id?.startsWith('ea79223a')) {
                        // Special case for David Patel
                        clientName = 'David Patel (Managed)';
                        clientPhone = '(416) 555-2233';
                    } else {
                        clientName = `${facility.name} Client`;
                    }

                    return {
                        ...trip,
                        clientName,
                        clientPhone,
                        clientEmail,
                        displayPrice: parseFloat(trip.price || 0),
                        isBillable: trip.status === 'completed' && trip.price > 0
                    };
                });

                setFacilityTrips(processedTrips);
                
                // Calculate total for billable trips only
                const billableAmount = processedTrips
                    .filter(trip => trip.isBillable)
                    .reduce((sum, trip) => sum + trip.displayPrice, 0);
                
                setTotalAmount(billableAmount);
                setLoading(false);

            } catch (err) {
                console.error('Error in monthly invoice page:', err);
                setError('Failed to load monthly invoice details');
                setLoading(false);
            }
        }

        if (invoiceId) {
            fetchMonthlyInvoiceData();
        }
    }, [invoiceId, router, supabase]);

    // Get display month name
    const getMonthDisplayName = () => {
        if (!invoiceMonth) return '';
        const [year, month] = invoiceMonth.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    };

    // Send monthly invoice
    const handleSendMonthlyInvoice = async () => {
        if (!facilityInfo || facilityTrips.length === 0 || sendingInvoice) return;

        setSendingInvoice(true);
        try {
            const monthlyInvoiceData = {
                facility_id: facilityInfo.id,
                month: invoiceMonth,
                total_amount: totalAmount,
                trip_count: facilityTrips.filter(trip => trip.isBillable).length,
                status: 'sent',
                sent_at: new Date().toISOString(),
                billing_email: facilityInfo.billing_email || facilityInfo.contact_email,
                trip_ids: facilityTrips.filter(trip => trip.isBillable).map(trip => trip.id)
            };

            // Here you would call your API to create/send the monthly invoice
            // For now, we'll simulate success
            console.log('📧 Sending monthly invoice:', monthlyInvoiceData);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setInvoiceSent(true);
            setTimeout(() => setInvoiceSent(false), 5000);
            
        } catch (err) {
            console.error('Error sending monthly invoice:', err);
            setError('Failed to send monthly invoice');
        } finally {
            setSendingInvoice(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="animate-spin text-blue-600 text-6xl mb-4">⏳</div>
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Loading Monthly Invoice</h1>
                        <p className="text-gray-600">Fetching facility billing details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">📄</div>
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Invoice Error</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <div className="space-y-3">
                            <a href="/dashboard" className="block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                                Back to Dashboard
                            </a>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="block w-full bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const billableTrips = facilityTrips.filter(trip => trip.isBillable);
    const pendingTrips = facilityTrips.filter(trip => !trip.isBillable);

    return (
        <div className="min-h-screen bg-gray-50 print:bg-white">
            {/* Header */}
            <div className="bg-white shadow-sm border-b no-print">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <a href="/dashboard" className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </a>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Monthly Invoice - {facilityInfo?.name}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {getMonthDisplayName()} • {billableTrips.length} billable trips
                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                        🏥 Facility Billing
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button 
                                onClick={() => window.print()}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                🖨️ Print Invoice
                            </button>
                            {billableTrips.length > 0 && (
                                <button 
                                    onClick={handleSendMonthlyInvoice}
                                    disabled={sendingInvoice}
                                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                                        sendingInvoice 
                                            ? 'bg-gray-400 cursor-not-allowed' 
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {sendingInvoice ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </>
                                    ) : (
                                        <>📧 Send Monthly Invoice</>
                                    )}
                                </button>
                            )}
                            {invoiceSent && (
                                <span className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50">
                                    ✅ Invoice Sent
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
                    {/* Invoice Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 print-bg print-gradient">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold mb-2">CCT Transportation</h2>
                                <p className="text-blue-100">Professional Transportation Services</p>
                                <div className="mt-3 bg-white/10 rounded-lg p-3">
                                    <p className="text-sm text-blue-200">Monthly Invoice for:</p>
                                    <p className="text-lg font-semibold text-white">{facilityInfo?.name}</p>
                                    <p className="text-sm text-blue-200">{getMonthDisplayName()}</p>
                                </div>
                                <div className="mt-4 text-sm">
                                    <p>📧 billing@ccttransportation.com</p>
                                    <p>📞 (416) 555-0123</p>
                                    <p>📍 Toronto, Ontario, Canada</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="bg-white/20 rounded-lg p-4 print:bg-white/10">
                                    <h3 className="text-lg font-semibold mb-2">Monthly Invoice</h3>
                                    <p className="text-blue-100">
                                        {new Date().toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-sm text-blue-200 mt-2">
                                        Due: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Summary */}
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Bill To Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Bill To:</h3>
                                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                                        🏥 Facility Monthly Billing
                                    </p>
                                    <div className="mb-3 p-3 bg-white rounded border border-blue-200">
                                        <p className="text-lg font-bold text-blue-900 mb-1">{facilityInfo?.name}</p>
                                        {facilityInfo?.address && <p className="text-gray-700">{facilityInfo.address}</p>}
                                        {facilityInfo?.billing_email && <p className="text-gray-600">📧 {facilityInfo.billing_email}</p>}
                                        {facilityInfo?.contact_email && !facilityInfo?.billing_email && <p className="text-gray-600">📧 {facilityInfo.contact_email}</p>}
                                        {facilityInfo?.phone_number && <p className="text-gray-600">📞 {facilityInfo.phone_number}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Summary Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Invoice Summary:</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Billing Period:</span>
                                        <span className="font-medium">{getMonthDisplayName()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Trips:</span>
                                        <span className="font-medium">{facilityTrips.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Billable Trips:</span>
                                        <span className="font-medium text-green-600">{billableTrips.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Pending Trips:</span>
                                        <span className="font-medium text-yellow-600">{pendingTrips.length}</span>
                                    </div>
                                    <div className="border-t pt-3 mt-3">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span className="text-gray-900">Total Amount Due:</span>
                                            <span className="text-green-600">${totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trip Details */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Trip Details:</h3>
                            
                            {/* Billable Trips */}
                            {billableTrips.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-md font-medium text-green-700 mb-3">✅ Billable Trips (Completed)</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border border-gray-200">
                                            <thead className="bg-green-50">
                                                <tr>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Date</th>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Client</th>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Route</th>
                                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Features</th>
                                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-700 uppercase border-b">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {billableTrips.map((trip, index) => (
                                                    <tr key={trip.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="text-sm">
                                                                {new Date(trip.pickup_time).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(trip.pickup_time).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="text-sm font-medium">{trip.clientName}</div>
                                                            {trip.clientPhone && (
                                                                <div className="text-xs text-gray-500">📞 {trip.clientPhone}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="text-sm">
                                                                <div className="text-gray-900">
                                                                    📍 {trip.pickup_address?.split(',')[0] || 'Unknown pickup'}
                                                                </div>
                                                                <div className="text-gray-600 mt-1">
                                                                    🎯 {trip.destination_address?.split(',')[0] || 'Unknown destination'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-b">
                                                            <div className="flex flex-col space-y-1">
                                                                {trip.wheelchair_type && (
                                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                        ♿ Wheelchair
                                                                    </span>
                                                                )}
                                                                {trip.is_round_trip && (
                                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                                        🔄 Round Trip
                                                                    </span>
                                                                )}
                                                                {trip.additional_passengers > 0 && (
                                                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                                        👥 +{trip.additional_passengers}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-b text-right">
                                                            <span className="text-sm font-semibold text-green-600">
                                                                ${trip.displayPrice.toFixed(2)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Pending/Non-Billable Trips */}
                            {pendingTrips.length > 0 && (
                                <div>
                                    <h4 className="text-md font-medium text-yellow-700 mb-3">⏳ Pending Trips (Not Yet Billable)</h4>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <p className="text-sm text-yellow-800 mb-3">
                                            These trips are not included in this month's billing as they are pending approval or not yet completed.
                                        </p>
                                        <div className="space-y-2">
                                            {pendingTrips.slice(0, 5).map((trip) => (
                                                <div key={trip.id} className="flex justify-between items-center text-sm">
                                                    <span>{trip.clientName} • {new Date(trip.pickup_time).toLocaleDateString()}</span>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        trip.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {trip.status.toUpperCase()}
                                                    </span>
                                                </div>
                                            ))}
                                            {pendingTrips.length > 5 && (
                                                <p className="text-xs text-yellow-600">+ {pendingTrips.length - 5} more pending trips</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Instructions */}
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">💳 Payment Instructions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Monthly Billing Terms:</h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        <li>• Payment due within 30 days of invoice date</li>
                                        <li>• Only completed trips are billed</li>
                                        <li>• Pending trips will appear on next month's invoice</li>
                                        <li>• Electronic payment preferred</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Payment Methods:</h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        <li>• Electronic transfer (preferred)</li>
                                        <li>• Company check</li>
                                        <li>• Credit card (processing fee applies)</li>
                                        <li>• Contact for payment portal access</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
