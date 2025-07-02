import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function POST(request) {
  try {
    const { facility_id, month, invoice_id, verification_action, verification_notes } = await request.json()

    if (!facility_id || !month || !invoice_id || !verification_action) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createRouteHandlerClient()

    // Verify user authentication and role
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user has dispatcher or admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !['dispatcher', 'admin'].includes(profile.role)) {
      return Response.json(
        { error: 'Access denied - dispatcher role required' },
        { status: 403 }
      )
    }

    // Get current invoice details
    const { data: currentInvoice, error: invoiceError } = await supabase
      .from('facility_invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !currentInvoice) {
      return Response.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    let newPaymentStatus, auditNote

    switch (verification_action) {
      case 'mark_received':
        if (currentInvoice.payment_status === 'CHECK PAYMENT - WILL MAIL') {
          newPaymentStatus = 'CHECK PAYMENT - IN TRANSIT'
          auditNote = `Check payment marked as received by dispatcher on ${now.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}. Check is now in transit for verification.`
        } else if (currentInvoice.payment_status === 'CHECK PAYMENT - IN TRANSIT') {
          newPaymentStatus = 'CHECK PAYMENT - BEING VERIFIED'
          auditNote = `Check payment received and marked for verification by dispatcher on ${now.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}. Beginning verification process.`
        } else {
          return Response.json(
            { error: 'Invalid status transition for mark_received action' },
            { status: 400 }
          )
        }
        break

      case 'mark_verified':
        if (!['CHECK PAYMENT - BEING VERIFIED', 'CHECK PAYMENT - IN TRANSIT'].includes(currentInvoice.payment_status)) {
          return Response.json(
            { error: 'Check must be in verification status to mark as verified' },
            { status: 400 }
          )
        }
        newPaymentStatus = 'PAID WITH CHECK - VERIFIED'
        auditNote = `Check payment verified and deposited by dispatcher on ${now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}. Payment process completed successfully.`
        break

      case 'mark_issues':
        newPaymentStatus = 'CHECK PAYMENT - HAS ISSUES'
        auditNote = `Check payment marked as having issues by dispatcher on ${now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}. Issues: ${verification_notes || 'No specific issues noted'}.`
        break

      case 'request_new_check':
        newPaymentStatus = 'CHECK PAYMENT - REPLACEMENT REQUESTED'
        auditNote = `Replacement check requested by dispatcher on ${now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}. Reason: ${verification_notes || 'No specific reason noted'}.`
        break

      default:
        return Response.json(
          { error: 'Invalid verification action' },
          { status: 400 }
        )
    }

    // Add verification notes if provided
    if (verification_notes) {
      auditNote += ` Dispatcher notes: ${verification_notes}`
    }

    // Update invoice with audit trail
    const { error: updateError } = await supabase.rpc('update_payment_status_with_audit', {
      p_invoice_id: invoice_id,
      p_new_status: newPaymentStatus,
      p_user_id: userData.user.id,
      p_user_role: 'dispatcher',
      p_notes: auditNote
    })

    if (updateError) {
      console.error('Error updating payment status:', updateError)
      return Response.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      )
    }

    // Also update the payment_notes field directly with dispatcher verification details
    const updatedNotes = currentInvoice.payment_notes 
      ? `${currentInvoice.payment_notes}\n\n[DISPATCHER VERIFICATION] ${auditNote}`
      : `[DISPATCHER VERIFICATION] ${auditNote}`

    await supabase
      .from('facility_invoices')
      .update({ 
        payment_notes: updatedNotes,
        last_updated: now.toISOString(),
        verified_by: userData.user.id,
        verification_date: verification_action === 'mark_verified' ? now.toISOString() : null
      })
      .eq('id', invoice_id)

    // Record check verification action in payment history
    await supabase
      .from('facility_invoice_payments')
      .insert({
        facility_id: facility_id,
        amount: currentInvoice.total_amount,
        payment_method: 'check_verification',
        month: month,
        status: verification_action === 'mark_verified' ? 'completed' : 'pending_verification',
        payment_note: auditNote,
        payment_date: now.toISOString(),
        verification_action: verification_action,
        verification_notes: verification_notes,
        verified_by: userData.user.id,
        verification_date: verification_action === 'mark_verified' ? now.toISOString() : null
      })

    return Response.json({
      success: true,
      new_payment_status: newPaymentStatus,
      message: getSuccessMessage(verification_action, newPaymentStatus),
      verification_details: {
        action: verification_action,
        notes: verification_notes,
        verified_by: userData.user.id,
        verified_at: now.toISOString(),
        previous_status: currentInvoice.payment_status
      }
    })

  } catch (error) {
    console.error('Check verification error:', error)
    return Response.json(
      { error: error.message || 'Check verification failed' },
      { status: 500 }
    )
  }
}

function getSuccessMessage(action, status) {
  switch (action) {
    case 'mark_received':
      return status === 'CHECK PAYMENT - IN TRANSIT' 
        ? 'Check marked as received and in transit for verification.'
        : 'Check received and ready for verification.'
    case 'mark_verified':
      return 'Check payment verified and marked as completed. Payment process finished successfully.'
    case 'mark_issues':
      return 'Check payment marked as having issues. Facility will be notified to resolve.'
    case 'request_new_check':
      return 'Replacement check requested. Facility will be notified to send a new check.'
    default:
      return 'Check verification action completed successfully.'
  }
}