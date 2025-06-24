import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

// GET /api/invoices/[id] - Get specific invoice details
export async function GET(request, { params }) {
  const { id } = await params;
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
    
    // Get invoice with all details
    const { data: invoice, error: invoiceError } = await supabase
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
          distance,
          status,
          facility_id
        )
      `)
      .eq('id', id)
      .single();
    
    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error getting invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/invoices/[id] - Update invoice status
export async function PUT(request, { params }) {
  const { id } = await params;
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
    const { status, payment_date, payment_method, notes } = body;
    
    // Validate status
    const validStatuses = ['pending', 'paid', 'cancelled', 'overdue'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (status) updateData.status = status;
    if (payment_date) updateData.payment_date = payment_date;
    if (payment_method) updateData.payment_method = payment_method;
    if (notes !== undefined) updateData.notes = notes;
    
    // Update invoice
    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
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
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id] - Delete invoice (dispatchers only)
export async function DELETE(request, { params }) {
  const { id } = await params;
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
    
    // Delete invoice
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
