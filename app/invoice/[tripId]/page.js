import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Professional Invoice Details Page for Trip
export default async function TripInvoiceDetailPage({ params }) {
    const { tripId } = params;
    
    try {
        // Create server component client
        const supabase = createServerComponentClient({ cookies });

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            redirect('/login');
        }

        // Get user profile
        let userProfile = null;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            userProfile = error ? {
                id: session.user.id,
                email: session.user.email,
                role: 'dispatcher'
            } : data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            userProfile = {
                id: session.user.id,
                email: session.user.email,
                role: 'dispatcher'
            };
        }

        // Fetch trip with enhanced client and facility information
        const { data: trip, error: tripError } = await supabase
            .from('trips')
            .select(`
                *,
                user_profile:profiles(first_name, last_name, phone_number, email),
                facility:facilities(id, name, contact_email, phone_number, address)
            `)
            .eq('id', tripId)
            .single();

        if (tripError || !trip) {
            console.error('Error fetching trip:', tripError);
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

        // Enhanced client information
        const getClientInfo = () => {
            if (trip.managed_client_id) {
                // For managed clients, we might need to fetch from a different table
                return {
                    name: 'Managed Client',
                    phone: '',
                    email: '',
                    type: 'Managed Client'
                };
            } else if (trip.user_profile) {
                return {
                    name: `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim() || 'Unknown Client',
                    phone: trip.user_profile.phone_number || '',
                    email: trip.user_profile.email || '',
                    type: 'Individual Client'
                };
            }
            return {
                name: 'Unknown Client',
                phone: '',
                email: '',
                type: 'Unknown'
            };
        };

        const clientInfo = getClientInfo();
        const facilityInfo = trip.facility;

        // Check if invoice already exists for this trip
        const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('*')
            .eq('trip_id', tripId)
            .single();

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
                                {!existingInvoice && (
                                    <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                        ✅ Generate Invoice
                                    </button>
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
                                    {facilityInfo ? (
                                        // Facility Booking
                                        <div className="space-y-2">
                                            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                                                    🏥 Facility Booking
                                                </p>
                                                <p className="font-semibold text-gray-900">{facilityInfo.name}</p>
                                                {facilityInfo.address && <p className="text-gray-600">{facilityInfo.address}</p>}
                                                {facilityInfo.contact_email && <p className="text-gray-600">📧 {facilityInfo.contact_email}</p>}
                                                {facilityInfo.phone_number && <p className="text-gray-600">📞 {facilityInfo.phone_number}</p>}
                                            </div>
                                            {clientInfo.name !== 'Unknown Client' && (
                                                <div className="mt-3 p-3 bg-gray-50 rounded">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client:</p>
                                                    <p className="font-medium text-gray-900">{clientInfo.name}</p>
                                                    {clientInfo.phone && <p className="text-gray-600 text-sm">📞 {clientInfo.phone}</p>}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Individual Booking
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

                            {/* Payment Status */}
                            <div className="border-t pt-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
                                        <p className="text-sm text-gray-500">
                                            {existingInvoice ? 
                                                `Invoice generated on ${new Date(existingInvoice.created_at).toLocaleDateString()}` :
                                                'Invoice not yet generated'
                                            }
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {existingInvoice ? (
                                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                                                existingInvoice.status === 'paid' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : existingInvoice.status === 'cancelled'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {existingInvoice.status === 'paid' ? '✅ Paid' : 
                                                 existingInvoice.status === 'cancelled' ? '❌ Cancelled' : 
                                                 '⏳ Pending Payment'}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                                📋 Ready for Invoicing
                                            </span>
                                        )}
                                    </div>
                                </div>
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

    } catch (error) {
        console.error('Error in trip invoice detail page:', error);
        redirect('/login?error=server_error');
    }
}
