'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InvoicesView({ user, userProfile, invoices: initialInvoices }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices || []);
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
      default:
        return 'bg-brand-pending/20 text-brand-pending';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen">
      {/* Main content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
          <div className="px-6 py-5 border-b border-brand-border flex justify-between">
            <h3 className="text-lg font-medium">All Invoices</h3>
            <span className="text-sm self-center">{invoices.length} invoices found</span>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center">
              No invoices found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-brand-border">
                <colgroup>
                  <col className="w-[15%]" />
                  <col className="w-[25%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-brand-card border-b border-brand-border">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Invoice #</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Client</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Issue Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-brand-accent uppercase tracking-wider">Due Date</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-brand-accent uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {invoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className="hover:bg-brand-border/10 cursor-pointer" 
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <td className="px-3 py-4 text-sm font-medium">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 flex-shrink-0 bg-brand-border rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {invoice.client?.first_name?.charAt(0) || ''}{invoice.client?.last_name?.charAt(0) || ''}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium">
                              {invoice.client?.full_name || 
                                `${invoice.client?.first_name || ''} ${invoice.client?.last_name || ''}`.trim() || 
                                'Unnamed Client'}
                            </div>
                            <div className="text-xs opacity-75">
                              {invoice.client?.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        {formatDate(invoice.issue_date)}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            router.push(`/invoices/${invoice.id}`);
                          }}
                          className="text-brand-accent hover:opacity-80"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}