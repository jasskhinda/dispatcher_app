/**
 * 🚀 PRODUCTION HOTFIX FOR DISPATCHER TRIP ACTIONS
 * 
 * This is an emergency fix for the "Internal server error" issue
 * Copy this entire content to replace the existing route.js file
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🚀 Trip actions API called [${requestId}] at ${new Date().toISOString()}`);
  
  try {
    // Enhanced error handling wrapper
    const handleError = (error, defaultMessage = 'An unexpected error occurred') => {
      console.error(`❌ Error in trip actions [${requestId}]:`, error);
      
      let statusCode = 500;
      let errorMessage = defaultMessage;
      let errorDetails = error.message || 'Unknown error';
      
      // Determine specific error types
      if (error.message?.includes('fetch')) {
        statusCode = 503;
        errorMessage = 'Payment system temporarily unavailable';
        errorDetails = 'Unable to connect to payment processing system';
      } else if (error.message?.includes('timeout')) {
        statusCode = 504;
        errorMessage = 'Request timeout';
        errorDetails = 'Operation took too long to complete';
      } else if (error.message?.includes('permission') || error.message?.includes('auth')) {
        statusCode = 403;
        errorMessage = 'Permission denied';
        errorDetails = 'Insufficient permissions to perform this action';
      }
      
      return NextResponse.json({
        error: errorMessage,
        details: errorDetails,
        requestId,
        timestamp: new Date().toISOString(),
        suggestions: [
          statusCode === 503 ? "Try again in a few moments" : null,
          statusCode === 504 ? "Try the action again" : null,
          statusCode === 403 ? "Contact support if this persists" : null
        ].filter(Boolean)
      }, { status: statusCode });
    };

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    console.log(`✅ Supabase client created [${requestId}]`);

    // Get and verify session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return handleError(sessionError, 'Authentication failed');
    }
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to perform this action',
        requestId 
      }, { status: 401 });
    }

    console.log(`✅ Session verified [${requestId}]: ${session.user.email}`);

    // Verify dispatcher role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return handleError(profileError, 'Profile verification failed');
    }

    if (profile?.role !== 'dispatcher') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Dispatcher role required for this action',
        requestId 
      }, { status: 403 });
    }

    console.log(`✅ Dispatcher verified [${requestId}]: ${profile.first_name} ${profile.last_name}`);

    // Parse request body
    const body = await request.json();
    const { tripId, action, reason } = body;
    
    if (!tripId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Trip ID and action are required',
        received: { tripId: !!tripId, action: !!action },
        requestId 
      }, { status: 400 });
    }

    console.log(`🔄 Processing [${requestId}]: ${action} for trip ${tripId.slice(0, 8)}...`);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return handleError(tripError || new Error('Trip not found'), 'Trip not found');
    }

    console.log(`✅ Trip found [${requestId}]: ${trip.id} - Status: ${trip.status}`);

    // Handle different actions with improved error handling
    switch (action) {
      case 'approve':
        return await handleApproveWithFallback(supabase, trip, requestId);
      case 'reject':
        return await handleReject(supabase, trip, reason, requestId);
      case 'complete':
        return await handleComplete(supabase, trip, requestId);
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          details: `Action '${action}' is not supported`,
          validActions: ['approve', 'reject', 'complete'],
          requestId 
        }, { status: 400 });
    }

  } catch (error) {
    console.error(`🚨 Unhandled error [${requestId}]:`, error);
    return NextResponse.json({
      error: 'Internal server error',
      details: 'An unexpected error occurred while processing your request',
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Enhanced approve handler with robust fallback
async function handleApproveWithFallback(supabase, trip, requestId) {
  console.log(`🔄 Starting approval process [${requestId}] for trip: ${trip.id}`);

  // Validate trip status
  if (trip.status !== 'pending') {
    return NextResponse.json({
      error: 'Invalid trip status',
      details: `Cannot approve trip in status: ${trip.status}. Trip must be pending.`,
      currentStatus: trip.status,
      requestId
    }, { status: 400 });
  }

  try {
    // First, update trip to approved_pending_payment
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'approved_pending_payment',
        driver_name: trip.driver_name || 'Assigned Driver',
        vehicle: trip.vehicle || 'Standard Accessible Vehicle',
        updated_at: new Date().toISOString(),
        approval_notes: `Approved by dispatcher at ${new Date().toLocaleString()}`
      })
      .eq('id', trip.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update trip status: ${updateError.message}`);
    }

    console.log(`✅ Trip updated to approved_pending_payment [${requestId}]`);

    // Check if this is an individual trip that needs payment processing
    if (trip.user_id && !trip.facility_id && trip.payment_method_id) {
      console.log(`🔄 Individual trip with payment method - attempting payment [${requestId}]`);
      
      // Try payment processing with timeout and fallback
      try {
        const paymentResult = await processPaymentWithTimeout(trip.id, requestId);
        
        if (paymentResult.success) {
          // Payment successful - update to paid_in_progress
          const { data: paidTrip, error: paymentUpdateError } = await supabase
            .from('trips')
            .update({
              status: 'paid_in_progress',
              payment_status: 'paid',
              payment_intent_id: paymentResult.paymentIntentId,
              charged_at: new Date().toISOString(),
              payment_amount: paymentResult.amount
            })
            .eq('id', trip.id)
            .select()
            .single();

          return NextResponse.json({
            success: true,
            trip: paidTrip || updatedTrip,
            payment: {
              charged: true,
              status: 'paid',
              amount: paymentResult.amount
            },
            message: 'Trip approved and payment processed successfully',
            requestId
          });
        } else {
          throw new Error(paymentResult.error || 'Payment processing failed');
        }
        
      } catch (paymentError) {
        console.log(`⚠️ Payment failed [${requestId}], using fallback approval:`, paymentError.message);
        
        // FALLBACK: Approve trip without payment for manual processing
        const { data: fallbackTrip, error: fallbackError } = await supabase
          .from('trips')
          .update({
            status: 'upcoming',
            payment_status: 'pending',
            payment_error: `Automatic payment failed: ${paymentError.message}`,
            approval_notes: 'Payment system unavailable - approved for manual payment processing'
          })
          .eq('id', trip.id)
          .select()
          .single();

        if (fallbackError) {
          throw new Error(`Fallback approval failed: ${fallbackError.message}`);
        }

        return NextResponse.json({
          success: true,
          trip: fallbackTrip,
          payment: {
            charged: false,
            status: 'pending',
            error: 'Payment system temporarily unavailable',
            fallback: true
          },
          warning: 'Trip approved successfully, but payment system is temporarily unavailable. Payment will need to be processed manually.',
          message: 'Trip approved - manual payment required',
          requestId
        });
      }
    } else {
      // Facility trip or trip without payment method
      console.log(`✅ Facility trip or no payment method [${requestId}] - approval complete`);
      
      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        payment: {
          charged: false,
          status: 'not_applicable',
          reason: trip.facility_id ? 'facility_billing' : 'no_payment_method'
        },
        message: 'Trip approved successfully',
        requestId
      });
    }

  } catch (error) {
    console.error(`❌ Approval failed [${requestId}]:`, error);
    throw error;
  }
}

// Payment processing with timeout
async function processPaymentWithTimeout(tripId, requestId) {
  const bookingAppUrl = process.env.BOOKING_APP_URL || 'https://booking.compassionatecaretransportation.com';
  
  console.log(`🔄 Attempting payment processing [${requestId}] via: ${bookingAppUrl}`);
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Payment processing timeout after 8 seconds')), 8000);
  });

  // Create fetch promise
  const fetchPromise = fetch(`${bookingAppUrl}/api/stripe/charge-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tripId })
  });

  try {
    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Payment API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        paymentIntentId: result.paymentIntent?.id,
        amount: result.trip?.amount || result.paymentIntent?.amount
      };
    } else {
      throw new Error(result.error || 'Payment processing failed');
    }
    
  } catch (error) {
    console.error(`❌ Payment processing error [${requestId}]:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Reject handler
async function handleReject(supabase, trip, reason, requestId) {
  const rejectionReason = reason || 'Rejected by dispatcher';

  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update({
      status: 'cancelled',
      cancellation_reason: rejectionReason,
      updated_at: new Date().toISOString()
    })
    .eq('id', trip.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to reject trip: ${updateError.message}`);
  }

  console.log(`✅ Trip rejected [${requestId}]: ${trip.id}`);

  return NextResponse.json({
    success: true,
    trip: updatedTrip,
    message: 'Trip rejected successfully',
    requestId
  });
}

// Complete handler
async function handleComplete(supabase, trip, requestId) {
  // Validate status
  if (!['paid_in_progress', 'upcoming'].includes(trip.status)) {
    return NextResponse.json({
      error: 'Invalid trip status',
      details: `Cannot complete trip in status: ${trip.status}. Trip must be 'paid_in_progress' or 'upcoming'.`,
      currentStatus: trip.status,
      requestId
    }, { status: 400 });
  }

  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completion_notes: `Completed by dispatcher at ${new Date().toLocaleString()}`
    })
    .eq('id', trip.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to complete trip: ${updateError.message}`);
  }

  console.log(`✅ Trip completed [${requestId}]: ${trip.id}`);

  return NextResponse.json({
    success: true,
    trip: updatedTrip,
    message: 'Trip completed successfully',
    requestId,
    details: {
      previousStatus: trip.status,
      completedAt: updatedTrip.completed_at
    }
  });
}
