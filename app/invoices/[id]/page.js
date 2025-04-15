import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// This is a Server Component
export default async function InvoiceDetailPage({ params }) {
    const { id } = params;
    
    try {
        // Create server component client
        const supabase = createServerComponentClient({ cookies });

        // This will refresh the session if needed
        const { data: { session } } = await supabase.auth.getSession();

        // Redirect to login if there's no session
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

            if (error) {
                userProfile = {
                    id: session.user.id,
                    email: session.user.email,
                    role: 'dispatcher'
                };
            } else {
                userProfile = data;
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            userProfile = {
                id: session.user.id,
                email: session.user.email,
                role: 'dispatcher'
            };
        }

        // Fetch the invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (invoiceError) {
            console.error('Error fetching invoice:', invoiceError);
            return (
                <div className="p-6">
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
                        <p className="font-bold">Error</p>
                        <p>This invoice could not be found or you don't have permission to view it.</p>
                    </div>
                    <div className="mt-4">
                        <a href="/invoices" className="text-brand-accent hover:underline">
                            &larr; Back to invoices
                        </a>
                    </div>
                </div>
            );
        }

        // Get the client information
        const { data: client, error: clientError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', invoice.user_id)
            .single();

        if (clientError) {
            console.error('Error fetching client:', clientError);
        }

        // Get associated trip if there is one
        let trip = null;
        if (invoice.trip_id) {
            const { data: tripData, error: tripError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', invoice.trip_id)
                .single();

            if (tripError) {
                console.error('Error fetching trip:', tripError);
            } else {
                trip = tripData;
            }
        }

        // Simple rendering of invoice details
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border p-6">
                    <div className="flex justify-between mb-6">
                        <h1 className="text-2xl font-bold">Invoice #{invoice.invoice_number}</h1>
                        <div className="text-right">
                            <div className="mb-1">
                                <span className={`px-3 py-1 text-sm rounded-full ${
                                    invoice.status === 'paid' 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                        : invoice.status === 'cancelled' 
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                        : 'bg-brand-pending/20 text-brand-pending'
                                }`}>
                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                </span>
                            </div>
                            <div className="text-sm opacity-75">
                                {new Date(invoice.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Client</h2>
                            {client ? (
                                <div>
                                    <p className="font-medium">
                                        {client.full_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client'}
                                    </p>
                                    <p>{client.email}</p>
                                    <p>{client.phone_number || 'No phone number'}</p>
                                </div>
                            ) : (
                                <p className="opacity-75">Client information not available</p>
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Invoice Details</h2>
                            <p><span className="font-medium">Issue Date:</span> {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : 'N/A'}</p>
                            <p><span className="font-medium">Due Date:</span> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
                            <p><span className="font-medium">Amount:</span> ${parseFloat(invoice.amount).toFixed(2)}</p>
                            {invoice.payment_date && (
                                <p><span className="font-medium">Payment Date:</span> {new Date(invoice.payment_date).toLocaleDateString()}</p>
                            )}
                            {invoice.payment_method && (
                                <p><span className="font-medium">Payment Method:</span> {invoice.payment_method}</p>
                            )}
                        </div>
                    </div>

                    {trip && (
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-2">Associated Trip</h2>
                            <div className="bg-brand-background p-4 rounded border border-brand-border">
                                <p><span className="font-medium">Pickup:</span> {trip.pickup_address}</p>
                                <p><span className="font-medium">Destination:</span> {trip.destination_address}</p>
                                <p><span className="font-medium">Date:</span> {new Date(trip.pickup_time).toLocaleDateString()}</p>
                                <p><span className="font-medium">Time:</span> {new Date(trip.pickup_time).toLocaleTimeString()}</p>
                                <p><span className="font-medium">Status:</span> {trip.status}</p>
                                <div className="mt-2">
                                    <a href={`/trips/${trip.id}`} className="text-brand-accent hover:underline">
                                        View trip details
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {invoice.notes && (
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-2">Notes</h2>
                            <p className="whitespace-pre-line">{invoice.notes}</p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-between">
                        <a href="/invoices" className="inline-flex items-center text-brand-accent hover:underline">
                            &larr; Back to invoices
                        </a>
                        
                        <div>
                            <button 
                                className="px-4 py-2 mr-2 border border-brand-border text-sm rounded-md hover:bg-brand-border/20"
                                onClick={() => alert('Edit functionality would go here')}
                            >
                                Edit Invoice
                            </button>
                            
                            {invoice.status !== 'paid' && (
                                <button 
                                    className="px-4 py-2 bg-brand-accent text-white text-sm rounded-md hover:opacity-90"
                                    onClick={() => alert('Mark as paid functionality would go here')}
                                >
                                    Mark as Paid
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error in invoice detail page:', error);
        redirect('/login?error=server_error');
    }
}