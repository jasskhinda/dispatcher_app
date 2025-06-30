'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// Icons as inline SVG components to avoid external dependencies
const CheckCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const AlertCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const Clock = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CreditCard = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const Building2 = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
  </svg>
)

const FileText = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const Eye = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const Filter = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
)

const RefreshCw = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const AlertTriangle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
)

const X = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export default function EnhancedPaymentVerificationView() {
  const [invoices, setInvoices] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFacility, setSelectedFacility] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [actionData, setActionData] = useState(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])

  const supabase = createClientComponentClient()

  const statusConfig = {
    'UNPAID': { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      icon: AlertCircle,
      priority: 1
    },
    'PROCESSING PAYMENT': { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      icon: Clock,
      priority: 2
    },
    'PAID WITH CARD': { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: CreditCard,
      priority: 5
    },
    'PAID WITH BANK TRANSFER': { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      icon: Building2,
      priority: 5
    },
    'PAID': { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: CheckCircle,
      priority: 5
    },
    'PAID WITH CHECK (BEING VERIFIED)': { 
      color: 'bg-orange-100 text-orange-800 border-orange-200', 
      icon: FileText,
      priority: 3
    },
    'PAID WITH CHECK - VERIFIED': { 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
      icon: CheckCircle,
      priority: 6
    },
    'PENDING': { 
      color: 'bg-purple-100 text-purple-800 border-purple-200', 
      icon: RefreshCw,
      priority: 1
    },
    'NEEDS ATTENTION - RETRY PAYMENT': { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      icon: AlertTriangle,
      priority: 0
    }
  }

  useEffect(() => {
    fetchFacilities()
    fetchInvoices()
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [selectedFacility, selectedStatus])

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, email, phone')
        .order('name')

      if (error) throw error
      setFacilities(data || [])
    } catch (err) {
      console.error('Error fetching facilities:', err)
      setError('Failed to load facilities')
    }
  }

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('facility_invoices')
        .select(`
          *,
          facilities(id, name, email, phone),
          facility_invoice_payments(
            id,
            payment_method,
            payment_date,
            card_last_four,
            billing_name,
            status
          )
        `)
        .order('last_updated', { ascending: false })

      if (selectedFacility !== 'all') {
        query = query.eq('facility_id', selectedFacility)
      }

      if (selectedStatus !== 'all') {
        query = query.eq('payment_status', selectedStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setInvoices(data || [])
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async (invoiceId) => {
    try {
      const { data, error } = await supabase
        .from('payment_verification_audit_log')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAuditLogs(data || [])
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setAuditLogs([])
    }
  }

  const handleStatusChange = (invoice, newStatus, actionType) => {
    setActionData({
      invoice,
      newStatus,
      actionType,
      currentStatus: invoice.payment_status
    })
    setShowConfirmModal(true)
  }

  const confirmStatusChange = async () => {
    if (!actionData) return

    try {
      setError('')
      setSuccessMessage('')

      const { data: userData } = await supabase.auth.getUser()
      
      // Update invoice status with audit logging
      const { error } = await supabase.rpc('update_payment_status_with_audit', {
        p_invoice_id: actionData.invoice.id,
        p_new_status: actionData.newStatus,
        p_user_id: userData.user.id,
        p_user_role: 'dispatcher',
        p_notes: getActionNote(actionData.actionType, actionData.newStatus),
        p_verification_notes: actionData.actionType === 'verify_check' 
          ? 'Check payment verified and confirmed by dispatcher'
          : null
      })

      if (error) throw error

      setSuccessMessage(getSuccessMessage(actionData.actionType, actionData.newStatus))
      setShowConfirmModal(false)
      setActionData(null)
      
      // Refresh invoices
      await fetchInvoices()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000)

    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update payment status')
    }
  }

  const getActionNote = (actionType, newStatus) => {
    switch (actionType) {
      case 'verify_check':
        return 'Check payment verified and marked as paid by dispatcher'
      case 'mark_pending':
        return 'Payment status reset to pending - requires facility attention'
      case 'mark_attention':
        return 'Payment flagged for attention - facility needs to retry payment'
      case 'mark_card_unpaid':
        return 'Credit card payment marked as unpaid by dispatcher'
      default:
        return `Payment status changed to ${newStatus}`
    }
  }

  const getSuccessMessage = (actionType, newStatus) => {
    switch (actionType) {
      case 'verify_check':
        return 'Check payment verified successfully! Status updated to "PAID WITH CHECK - VERIFIED"'
      case 'mark_pending':
        return 'Payment status reset to pending. Facility will be notified to retry payment.'
      case 'mark_attention':
        return 'Payment flagged for attention. Facility will see "NEEDS ATTENTION - RETRY PAYMENT" status.'
      case 'mark_card_unpaid':
        return 'Credit card payment marked as unpaid. Status updated accordingly.'
      default:
        return `Payment status updated to ${newStatus}`
    }
  }

  const getAvailableActions = (invoice) => {
    const actions = []
    const status = invoice.payment_status

    switch (status) {
      case 'PAID WITH CHECK (BEING VERIFIED)':
        actions.push({
          label: 'Mark as Verified and Paid',
          action: () => handleStatusChange(invoice, 'PAID WITH CHECK - VERIFIED', 'verify_check'),
          style: 'bg-green-600 hover:bg-green-700 text-white',
          icon: CheckCircle
        })
        actions.push({
          label: 'Mark as Pending',
          action: () => handleStatusChange(invoice, 'PENDING', 'mark_pending'),
          style: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          icon: RefreshCw
        })
        break

      case 'PAID WITH CARD':
      case 'PAID WITH BANK TRANSFER':
        actions.push({
          label: 'Mark as Unpaid',
          action: () => handleStatusChange(invoice, 'PENDING', 'mark_card_unpaid'),
          style: 'bg-red-600 hover:bg-red-700 text-white',
          icon: AlertTriangle
        })
        break

      case 'PROCESSING PAYMENT':
        actions.push({
          label: 'Mark as Needs Attention',
          action: () => handleStatusChange(invoice, 'NEEDS ATTENTION - RETRY PAYMENT', 'mark_attention'),
          style: 'bg-red-600 hover:bg-red-700 text-white',
          icon: AlertTriangle
        })
        break

      default:
        if (status.includes('UNPAID') || status.includes('PENDING') || status.includes('ATTENTION')) {
          actions.push({
            label: 'Mark as Paid',
            action: () => handleStatusChange(invoice, 'PAID', 'manual_paid'),
            style: 'bg-green-600 hover:bg-green-700 text-white',
            icon: CheckCircle
          })
        }
    }

    return actions
  }

  const openDetailModal = async (invoice) => {
    setSelectedInvoice(invoice)
    setShowDetailModal(true)
    await fetchAuditLogs(invoice.id)
  }

  const getStatusCount = (status) => {
    return invoices.filter(invoice => invoice.payment_status === status).length
  }

  const getTotalAmount = () => {
    return invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
  }

  const StatusBadge = ({ status, onClick = null }) => {
    const config = statusConfig[status] || statusConfig['UNPAID']
    const Icon = config.icon

    return (
      <span 
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={onClick}
      >
        <Icon className="h-3 w-3" />
        <span>{status}</span>
      </span>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Verification Dashboard</h1>
            <p className="text-gray-600">Manage and verify facility invoice payments</p>
          </div>
          <button
            onClick={fetchInvoices}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-700">Needs Attention</h3>
            <p className="text-2xl font-bold text-red-900">
              {getStatusCount('NEEDS ATTENTION - RETRY PAYMENT')}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-orange-700">Pending Verification</h3>
            <p className="text-2xl font-bold text-orange-900">
              {getStatusCount('PAID WITH CHECK (BEING VERIFIED)')}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-700">Processing</h3>
            <p className="text-2xl font-bold text-yellow-900">
              {getStatusCount('PROCESSING PAYMENT')}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-700">Total Amount</h3>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(getTotalAmount())}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Facilities</option>
            {facilities.map(facility => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {Object.keys(statusConfig).map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-700">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Invoice Verification Queue ({invoices.length} invoices)
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading invoices...</p>
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facility
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices
                  .sort((a, b) => (statusConfig[a.payment_status]?.priority || 999) - (statusConfig[b.payment_status]?.priority || 999))
                  .map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.facilities?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.facilities?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.month}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.total_trips} trips
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={invoice.payment_status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.last_updated || invoice.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => openDetailModal(invoice)}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Details</span>
                        </button>
                        
                        {getAvailableActions(invoice).map((action, index) => (
                          <button
                            key={index}
                            onClick={action.action}
                            className={`inline-flex items-center space-x-1 px-3 py-1 rounded-md transition-colors text-sm ${action.style}`}
                          >
                            <action.icon className="h-4 w-4" />
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500">
              {selectedFacility !== 'all' || selectedStatus !== 'all' 
                ? 'Try adjusting your filters to see more results.'
                : 'All payments are up to date!'}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && actionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to change the payment status for invoice{' '}
                  <span className="font-medium">{actionData.invoice.invoice_number}</span>?
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Status:</span>
                    <StatusBadge status={actionData.currentStatus} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">New Status:</span>
                    <StatusBadge status={actionData.newStatus} />
                  </div>
                </div>

                {actionData.actionType === 'verify_check' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Once you mark this invoice as verified and paid, 
                      you will not be able to change it later.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setActionData(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Invoice Details - {selectedInvoice.invoice_number}
                </h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedInvoice(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Invoice Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Invoice Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Facility:</span>
                      <p className="font-medium">{selectedInvoice.facilities?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Amount:</span>
                      <p className="font-medium">{formatCurrency(selectedInvoice.total_amount)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Month:</span>
                      <p className="font-medium">{selectedInvoice.month}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <div className="mt-1">
                        <StatusBadge status={selectedInvoice.payment_status} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Payment History</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedInvoice.facility_invoice_payments?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedInvoice.facility_invoice_payments.map((payment, index) => (
                          <div key={payment.id} className="border-b border-gray-200 pb-2 last:border-b-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">{payment.payment_method.replace('_', ' ').toUpperCase()}</p>
                                <p className="text-xs text-gray-600">
                                  {formatDate(payment.payment_date)}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {payment.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No payment history available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Log */}
              {auditLogs.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Audit Log</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-3">
                      {auditLogs.map((log, index) => (
                        <div key={log.id} className="border-b border-gray-200 pb-2 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">
                                {log.old_status} → {log.new_status}
                              </p>
                              <p className="text-xs text-gray-600">{log.notes}</p>
                              <p className="text-xs text-gray-500">
                                by {log.profiles?.full_name || log.profiles?.email || 'System'} 
                                ({log.performed_by_role})
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}