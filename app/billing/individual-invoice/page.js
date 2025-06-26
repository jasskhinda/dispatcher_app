'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

function IndividualBookingInvoiceContent() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [trip, setTrip] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [invoice, setInvoice] = useState(null);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const tripId = searchParams.get('trip_id');
    const supabase = createClientComponentClient();

    useEffect(() => {
        if (tripId) {
            getSession();
        } else {
            setError('No trip ID provided');
            setLoading(false);
        }
    }, [tripId]);

    async function getSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/login');
                return;
            }

            setUser(session.user);
            await fetchTripData();
            
        } catch (err) {
            console.error('Session error:', err);
            setError('Authentication error: ' + err.message);
            setLoading(false);
        }
    }

    async function fetchTripData() {
        try {
            console.log('🔍 Fetching trip data for ID:', tripId);
            
            // Fetch trip data
            const { data: tripData, error: tripError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .single();

            if (tripError) throw tripError;

            if (!tripData) {
                throw new Error('Trip not found');
            }

            // Verify this is an individual trip (no facility_id)
            if (tripData.facility_id) {
                throw new Error('This is a facility trip. Use facility billing instead.');
            }

            setTrip(tripData);

            // Fetch user profile if user_id exists
            if (tripData.user_id) {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', tripData.user_id)
                    .single();

                if (profileError) {
                    console.warn('Could not fetch user profile:', profileError);
                } else {
                    setUserProfile(profileData);
                }
            }

            // Check if invoice already exists
            const { data: existingInvoice, error: invoiceError } = await supabase
                .from('invoices')
                .select('*')
                .eq('trip_id', tripId)
                .single();

            if (invoiceError && invoiceError.code !== 'PGRST116') {
                console.warn('Error checking for existing invoice:', invoiceError);
            } else if (existingInvoice) {
                setInvoice(existingInvoice);
            }

            setLoading(false);

        } catch (err) {
            console.error('Error fetching trip data:', err);
            setError('Failed to load trip data: ' + err.message);
            setLoading(false);
        }
    }

    async function generateInvoice() {
        try {
            setGenerating(true);

            // Create invoice data
            const invoiceData = {
                trip_id: trip.id,
                user_id: trip.user_id,
                amount: parseFloat(trip.price || 0),
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                status: 'pending',
                invoice_type: 'individual',
                invoice_number: `INV-${Date.now()}`,
                created_at: new Date().toISOString(),
                billing_address: userProfile?.address || '',
                notes: `Invoice for individual trip from ${trip.pickup_address} to ${trip.destination_address}`
            };

            const { data: newInvoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert([invoiceData])
                .select()
                .single();

            if (invoiceError) throw invoiceError;

            setInvoice(newInvoice);
            
            // Update trip to mark it as having an invoice
            const { error: updateError } = await supabase
                .from('trips')
                .update({ has_invoice: true, invoice_id: newInvoice.id })
                .eq('id', trip.id);

            if (updateError) {
                console.warn('Could not update trip with invoice info:', updateError);
            }

            alert('Invoice generated successfully!');

        } catch (err) {
            console.error('Error generating invoice:', err);
            alert('Failed to generate invoice: ' + err.message);
        } finally {
            setGenerating(false);
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading trip data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-4">Error</h1>
                    <p className="text-red-600 mb-6">{error}</p>
                    <div className="space-x-4">
                        <button 
                            onClick={() => router.push('/trips/individual')} 
                            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                        >
                            Back to Individual Trips
                        </button>
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
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">📄 Individual Booking Invoice</h1>
                            <p className="mt-2 text-gray-600">
                                Create invoice for individual trip booking
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/trips/individual')}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                            >
                                ← Back to Individual Trips
                            </button>
                        </div>
                    </div>
                </div>

                {/* Trip Information */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Trip Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Trip Details</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Trip ID:</span>
                                    <span className="ml-2 text-sm text-gray-900 font-mono">{trip?.id?.slice(0, 12)}...</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Status:</span>
                                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                                        trip?.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        trip?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        trip?.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                        trip?.status === 'in_process' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {trip?.status === 'in_process' ? 'In Process (Paid)' : trip?.status}
                                    </span>
                                </div>
                                {/* Payment Status for Paid Trips */}
                                {(trip?.payment_status === 'paid' || trip?.status === 'in_process') && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">Payment Status:</span>
                                        <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            ✅ Paid
                                        </span>
                                        {trip?.charged_at && (
                                            <div className="ml-2 mt-1 text-xs text-gray-500">
                                                Charged: {new Date(trip.charged_at).toLocaleDateString()} at {new Date(trip.charged_at).toLocaleTimeString()}
                                            </div>
                                        )}
                                        {trip?.payment_amount && (
                                            <div className="ml-2 text-xs text-gray-500">
                                                Amount: {formatCurrency(trip.payment_amount)}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Pickup Time:</span>
                                    <span className="ml-2 text-sm text-gray-900">{formatDate(trip?.pickup_time)}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Trip Amount:</span>
                                    <span className="ml-2 text-sm font-semibold text-green-600">{formatCurrency(trip?.price)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Route Information</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Pickup:</span>
                                    <div className="ml-2 text-sm text-gray-900">{trip?.pickup_address || trip?.pickup_location || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Destination:</span>
                                    <div className="ml-2 text-sm text-gray-900">{trip?.destination_address || trip?.dropoff_location || 'N/A'}</div>
                                </div>
                                {trip?.notes && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">Notes:</span>
                                        <div className="ml-2 text-sm text-gray-900">{trip.notes}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Cost Breakdown for Paid Trips */}
                {(trip?.payment_status === 'paid' || trip?.status === 'in_process') && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">💳 Payment Details & Cost Breakdown</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Service Details</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Base Transportation</span>
                                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(trip.price || 0)}</span>
                                    </div>
                                    {trip?.wheelchair_type && (
                                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                            <span className="text-sm font-medium text-blue-700">♿ Wheelchair Accessible ({trip.wheelchair_type})</span>
                                            <span className="text-sm font-semibold text-blue-800">Included</span>
                                        </div>
                                    )}
                                    {trip?.is_round_trip && (
                                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                            <span className="text-sm font-medium text-green-700">🔄 Round Trip Service</span>
                                            <span className="text-sm font-semibold text-green-800">Included</span>
                                        </div>
                                    )}
                                    {trip?.additional_passengers > 0 && (
                                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                            <span className="text-sm font-medium text-purple-700">👥 Additional Passengers ({trip.additional_passengers})</span>
                                            <span className="text-sm font-semibold text-purple-800">Included</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Payment Information</h3>
                                <div className="space-y-3">
                                    {trip?.payment_intent_id && (
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">Payment ID:</span>
                                            <div className="text-sm text-gray-900 font-mono mt-1">{trip.payment_intent_id}</div>
                                        </div>
                                    )}
                                    {trip?.charged_at && (
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">Payment Date:</span>
                                            <div className="text-sm text-gray-900 mt-1">{formatDate(trip.charged_at)}</div>
                                        </div>
                                    )}
                                    <div className="border-t pt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold text-gray-900">Total Paid:</span>
                                            <span className="text-lg font-bold text-green-600">{formatCurrency(trip.payment_amount || trip.price || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Client Information */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">👤 Client Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Contact Details</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Name:</span>
                                    <span className="ml-2 text-sm text-gray-900">
                                        {userProfile ? 
                                            `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Name not available' :
                                            'Profile not available'
                                        }
                                    </span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Email:</span>
                                    <span className="ml-2 text-sm text-gray-900">{userProfile?.email || 'Email not available'}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Phone:</span>
                                    <span className="ml-2 text-sm text-gray-900">{userProfile?.phone_number || 'Phone not available'}</span>
                                </div>
                                {/* Additional client details for paid trips */}
                                {(trip?.payment_status === 'paid' || trip?.status === 'in_process') && userProfile?.stripe_customer_id && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">Customer ID:</span>
                                        <span className="ml-2 text-sm text-gray-500 font-mono">{userProfile.stripe_customer_id.slice(0, 12)}...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Billing Information</h3>
                            <div className="space-y-2">
                                <div className="text-sm text-gray-900">
                                    {userProfile?.address || 'Address not available'}
                                </div>
                                {/* Trip booking source */}
                                <div className="mt-3 p-2 bg-gray-50 rounded">
                                    <span className="text-xs font-medium text-gray-500">Booking Source:</span>
                                    <div className="text-sm text-gray-900">Individual Booking (BookingCCT App)</div>
                                </div>
                                {/* Trip completion info for paid trips */}
                                {(trip?.payment_status === 'paid' || trip?.status === 'in_process') && (
                                    <div className="mt-2 p-2 bg-green-50 rounded">
                                        <span className="text-xs font-medium text-green-600">Payment Status:</span>
                                        <div className="text-sm text-green-800 font-semibold">✅ Payment Processed Successfully</div>
                                        {trip?.charged_at && (
                                            <div className="text-xs text-green-600 mt-1">
                                                Processed: {new Date(trip.charged_at).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invoice Section */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Invoice Status</h2>
                        {!invoice && trip?.status === 'completed' && (
                            <button
                                onClick={generateInvoice}
                                disabled={generating}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Creating Invoice...
                                    </div>
                                ) : (
                                    '📄 Create Detailed Invoice'
                                )}
                            </button>
                        )}
                    </div>

                    {invoice ? (
                        <div className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Invoice Generated</h3>
                                    <p className="text-sm text-gray-500">Invoice #{invoice.invoice_number}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                    invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {invoice.status}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-700">Amount:</span>
                                    <div className="text-lg font-bold text-green-600">{formatCurrency(invoice.amount)}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Due Date:</span>
                                    <div className="text-gray-900">{formatDate(invoice.due_date)}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Created:</span>
                                    <div className="text-gray-900">{formatDate(invoice.created_at)}</div>
                                </div>
                            </div>

                            <div className="mt-6 flex space-x-3">
                                <button
                                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    View Invoice Details
                                </button>
                                <button
                                    onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Download PDF
                                </button>
                            </div>
                        </div>
                    ) : trip?.status !== 'completed' ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 text-4xl mb-4">⏳</div>
                            <p className="text-gray-500 text-lg">Trip must be completed before generating invoice</p>
                            <p className="text-gray-400 text-sm">Current status: {trip?.status}</p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-gray-400 text-4xl mb-4">📄</div>
                            <p className="text-gray-500 text-lg">No invoice generated yet</p>
                            <p className="text-gray-400 text-sm">Click the button above to generate an invoice for this completed trip</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading invoice page...</p>
            </div>
        </div>
    );
}

export default function IndividualBookingInvoicePage() {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <IndividualBookingInvoiceContent />
        </Suspense>
    );
}
