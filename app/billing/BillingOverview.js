'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function BillingOverview({ user }) {
    const [activeTab, setActiveTab] = useState('individual');
    const [individualInvoices, setIndividualInvoices] = useState([]);
    const [facilityInvoices, setFacilityInvoices] = useState([]);
    const [individualSummary, setIndividualSummary] = useState({});
    const [facilitySummary, setFacilitySummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchAllInvoices();
    }, []);

    async function fetchAllInvoices() {
        try {
            setLoading(true);
            
            // Fetch individual invoices
            const individualResponse = await fetch('/api/invoices');
            if (individualResponse.ok) {
                const individualData = await individualResponse.json();
                setIndividualInvoices(individualData.invoices || []);
                setIndividualSummary(individualData.summary || {});
            }
            
            // Fetch facility invoices
            const facilityResponse = await fetch('/api/facility-invoices');
            if (facilityResponse.ok) {
                const facilityData = await facilityResponse.json();
                setFacilityInvoices(facilityData.invoices || []);
                setFacilitySummary(facilityData.summary || {});
            }
        } catch (err) {
            console.error('Error fetching invoices:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function approveFacilityInvoice(invoiceId, action, notes = '') {
        try {
            const response = await fetch('/api/facility-invoices', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    invoice_id: invoiceId,
                    action,
                    notes
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update invoice');
            }

            const result = await response.json();
            setActionMessage(result.message);
            
            // Refresh facility invoices
            const facilityResponse = await fetch('/api/facility-invoices');
            if (facilityResponse.ok) {
                const facilityData = await facilityResponse.json();
                setFacilityInvoices(facilityData.invoices || []);
                setFacilitySummary(facilityData.summary || {});
            }
            
            // Clear message after 5 seconds
            setTimeout(() => setActionMessage(''), 5000);
        } catch (err) {
            console.error('Error updating facility invoice:', err);
            setError(err.message);
        }
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }

    function formatDate(dateString) {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function getStatusColor(status) {
        switch (status) {
            case 'paid':
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'pending':
            case 'sent':
                return 'bg-yellow-100 text-yellow-800';
            case 'pending_approval':
                return 'bg-blue-100 text-blue-800';
            case 'overdue':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Action Message */}
            {actionMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-green-800">{actionMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-red-800">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white shadow-sm border rounded-lg">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('individual')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'individual'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Individual Invoices ({individualInvoices.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('facility')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'facility'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Facility Invoices ({facilityInvoices.length})
                            {facilitySummary.pending_approval > 0 && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {facilitySummary.pending_approval} pending
                                </span>
                            )}
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'individual' ? (
                        <div className="space-y-6">
                            {/* Individual Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-blue-600">Total Revenue</div>
                                    <div className="text-2xl font-bold text-blue-900">{formatCurrency(individualSummary.total_amount)}</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-green-600">Paid</div>
                                    <div className="text-2xl font-bold text-green-900">{individualSummary.paid_count || 0}</div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-yellow-600">Pending</div>
                                    <div className="text-2xl font-bold text-yellow-900">{individualSummary.pending_count || 0}</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-red-600">Overdue</div>
                                    <div className="text-2xl font-bold text-red-900">{individualSummary.overdue_count || 0}</div>
                                </div>
                            </div>

                            {/* Individual Invoices */}
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {individualInvoices.length > 0 ? (
                                            individualInvoices.slice(0, 10).map((invoice) => (
                                                <tr key={invoice.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                                                        <div className="text-sm text-gray-500">{formatDate(invoice.issue_date)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {invoice.profiles?.first_name} {invoice.profiles?.last_name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatCurrency(invoice.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <a href={`/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-900">
                                                            View
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                    No individual invoices found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Facility Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-blue-600">Total Revenue</div>
                                    <div className="text-2xl font-bold text-blue-900">{formatCurrency(facilitySummary.total_amount)}</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-green-600">Approved</div>
                                    <div className="text-2xl font-bold text-green-900">{facilitySummary.approved || 0}</div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-yellow-600">Sent</div>
                                    <div className="text-2xl font-bold text-yellow-900">{facilitySummary.sent || 0}</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-red-600">Pending Approval</div>
                                    <div className="text-2xl font-bold text-red-900">{facilitySummary.pending_approval || 0}</div>
                                </div>
                            </div>

                            {/* Facility Invoices */}
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {facilityInvoices.length > 0 ? (
                                            facilityInvoices.map((invoice) => (
                                                <tr key={invoice.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                                                        <div className="text-sm text-gray-500">{formatDate(invoice.created_at)}</div>
                                                        <div className="text-xs text-gray-400">{invoice.month}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {invoice.facilities?.name || 'Unknown Facility'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {invoice.total_trips} trips
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatCurrency(invoice.total_amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                                            {invoice.status.replace('_', ' ').charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                        {invoice.status === 'pending_approval' && (
                                                            <>
                                                                <button
                                                                    onClick={() => approveFacilityInvoice(invoice.id, 'approve')}
                                                                    className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => approveFacilityInvoice(invoice.id, 'reject')}
                                                                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        <button className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs">
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                    No facility invoices found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
