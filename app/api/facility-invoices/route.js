import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

// GET /api/facility-invoices - Get all facility invoices for dispatcher review
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
    
    // Get status filter
    const status = searchParams.get('status') || 'all';
    
    // Build query for facility invoices
    let query = supabase
      .from('invoices')
      .select(`
        *,
        facilities!facility_id (
          id,
          name,
          email,
          contact_email,
          phone_number
        )
      `)
      .not('facility_id', 'is', null)
      .order('created_at', { ascending: false });
    
    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data: facilityInvoices, error: invoicesError } = await query;
    
    if (invoicesError) {
      return NextResponse.json({ error: invoicesError.message }, { status: 500 });
    }
    
    // Calculate summary statistics
    const summary = {
      total_invoices: facilityInvoices.length,
      total_amount: facilityInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || inv.amount || 0), 0),
      pending_approval: facilityInvoices.filter(inv => inv.status === 'pending_approval').length,
      approved: facilityInvoices.filter(inv => inv.status === 'approved').length,
      sent: facilityInvoices.filter(inv => inv.status === 'sent').length
    };
    
    return NextResponse.json({ invoices: facilityInvoices, summary });
  } catch (error) {
    console.error('Error getting facility invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/facility-invoices/[id]/approve - Approve facility invoice payment
export async function PUT(request) {
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
      .select('role, first_name, last_name')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    
    if (profile.role !== 'dispatcher') {
      return NextResponse.json({ error: 'Access denied - Dispatcher only' }, { status: 403 });
    }
    
    const body = await request.json();
    const { invoice_id, action, notes } = body;
    
    // Validate action
    const validActions = ['approve', 'reject'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject' }, { status: 400 });
    }
    
    // Get the invoice to verify it exists and is pending approval
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();
    
    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    if (invoice.status !== 'pending_approval') {
      return NextResponse.json({ error: 'Invoice is not pending approval' }, { status: 400 });
    }
    
    // Update invoice status
    const newStatus = action === 'approve' ? 'approved' : 'sent';
    const newPaymentStatus = action === 'approve' ? 'paid' : 'pending';
    
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: newStatus,
        payment_status: newPaymentStatus,
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
        dispatcher_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id)
      .select(`
        *,
        facilities!facility_id (
          id,
          name,
          email,
          contact_email
        )
      `)
      .single();
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      invoice: updatedInvoice,
      message: `Invoice ${action}d successfully by ${profile.first_name} ${profile.last_name}`
    });
  } catch (error) {
    console.error('Error approving facility invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
