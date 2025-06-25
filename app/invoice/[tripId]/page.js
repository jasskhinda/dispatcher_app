'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

// Professional Invoice Details Page for Trip - Client Component
export default function TripInvoiceDetailPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [trip, setTrip] = useState(null);
    const [error, setError] = useState(null);
    const [existingInvoice, setExistingInvoice] = useState(null);
    const [sendingInvoice, setSendingInvoice] = useState(false);
    const [invoiceSent, setInvoiceSent] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const tripId = params.tripId;
    const supabase = createClientComponentClient();

    useEffect(() => {
        async function fetchData() {
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

                // First, try to fetch trip with basic information only
                console.log('🔍 Fetching trip with ID:', tripId);
                
                const { data: basicTrip, error: basicError } = await supabase
                    .from('trips')
                    .select('*')
                    .eq('id', tripId)
                    .single();

                if (basicError) {
                    console.error('❌ Basic trip query failed:', basicError);
                    setError(`Trip not found: ${basicError.message}`);
                    setLoading(false);
                    return;
                }

                console.log('✅ Basic trip data loaded:', basicTrip);
                
                // Now enhance with related data
                let enhancedTrip = { ...basicTrip };
                
                // Try to fetch user profile if user_id exists
                if (basicTrip.user_id) {
                    try {
                        const { data: userProfile } = await supabase
                            .from('profiles')
                            .select('first_name, last_name, phone_number, email')
                            .eq('id', basicTrip.user_id)
                            .single();
                        
                        if (userProfile) {
                            enhancedTrip.user_profile = userProfile;
                            console.log('✅ User profile loaded');
                        }
                    } catch (err) {
                        console.log('⚠️ Could not load user profile:', err.message);
                    }
                }
                
                // Try to fetch facility if facility_id exists
                if (basicTrip.facility_id) {
                    try {
                        const { data: facility } = await supabase
                            .from('facilities')
                            .select('id, name, contact_email, phone_number, address')
                            .eq('id', basicTrip.facility_id)
                            .single();
                        
                        if (facility) {
                            enhancedTrip.facility = facility;
                            console.log('✅ Facility data loaded');
                        }
                    } catch (err) {
                        console.log('⚠️ Could not load facility:', err.message);
                    }
                }
                
                // Try to fetch managed client if managed_client_id exists
                if (basicTrip.managed_client_id) {
                    try {
                        // Try facility_managed_clients first
                        const { data: managedClient } = await supabase
                            .from('facility_managed_clients')
                            .select('first_name, last_name, phone_number, email')
                            .eq('id', basicTrip.managed_client_id)
                            .single();
                        
                        if (managedClient) {
                            enhancedTrip.managed_client = managedClient;
                            console.log('✅ Managed client data loaded');
                        }
                    } catch (err) {
                        console.log('⚠️ Could not load managed client:', err.message);
                    }
                }
                
                setTrip(enhancedTrip);
                console.log('✅ Enhanced trip data ready');

                // Check if invoice already exists for this trip
                const { data: invoiceData } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('trip_id', tripId)
                    .single();

                if (invoiceData) {
                    setExistingInvoice(invoiceData);
                }

                setLoading(false);

            } catch (err) {
                console.error('Error in invoice detail page:', err);
                setError('Failed to load invoice details');
                setLoading(false);
            }
        }

        if (tripId) {
            fetchData();
        }
    }, [tripId, router, supabase]);

    // Enhanced client information display
    const getClientInfo = () => {
        if (!trip) return { name: 'Unknown Client', phone: '', email: '', type: 'Unknown', source: 'Unknown' };
        
        // Check for managed client (facility app bookings)
        if (trip.managed_client_id && trip.managed_client) {
            return {
                name: `${trip.managed_client.first_name || ''} ${trip.managed_client.last_name || ''}`.trim() || 'Managed Client',
                phone: trip.managed_client.phone_number || '',
                email: trip.managed_client.email || '',
                type: 'Facility Client',
                source: 'facility_app'
            };
        }
        
        // Check for direct user bookings (BookingCCT app)
        if (trip.user_id && trip.user_profile) {
            return {
                name: `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim() || 'Individual Client',
                phone: trip.user_profile.phone_number || '',
                email: trip.user_profile.email || '',
                type: 'Individual Client',
                source: 'booking_app'
            };
        }
        
        // Fallback to passenger name from trip
        if (trip.passenger_name) {
            return {
                name: trip.passenger_name,
                phone: trip.passenger_phone || '',
                email: '',
                type: 'Trip Passenger',
                source: 'legacy'
            };
        }
        
        return {
            name: 'Unknown Client',
            phone: '',
            email: '',
            type: 'Unknown',
            source: 'unknown'
        };
    };

    // Get facility information for display
    const getFacilityInfo = () => {
        if (trip?.facility) {
            return {
                name: trip.facility.name || 'Unknown Facility',
                phone: trip.facility.phone_number || '',
                email: trip.facility.contact_email || '',
                address: trip.facility.address || ''
            };
        }
        return null;
    };

    // Get payment status based on trip and invoice data
    const getPaymentStatus = () => {
        if (existingInvoice) {
            return existingInvoice.payment_status === 'paid' ? 'PAID' : 'DUE';
        }
        // Default based on trip status
        return trip?.status === 'completed' ? 'DUE' : 'PENDING';
    };

    // Send invoice to appropriate app dashboard
    const handleSendInvoice = async () => {
        if (!trip || sendingInvoice) return;

        setSendingInvoice(true);
        try {
            const clientInfo = getClientInfo();
            
            // Create or update invoice record
            const invoiceData = {
                trip_id: tripId,
                status: 'sent',
                payment_status: 'pending',
                sent_at: new Date().toISOString(),
                amount: trip.price || 0,
                client_email: clientInfo.email,
                booking_source: clientInfo.source
            };

            let response;
            if (existingInvoice) {
                // Update existing invoice
                response = await fetch(`/api/invoices/${existingInvoice.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(invoiceData)
                });
            } else {
                // Create new invoice
                response = await fetch('/api/invoices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(invoiceData)
                });
            }

            if (response.ok) {
                const updatedInvoice = await response.json();
                setExistingInvoice(updatedInvoice);
                setInvoiceSent(true);
                
                // Show success message
                setTimeout(() => setInvoiceSent(false), 3000);
            } else {
                throw new Error('Failed to send invoice');
            }
        } catch (err) {
            console.error('Error sending invoice:', err);
            setError('Failed to send invoice');
        } finally {
            setSendingInvoice(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Header Skeleton */}
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                                <div>
                                    <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-24 mt-2 animate-pulse"></div>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
                                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Content Skeleton */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8">
                            <div className="space-y-4">
                                <div className="h-8 bg-white/20 rounded w-64 animate-pulse"></div>
                                <div className="h-4 bg-white/20 rounded w-48 animate-pulse"></div>
                                <div className="h-4 bg-white/20 rounded w-52 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-6 bg-gray-200 rounded w-28 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
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
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Trip Not Found</h1>
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

    if (!trip) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">📄</div>
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Trip Not Found</h1>
                        <p className="text-gray-600 mb-6">The requested trip could not be found or you don't have permission to view it.</p>
                        <a href="/dashboard" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                            Back to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const clientInfo = getClientInfo();
    const facilityInfo = getFacilityInfo();

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
                                    <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
                                    <p className="text-sm text-gray-500">Trip #{trip.id.slice(0, 8)}</p>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button 
                                    onClick={() => window.print()}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    🖨️ Print
                                </button>
                                {getPaymentStatus() === 'DUE' && trip?.status === 'completed' && (
                                    <button 
                                        onClick={handleSendInvoice}
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
                                            <>📧 Send Invoice</>
                                        )}
                                    </button>
                                )}
                                {getPaymentStatus() === 'PAID' && (
                                    <span className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50">
                                        ✅ Paid
                                    </span>
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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none print-no-break">
                        {/* Invoice Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 print-bg print-gradient">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">CCT Transportation</h2>
                                    <p className="text-blue-100">Professional Transportation Services</p>
                                    <div className="mt-4 text-sm">
                                        <p>📧 billing@ccttransportation.com</p>
                                        <p>📞 (416) 555-0123</p>
                                        <p>📍 Toronto, Ontario, Canada</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-white/20 rounded-lg p-4 print:bg-white/10">
                                        <h3 className="text-lg font-semibold mb-2">
                                            {existingInvoice ? `Invoice #${existingInvoice.invoice_number}` : 'Invoice Preview'}
                                        </h3>
                                        <p className="text-blue-100">
                                            {existingInvoice ? 
                                                new Date(existingInvoice.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) :
                                                new Date().toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Client and Trip Information */}
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                {/* Bill To Section */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Bill To:</h3>
                                    {clientInfo.source === 'facility_app' ? (
                                        // Facility App Booking
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                                                    👤 Facility Booking {facilityInfo ? `(${facilityInfo.name})` : ''}
                                                </p>
                                                {facilityInfo && (
                                                    <div className="mb-3">
                                                        <p className="font-semibold text-gray-900">{facilityInfo.name}</p>
                                                        {facilityInfo.address && <p className="text-gray-600">{facilityInfo.address}</p>}
                                                        {facilityInfo.email && <p className="text-gray-600">📧 {facilityInfo.email}</p>}
                                                        {facilityInfo.phone && <p className="text-gray-600">📞 {facilityInfo.phone}</p>}
                                                    </div>
                                                )}
                                            </div>
                                            {clientInfo.name !== 'Unknown Client' && clientInfo.name !== 'Managed Client' && (
                                                <div className="p-3 bg-gray-50 rounded">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client Details:</p>
                                                    <p className="font-medium text-gray-900">{clientInfo.name}</p>
                                                    {clientInfo.email && <p className="text-gray-600 text-sm">📧 {clientInfo.email}</p>}
                                                    {clientInfo.phone && <p className="text-gray-600 text-sm">📞 {clientInfo.phone}</p>}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Individual Booking (BookingCCT App)
                                        <div className="space-y-2">
                                            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                                                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">
                                                    👤 Individual Booking
                                                </p>
                                                <p className="font-semibold text-gray-900">{clientInfo.name}</p>
                                                {clientInfo.email && <p className="text-gray-600">📧 {clientInfo.email}</p>}
                                                {clientInfo.phone && <p className="text-gray-600">📞 {clientInfo.phone}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Trip Details Section */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Trip Details:</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Trip ID:</span>
                                            <span className="font-medium">#{trip.id.slice(0, 8)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Date & Time:</span>
                                            <span className="font-medium">
                                                {new Date(trip.pickup_time).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                                <br />
                                                <span className="text-sm text-gray-500">
                                                    {new Date(trip.pickup_time).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Status:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                                trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment Status:</span>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                getPaymentStatus() === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {getPaymentStatus()}
                                            </span>
                                        </div>
                                        {trip.driver_name && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Driver:</span>
                                                <span className="font-medium">{trip.driver_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Route Information */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Route Information:</h3>
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">PICKUP</p>
                                                    <p className="font-semibold text-gray-900">{trip.pickup_address || trip.pickup_location}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">DESTINATION</p>
                                                    <p className="font-semibold text-gray-900">{trip.destination_address || trip.dropoff_location}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {trip.distance && (
                                        <div className="mt-4 text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white text-gray-700">
                                                📏 Distance: {trip.distance} km
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Service Details & Pricing */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Service Details & Pricing:</h3>
                                <div className="bg-gray-50 rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            <tr>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            🚗 Transportation Service
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {trip.is_round_trip ? 'Round Trip' : 'One Way'} Transportation
                                                        {trip.wheelchair_type && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                ♿ Wheelchair Accessible ({trip.wheelchair_type})
                                                            </div>
                                                        )}
                                                        {trip.additional_passengers > 0 && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                👥 Additional Passengers: {trip.additional_passengers}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                                    ${parseFloat(trip.price || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    
                                    {/* Total Section */}
                                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-blue-100">Total Amount</p>
                                                <p className="text-xs text-blue-200">All taxes included</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-bold">${parseFloat(trip.price || 0).toFixed(2)}</p>
                                                <p className="text-blue-200 text-sm">CAD</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            {(trip.special_requirements || trip.notes) && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Additional Information:</h3>
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                        {trip.special_requirements && (
                                            <div className="mb-2">
                                                <p className="text-sm font-medium text-yellow-800">Special Requirements:</p>
                                                <p className="text-sm text-yellow-700">{trip.special_requirements}</p>
                                            </div>
                                        )}
                                        {trip.notes && (
                                            <div>
                                                <p className="text-sm font-medium text-yellow-800">Notes:</p>
                                                <p className="text-sm text-yellow-700">{trip.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Payment Status & Invoice Actions */}
                            <div className="border-t pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Payment & Invoice Status</h3>
                                        <p className="text-sm text-gray-500">
                                            {existingInvoice ? 
                                                `Invoice sent on ${new Date(existingInvoice.sent_at || existingInvoice.created_at).toLocaleDateString()}` :
                                                'Ready to send invoice to client'
                                            }
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                                            getPaymentStatus() === 'PAID'
                                                ? 'bg-green-100 text-green-800' 
                                                : getPaymentStatus() === 'DUE'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {getPaymentStatus() === 'PAID' ? '✅ PAID' : 
                                             getPaymentStatus() === 'DUE' ? '💳 DUE' : 
                                             '⏳ PENDING'}
                                        </span>
                                    </div>
                                </div>

                                {/* Invoice Instructions */}
                                {getPaymentStatus() === 'DUE' && trip?.status === 'completed' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start space-x-3">
                                            <div className="text-blue-500 text-lg">💡</div>
                                            <div>
                                                <h4 className="font-medium text-blue-900 mb-2">Invoice Delivery</h4>
                                                <p className="text-sm text-blue-700 mb-3">
                                                    {clientInfo.source === 'facility_app' ? (
                                                        <>This invoice will be sent to the <strong>Facility App</strong> where {facilityInfo?.name || 'the facility'} can view it in their billing dashboard.</>
                                                    ) : (
                                                        <>This invoice will be sent to the <strong>Booking App</strong> where {clientInfo.name} can view it in their personal dashboard.</>
                                                    )}
                                                </p>
                                                {!existingInvoice && (
                                                    <button 
                                                        onClick={handleSendInvoice}
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
                                                                Sending Invoice...
                                                            </>
                                                        ) : (
                                                            <>📧 Send Invoice to {clientInfo.source === 'facility_app' ? 'Facility' : 'Client'}</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Success Message */}
                                {getPaymentStatus() === 'PAID' && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-green-500 text-lg">✅</div>
                                            <div>
                                                <h4 className="font-medium text-green-900">Payment Received</h4>
                                                <p className="text-sm text-green-700">
                                                    This invoice has been marked as paid. Thank you for your business!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-sm text-gray-500 no-print">
                        <p>Thank you for choosing CCT Transportation Services</p>
                        <p>For questions about this invoice, please contact billing@ccttransportation.com</p>
                    </div>
                    
                    {/* Print-only footer */}
                    <div className="hidden print:block mt-8 text-center text-sm text-gray-600 border-t pt-4">
                        <p className="font-medium">CCT Transportation Services</p>
                        <p>Thank you for your business • For questions: billing@ccttransportation.com • (416) 555-0123</p>
                    </div>
                </div>
            </div>
        );
}
