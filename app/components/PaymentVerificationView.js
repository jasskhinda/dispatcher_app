'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PaymentVerificationView() {
  const [invoices, setInvoices] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionData, setActionData] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchFacilities();
    fetchInvoices();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [selectedFacility, selectedStatus]);

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setFacilities(data || []);
    } catch (err) {
      console.error('Error fetching facilities:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('facility_invoices')
        .select(`
          *,
          facilities(name)
        `)
        .order('last_updated', { ascending: false });

      if (selectedFacility !== 'all') {
        query = query.eq('facility_id', selectedFacility);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('payment_status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceAction = async (invoice, action) => {
    setActionData({ invoice, action });
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!actionData) return;

    const { invoice, action } = actionData;
    
    try {
      let newStatus = '';
      let successMsg = '';

      switch (action) {
        case 'mark_verified':
          newStatus = 'PAID WITH CHECK - VERIFIED';
          successMsg = `Invoice ${invoice.invoice_number} marked as verified and paid`;
          break;
        case 'mark_pending':
          newStatus = 'PENDING';
          successMsg = `Invoice ${invoice.invoice_number} marked as pending - facility will be notified to retry payment`;
          break;
        case 'mark_attention':
          newStatus = 'NEEDS ATTENTION - RETRY PAYMENT';
          successMsg = `Invoice ${invoice.invoice_number} flagged for attention - facility will be notified`;
          break;
        default:
          throw new Error('Invalid action');
      }

      const { error } = await supabase
        .from('facility_invoices')
        .update({
          payment_status: newStatus,
          last_updated: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (error) throw error;

      setSuccessMessage(successMsg);
      setShowConfirmModal(false);
      setActionData(null);
      fetchInvoices(); // Refresh the list

    } catch (err) {
      console.error('Error updating invoice:', err);
      setError('Failed to update invoice status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'UNPAID':
        return 'bg-red-100 text-red-800';
      case 'PROCESSING PAYMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAID WITH CARD':
        return 'bg-green-100 text-green-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PAID WITH CHECK (BEING VERIFIED)':
        return 'bg-blue-100 text-blue-800';
      case 'PAID WITH CHECK - VERIFIED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-orange-100 text-orange-800';
      case 'NEEDS ATTENTION - RETRY PAYMENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailableActions = (invoice) => {
    const actions = [];
    
    switch (invoice.payment_status) {
      case 'PAID WITH CARD':
      case 'PAID':
        actions.push({
          action: 'mark_pending',
          label: 'MARK AS PENDING',
          color: 'bg-orange-600 hover:bg-orange-700'
        });
        break;
      case 'PROCESSING PAYMENT':
        actions.push({
          action: 'mark_verified',
          label: 'MARK AS VERIFIED AND PAID',
          color: 'bg-green-600 hover:bg-green-700'
        });
        break;
      case 'PAID WITH CHECK (BEING VERIFIED)':
        actions.push({
          action: 'mark_verified',
          label: 'MARK AS VERIFIED AND PAID',
          color: 'bg-green-600 hover:bg-green-700'
        });
        break;
    }

    // Add "Mark as Pending" option for most statuses
    if (!['PENDING', 'NEEDS ATTENTION - RETRY PAYMENT'].includes(invoice.payment_status)) {
      actions.push({
        action: 'mark_attention',
        label: 'NEEDS ATTENTION',
        color: 'bg-red-600 hover:bg-red-700'
      });
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-green-700 text-sm font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Payment Verification & Invoice Management</h1>
        <p className="text-blue-100">
          Verify facility payments and manage invoice statuses
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Facility
            </label>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Facilities</option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PROCESSING PAYMENT">PROCESSING PAYMENT</option>
              <option value="PAID WITH CARD">PAID WITH CARD</option>
              <option value="PAID">PAID</option>
              <option value="PAID WITH CHECK (BEING VERIFIED)">PAID WITH CHECK (BEING VERIFIED)</option>
              <option value="PAID WITH CHECK - VERIFIED">PAID WITH CHECK - VERIFIED</option>
              <option value="PENDING">PENDING</option>
              <option value="NEEDS ATTENTION - RETRY PAYMENT">NEEDS ATTENTION</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Facility Invoices ({invoices.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No invoices found</h3>
            <p className="mt-2 text-sm text-gray-500">
              No invoices match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Facility</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Invoice #</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Month</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Updated</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => {
                  const availableActions = getAvailableActions(invoice);
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {invoice.facilities?.name || 'Unknown Facility'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(invoice.month + '-01').toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ${invoice.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.payment_status)}`}>
                          {invoice.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(invoice.last_updated).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          {availableActions.map((action, index) => (
                            <button
                              key={index}
                              onClick={() => handleInvoiceAction(invoice, action.action)}
                              className={`text-xs text-white px-3 py-1 rounded transition-colors ${action.color}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && actionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  Confirm Action
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                {actionData.action === 'mark_verified' && 
                  `Mark invoice ${actionData.invoice.invoice_number} as verified and paid? This action cannot be undone.`
                }
                {actionData.action === 'mark_pending' && 
                  `Mark invoice ${actionData.invoice.invoice_number} as pending? This will notify the facility to retry payment.`
                }
                {actionData.action === 'mark_attention' && 
                  `Flag invoice ${actionData.invoice.invoice_number} for attention? The facility will be notified to retry payment.`
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setActionData(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}