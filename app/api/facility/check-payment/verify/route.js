import { createRouteHandlerClient } from '@/lib/route-handler-client'

export async function GET() {
  try {
    // First check what cookies we're receiving
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-') ||
      cookie.name.includes('auth')
    )
    
    // Get the specific auth token cookie
    const authTokenCookie = cookieStore.get('sb-btzfgasugkycbavcwvnx-auth-token')
    let authTokenPreview = 'Not found'
    if (authTokenCookie) {
      authTokenPreview = authTokenCookie.value.substring(0, 50) + '...'
    }
    
    const supabase = await createRouteHandlerClient()
    
    // Test authentication without requiring it
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    return Response.json({ 
      message: 'Check verification API is accessible',
      debug: {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userEmail: session?.user?.email,
        hasUserData: !!userData?.user,
        userDataError: userError?.message,
        userDataEmail: userData?.user?.email,
        cookieCount: allCookies.length,
        supabaseCookieCount: supabaseCookies.length,
        cookieNames: allCookies.map(c => c.name),
        supabaseCookieNames: supabaseCookies.map(c => c.name),
        authTokenCookie: {
          exists: !!authTokenCookie,
          preview: authTokenPreview,
          length: authTokenCookie?.value?.length || 0
        }
      }
    })
  } catch (error) {
    return Response.json({ 
      message: 'API accessible but auth test failed',
      error: error.message,
      stack: error.stack
    })
  }
}

export async function POST(request) {
  try {
    console.log('Check verification API called')
    const requestBody = await request.json()
    console.log('Request body:', requestBody)
    
    const { facility_id, month, invoice_id, verification_action, verification_notes } = requestBody

    if (!facility_id || !month || !invoice_id || !verification_action) {
      console.log('Missing required fields:', { facility_id, month, invoice_id, verification_action })
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createRouteHandlerClient()

    // Verify user authentication and role
    console.log('Checking authentication...')
    
    // Try both session and getUser methods for debugging
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session check result:', { hasSession: !!session, sessionError, userEmail: session?.user?.email })
    
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('GetUser check result:', { userData: userData?.user?.email, userError })
    
    // Use session if available, otherwise fall back to userData
    const user = session?.user || userData?.user
    
    if (!user) {
      console.log('Authentication failed - no user found in session or getUser')
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user has dispatcher or admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !['dispatcher', 'admin'].includes(profile.role)) {
      console.log('Profile check failed:', { profileError, role: profile?.role })
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
        if (!['CHECK PAYMENT - BEING VERIFIED', 'CHECK PAYMENT - IN TRANSIT', 'CHECK PAYMENT - ALREADY SENT'].includes(currentInvoice.payment_status)) {
          return Response.json(
            { error: 'Check must be in verification status to mark as verified' },
            { status: 400 }
          )
        }
        newPaymentStatus = 'PAID WITH CHECK - VERIFIED'
        
        if (currentInvoice.payment_status === 'CHECK PAYMENT - ALREADY SENT') {
          auditNote = `Check payment verified by dispatcher on ${now.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}. Facility-reported sent check confirmed and payment process completed successfully.`
        } else {
          auditNote = `Check payment verified and deposited by dispatcher on ${now.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}. Payment process completed successfully.`
        }
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

      case 'check_received':
        newPaymentStatus = 'PAID WITH CHECK (BEING VERIFIED)'
        auditNote = `Check payment received by dispatcher on ${now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}. Check is now ready for verification processing.`
        break

      case 'mark_not_received':
        newPaymentStatus = 'CHECK PAYMENT - NOT RECEIVED'
        auditNote = `Check payment marked as not received by dispatcher on ${now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}. Facility will be contacted to resolve this issue.`
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
    console.log('Calling update_payment_status_with_audit with:', {
      p_invoice_id: invoice_id,
      p_new_status: newPaymentStatus,
      p_user_id: user.id,
      p_user_role: 'dispatcher',
      p_notes: auditNote
    })

    const { error: updateError } = await supabase.rpc('update_payment_status_with_audit', {
      p_invoice_id: invoice_id,
      p_new_status: newPaymentStatus,
      p_user_id: user.id,
      p_user_role: 'dispatcher',
      p_notes: auditNote
    })

    if (updateError) {
      console.error('Error updating payment status:', updateError)
      
      // If the function doesn't exist, try direct update instead
      if (updateError.code === '42883') { // function does not exist
        console.log('Function does not exist, trying direct update...')
        const { error: directUpdateError } = await supabase
          .from('facility_invoices')
          .update({ 
            payment_status: newPaymentStatus,
            payment_notes: auditNote,
            last_updated: new Date().toISOString()
          })
          .eq('id', invoice_id)
          
        if (directUpdateError) {
          console.error('Direct update also failed:', directUpdateError)
          return Response.json(
            { error: `Failed to update payment status: ${directUpdateError.message}` },
            { status: 500 }
          )
        }
      } else {
        return Response.json(
          { error: `Failed to update payment status: ${updateError.message}` },
          { status: 500 }
        )
      }
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
        verified_by: user.id,
        verification_date: verification_action === 'mark_verified' ? now.toISOString() : null
      })
      .eq('id', invoice_id)

    // Record check verification action in payment history with professional dates
    const { error: paymentHistoryError } = await supabase
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
        verified_by: user.id,
        verification_date: verification_action === 'mark_verified' ? now.toISOString() : null,
        // Professional date tracking
        received_date: verification_action === 'mark_received' ? now.toISOString() : null,
        verification_started_date: verification_action === 'mark_received' ? now.toISOString() : null,
        completed_date: verification_action === 'mark_verified' ? now.toISOString() : null,
        official_payment_date: verification_action === 'mark_verified' ? now.toISOString() : null
      })

    if (paymentHistoryError) {
      console.error('Error inserting payment history:', paymentHistoryError)
      // Don't fail the entire operation for payment history issues
    }

    return Response.json({
      success: true,
      new_payment_status: newPaymentStatus,
      message: getSuccessMessage(verification_action, newPaymentStatus),
      verification_details: {
        action: verification_action,
        notes: verification_notes,
        verified_by: user.id,
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
    case 'check_received':
      return 'Check payment received and ready for verification processing.'
    case 'mark_not_received':
      return 'Check payment marked as not received. Facility will be contacted to resolve this issue.'
    default:
      return 'Check verification action completed successfully.'
  }
}