'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function InvoiceDetails({ params }) {
  const invoiceId = params.id;
  const { user, isDispatcher, signOut } = useAuth();
  const router = useRouter();
  
  const [invoice, setInvoice] = useState(null);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Ensure user has dispatcher role
    if (!isDispatcher()) {
      signOut();
      router.push('/login?error=Access denied. This application is only for dispatchers.');
      return;
    }

    async function fetchInvoiceDetails() {
      try {
        // Fetch the invoice with trip details
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            trip:trip_id(*)
          `)
          .eq('id', invoiceId)
          .single();

        if (error) throw error;
        
        if (!data) {
          setError('Invoice not found');
          return;
        }

        setInvoice(data);
        setTrip(data.trip);
        
      } catch (error) {
        console.error('Error fetching invoice:', error);
        setError('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoiceDetails();
  }, [user, router, invoiceId, isDispatcher, signOut]);

  const handleUpdatePaymentStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;
      
      // Update local state
      setInvoice({
        ...invoice,
        payment_status: newStatus
      });
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendInvoice = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId);

      if (error) throw error;
      
      // Update local state
      setInvoice({
        ...invoice,
        status: 'sent'
      });
      
    } catch (error) {
      console.error('Error sending invoice:', error);
      setError('Failed to update invoice status');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <div className="w-12 h-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoice details...</p>
          </div>
        ) : error ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Invoice header */}
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Invoice #{invoice.id}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Created on {new Date(invoice.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center">
                <span className={`mr-4 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${invoice.status === 'issued' ? 'bg-blue-100 text-blue-800' : 
                    invoice.status === 'sent' ? 'bg-purple-100 text-purple-800' : 
                    'bg-gray-100 text-gray-800'}`}>
                  Status: {invoice.status || 'issued'}
                </span>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                    invoice.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                    invoice.payment_status === 'overdue' ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'}`}>
                  Payment: {invoice.payment_status || 'unpaid'}
                </span>
              </div>
            </div>

            {/* Invoice content */}
            <div className="p-6">
              {/* Trip details section */}
              <div className="mb-8">
                <h4 className="text-base font-medium text-gray-900 mb-4">Trip Details</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <dt className="text-sm font-medium text-gray-500">Trip ID</dt>
                    <dd className="text-sm text-gray-900">{trip.id}</dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Client</dt>
                    <dd className="text-sm text-gray-900">{trip.client_name}</dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                    <dd className="text-sm text-gray-900">{new Date(trip.created_at).toLocaleDateString()}</dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Pickup</dt>
                    <dd className="text-sm text-gray-900">{trip.pickup_location}</dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Dropoff</dt>
                    <dd className="text-sm text-gray-900">{trip.dropoff_location}</dd>
                  </dl>
                </div>
              </div>

              {/* Invoice details section */}
              <div className="mb-8">
                <h4 className="text-base font-medium text-gray-900 mb-4">Invoice Details</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <dt className="text-sm font-medium text-gray-500">Amount</dt>
                    <dd className="text-sm text-gray-900">${invoice.amount?.toFixed(2)}</dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                    <dd className="text-sm text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Invoice Status</dt>
                    <dd className="text-sm text-gray-900">{invoice.status}</dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
                    <dd className="text-sm text-gray-900">{invoice.payment_status}</dd>
                  </dl>
                </div>
              </div>

              {/* Notes section */}
              {invoice.notes && (
                <div className="mb-8">
                  <h4 className="text-base font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-700">{invoice.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions section */}
              <div className="mt-8 border-t border-gray-200 pt-6 flex justify-between">
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-4">Update Payment Status</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdatePaymentStatus('unpaid')}
                      disabled={updating || invoice.payment_status === 'unpaid'}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Unpaid
                    </button>
                    <button
                      onClick={() => handleUpdatePaymentStatus('partial')}
                      disabled={updating || invoice.payment_status === 'partial'}
                      className="inline-flex items-center px-3 py-2 border border-yellow-300 text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                    >
                      Partial
                    </button>
                    <button
                      onClick={() => handleUpdatePaymentStatus('paid')}
                      disabled={updating || invoice.payment_status === 'paid'}
                      className="inline-flex items-center px-3 py-2 border border-green-300 text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      Paid
                    </button>
                    <button
                      onClick={() => handleUpdatePaymentStatus('overdue')}
                      disabled={updating || invoice.payment_status === 'overdue'}
                      className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      Overdue
                    </button>
                  </div>
                </div>
                
                <div className="flex items-end">
                  {invoice.status === 'issued' && (
                    <button
                      onClick={handleSendInvoice}
                      disabled={updating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {updating ? 'Updating...' : 'Mark as Sent'}
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Print Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}