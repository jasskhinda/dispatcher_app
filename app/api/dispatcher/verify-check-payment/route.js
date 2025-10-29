import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { invoice_id, action } = await request.json();

    if (!invoice_id || !action) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has dispatcher role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['dispatcher', 'admin', 'super_admin'].includes(profile.role)) {
      return Response.json(
        { error: 'Access denied - dispatcher role required' },
        { status: 403 }
      );
    }

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('facility_invoices')
      .select('*, facilities(name)')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return Response.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    let newStatus, message, paymentNote;

    if (action === 'received') {
      // Mark as fully paid and verified
      newStatus = 'PAID WITH CHECK - VERIFIED';
      message = '✅ Check payment successfully received, deposited, and verified. Payment is now FULLY PAID.';
      paymentNote = `Check payment verified and deposited by dispatcher ${user.email} on ${new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}. Invoice marked as FULLY PAID.`;

      // Update invoice to PAID status
      const { error: updateError } = await supabase
        .from('facility_invoices')
        .update({
          payment_status: newStatus,
          payment_notes: paymentNote,
          payment_date: new Date().toISOString(),
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', invoice_id);

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return Response.json(
          { error: 'Failed to update invoice' },
          { status: 500 }
        );
      }

      // Update payment record
      await supabase
        .from('facility_invoice_payments')
        .update({
          status: 'completed',
          payment_note: paymentNote,
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('facility_id', invoice.facility_id)
        .eq('month', invoice.month)
        .eq('payment_method', 'check');

    } else if (action === 'has_issues') {
      // Mark as having issues
      newStatus = 'CHECK PAYMENT - HAS ISSUES';
      message = '⚠️ Check payment marked as having issues. Facility will be notified.';
      paymentNote = `Check payment marked as having issues by dispatcher ${user.email} on ${new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}. Facility needs to contact billing department.`;

      // Update invoice status
      const { error: updateError } = await supabase
        .from('facility_invoices')
        .update({
          payment_status: newStatus,
          payment_notes: paymentNote,
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', invoice_id);

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return Response.json(
          { error: 'Failed to update invoice' },
          { status: 500 }
        );
      }

      // Update payment record
      await supabase
        .from('facility_invoice_payments')
        .update({
          status: 'has_issues',
          payment_note: paymentNote,
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('facility_id', invoice.facility_id)
        .eq('month', invoice.month)
        .eq('payment_method', 'check');

    } else {
      return Response.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: message,
      new_status: newStatus
    });

  } catch (error) {
    console.error('Check payment verification error:', error);
    return Response.json(
      { error: error.message || 'Failed to verify check payment' },
      { status: 500 }
    );
  }
}
