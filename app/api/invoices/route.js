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
    
    const body = await request.json();
    const { 
      user_id, 
      trip_id, 
      amount, 
      description, 
      notes,
      due_days = 30
    } = body;
    
    // Validate required fields
    if (!user_id || !amount) {
      return NextResponse.json({ error: 'user_id and amount are required' }, { status: 400 });
    }
    
    // Generate invoice number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoice_number = `DISP-${year}${month}${day}-${random}`;
    
    // Calculate due date
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + due_days);
    
    // Get trip details for description if trip_id provided
    let tripDetails = null;
    if (trip_id) {
      const { data: trip } = await supabase
        .from('trips')
        .select('pickup_address, destination_address, pickup_time')
        .eq('id', trip_id)
        .single();
      tripDetails = trip;
    }
    
    // Create auto-description if not provided
    const auto_description = description || (tripDetails ? 
      `Transportation service: ${tripDetails.pickup_address} → ${tripDetails.destination_address}` :
      'Transportation service'
    );
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id,
        trip_id: trip_id || null,
        invoice_number,
        amount: parseFloat(amount),
        status: 'pending',
        issue_date: new Date().toISOString(),
        due_date: due_date.toISOString(),
        description: auto_description,
        notes
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
          pickup_time
        )
      `)
      .single();
    
    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }
    
    // Update trip with invoice_id if trip_id was provided
    if (trip_id) {
      await supabase
        .from('trips')
        .update({ invoice_id: invoice.id })
        .eq('id', trip_id);
    }
    
    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
