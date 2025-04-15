'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewInvoiceForm({ user, userProfile, trip, client }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(client?.id || '');
  const [selectedTripId, setSelectedTripId] = useState(trip?.id || '');
  const [formData, setFormData] = useState({
    invoice_number: generateInvoiceNumber(),
    amount: trip?.price || '',
    status: 'pending',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Generate a random invoice number with format INV-YYYYMMDD-XXXX
  function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
  }

  // Fetch clients and trips if not provided
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch clients
        if (!client) {
          const { data: clientsData, error: clientsError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'client')
            .order('last_name', { ascending: true });

          if (clientsError) throw clientsError;
          setClients(clientsData || []);
        } else {
          setClients([client]);
        }

        // Fetch trips for selected client if no trip is provided
        if (selectedClientId && !trip) {
          await fetchClientTrips(selectedClientId);
        } else if (trip) {
          setTrips([trip]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [client, trip]);

  // Fetch trips when client changes
  async function fetchClientTrips(clientId) {
    if (!clientId) {
      setTrips([]);
      setSelectedTripId('');
      return;
    }

    setLoading(true);
    try {
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', clientId)
        .eq('status', 'completed')
        .is('invoice_id', null) // Only get trips without invoices
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;
      setTrips(tripsData || []);
      
      // Update selected trip if there are trips available
      if (tripsData && tripsData.length > 0 && !selectedTripId) {
        setSelectedTripId(tripsData[0].id);
        setFormData({
          ...formData,
          amount: tripsData[0].price || 0
        });
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      setError('Failed to load trips. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const handleClientChange = async (e) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    await fetchClientTrips(clientId);
  };

  const handleTripChange = (e) => {
    const tripId = e.target.value;
    setSelectedTripId(tripId);
    
    // Find the trip and update amount
    const selectedTrip = trips.find(t => t.id === tripId);
    if (selectedTrip) {
      setFormData({
        ...formData,
        amount: selectedTrip.price || 0
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Please select a client');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: selectedClientId,
          trip_id: selectedTripId || null,
          invoice_number: formData.invoice_number,
          amount: formData.amount,
          status: formData.status,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          notes: formData.notes
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // If there's a selected trip, update it to link to this invoice
      if (selectedTripId) {
        const { error: tripUpdateError } = await supabase
          .from('trips')
          .update({ invoice_id: invoice.id })
          .eq('id', selectedTripId);

        if (tripUpdateError) {
          console.error('Error updating trip with invoice ID:', tripUpdateError);
          // Continue anyway since the invoice was created
        }
      }

      setSuccess(true);
      
      // Redirect to the invoice page after a short delay
      setTimeout(() => {
        router.push(`/invoices/${invoice.id}`);
      }, 1500);
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded" role="alert">
          <p className="font-bold">Success!</p>
          <p>Invoice created successfully. Redirecting to invoice details...</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="client">
              Client*
            </label>
            <select
              id="client"
              name="client"
              value={selectedClientId}
              onChange={handleClientChange}
              disabled={loading || !!client || success}
              className="block w-full border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              required
            >
              <option value="">Select Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="trip">
              Associated Trip
            </label>
            <select
              id="trip"
              name="trip"
              value={selectedTripId}
              onChange={handleTripChange}
              disabled={loading || !!trip || !selectedClientId || success}
              className="block w-full border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            >
              <option value="">No Associated Trip</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {new Date(t.pickup_time).toLocaleDateString()} - {t.pickup_address} → {t.destination_address}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="invoice_number">
              Invoice Number*
            </label>
            <input
              type="text"
              id="invoice_number"
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleInputChange}
              disabled={loading || success}
              className="block w-full border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="amount">
              Amount ($)*
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              disabled={loading || success}
              className="block w-full border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="status">
              Status*
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              disabled={loading || success}
              className="block w-full border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              required
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="issue_date">
              Issue Date*
            </label>
            <input
              type="date"
              id="issue_date"
              name="issue_date"
              value={formData.issue_date}
              onChange={handleInputChange}
              disabled={loading || success}
              className="block w-full border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="due_date">
              Due Date*
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleInputChange}
              disabled={loading || success}
              className="block w-full border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              required
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            disabled={loading || success}
            rows="4"
            className="block w-full border border-brand-border rounded-md px-3 py-2 focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
          ></textarea>
        </div>
        
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push('/invoices')}
            disabled={loading || success}
            className="px-4 py-2 text-brand-accent border border-brand-border rounded hover:bg-brand-border/20 transition-colors focus:outline-none focus:ring-brand-accent"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading || success || !selectedClientId}
            className={`px-4 py-2 bg-brand-accent text-white rounded hover:opacity-90 transition-opacity focus:outline-none focus:ring-brand-accent ${(loading || success) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}