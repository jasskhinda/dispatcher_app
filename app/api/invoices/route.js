import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

// GET /api/invoices - Get all invoices (dispatcher can see all)
export async function GET(request) {
  const supabase = createRouteHandlerClient();
  const { searchParams } = new URL(request.url);
  
  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is dispatcher
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    
    if (profile.role !== 'dispatcher') {
      return NextResponse.json({ error: 'Access denied - Dispatcher only' }, { status: 403 });
    }
    
    // Get all invoices with client and trip details
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        profiles!user_id (
          id,
          first_name,
          last_name,
          email,
          phone_number
        ),
        trips (
          id,
          pickup_address,
          destination_address,
          pickup_time,
          facility_id,
          status
        )
      `)
      .order('created_at', { ascending: false });
    
    if (invoicesError) {
      return NextResponse.json({ error: invoicesError.message }, { status: 500 });
    }
    
    // Calculate summary statistics
    const summary = {
      total_invoices: invoices.length,
      total_amount: invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
      pending_count: invoices.filter(inv => inv.status === 'pending').length,
      paid_count: invoices.filter(inv => inv.status === 'paid').length,
      overdue_count: invoices.filter(inv => {
        if (inv.status === 'pending' && inv.due_date) {
          return new Date(inv.due_date) < new Date();
        }
        return false;
      }).length
    };
    
    return NextResponse.json({ invoices, summary });
  } catch (error) {
    console.error('Error getting invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invoices - Create a new invoice
export async function POST(request) {
  const supabase = createRouteHandlerClient();
  
  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is dispatcher
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    
    if (profile.role !== 'dispatcher') {
      return NextResponse.json({ error: 'Access denied - Dispatcher only' }, { status: 403 });
    }
    
    const invoiceData = await request.json();
    
    // Get trip details to determine booking source
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        facility:facilities(name, contact_email),
        user_profile:profiles(first_name, last_name, email)
      `)
      .eq('id', invoiceData.trip_id)
      .single();
    
    if (tripError) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    
    // Determine booking source and client details
    let bookingSource = 'unknown';
    let clientEmail = '';
    let facilityId = null;
    
    if (trip.managed_client_id && trip.facility_id) {
      bookingSource = 'facility_app';
      facilityId = trip.facility_id;
      clientEmail = trip.facility?.contact_email || '';
    } else if (trip.user_id) {
      bookingSource = 'booking_app';
      clientEmail = trip.user_profile?.email || '';
    }

    // Generate invoice number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoice_number = `CCT-${year}${month}${day}-${random}`;
    
    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number,
        trip_id: invoiceData.trip_id,
        user_id: trip.user_id,
        facility_id: facilityId,
        amount: invoiceData.amount || trip.price || 0,
        status: invoiceData.status || 'sent',
        payment_status: invoiceData.payment_status || 'pending',
        client_email: clientEmail,
        booking_source: bookingSource,
        issue_date: new Date().toISOString(),
        sent_at: invoiceData.sent_at || new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: `Transportation service: ${trip.pickup_address} → ${trip.destination_address}`,
        created_by: session.user.id
      })
      .select(`
        *,
        profiles!user_id (
          id,
          first_name,
          last_name,
          email
        ),
        trips (
          id,
          pickup_address,
          destination_address,
          pickup_time,
          status
        )
      `)
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Update trip with invoice reference
    await supabase
      .from('trips')
      .update({ invoice_id: invoice.id })
      .eq('id', trip.id);

    // Log invoice creation for ecosystem notification
    console.log(`📧 Invoice ${invoice_number} created for ${bookingSource} booking:`, {
      invoice_id: invoice.id,
      trip_id: trip.id,
      booking_source: bookingSource,
      facility: trip.facility?.name,
      client_email: clientEmail,
      amount: invoice.amount
    });

    return NextResponse.json(invoice);

  } catch (error) {
    console.error('Error in invoice creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
