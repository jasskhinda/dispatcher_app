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
  const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_TRIP_ACTIONS === 'true';
  
  console.log(`🚀 Trip actions API called [${requestId}] at ${new Date().toISOString()}`);
  
  if (DEBUG) {
    console.log(`🔍 [DEBUG] Request headers:`, Object.fromEntries(request.headers.entries()));
    console.log(`🔍 [DEBUG] Request method:`, request.method);
    console.log(`🔍 [DEBUG] Request URL:`, request.url);
  }
  
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
      } else if (error.message?.includes('JWTExpired') || error.message?.includes('JWT')) {
        statusCode = 401;
        errorMessage = 'Session expired';
        errorDetails = 'Please refresh the page and try again';
      }
      
      return NextResponse.json({
        error: errorMessage,
        details: errorDetails,
        requestId,
        timestamp: new Date().toISOString(),
        suggestions: [
          statusCode === 503 ? "Try again in a few moments" : null,
          statusCode === 504 ? "Try the action again" : null,
          statusCode === 403 ? "Contact support if this persists" : null,
          statusCode === 401 ? "Refresh the page and log in again" : null
        ].filter(Boolean)
      }, { status: statusCode });
    };

    // Create Supabase client with error handling
    let supabase;
    try {
      const cookieStore = cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      console.log(`✅ Supabase client created [${requestId}]`);
    } catch (clientError) {
      console.error(`❌ Failed to create Supabase client [${requestId}]:`, clientError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: 'Unable to establish database connection',
        requestId
      }, { status: 503 });
    }

    // Get and verify session with enhanced error handling
    let session;
    try {
      const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`❌ Session error [${requestId}]:`, sessionError);
        return handleError(sessionError, 'Authentication failed');
      }
      
      if (!sessionData) {
        console.error(`❌ No session found [${requestId}]`);
        return NextResponse.json({ 
          error: 'Authentication required',
          details: 'Please log in to perform this action',
          requestId 
        }, { status: 401 });
      }
      
      session = sessionData;
      console.log(`✅ Session verified [${requestId}]: ${session.user.email}`);
    } catch (sessionErr) {
      console.error(`❌ Session validation failed [${requestId}]:`, sessionErr);
      return handleError(sessionErr, 'Session validation failed');
    }

    // Verify dispatcher role with enhanced error handling
    let profile;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error(`❌ Profile error [${requestId}]:`, profileError);
        return handleError(profileError, 'Profile verification failed');
      }

      if (!profileData) {
        console.error(`❌ No profile found [${requestId}]`);
        return NextResponse.json({ 
          error: 'Profile not found',
          details: 'User profile does not exist',
          requestId 
        }, { status: 404 });
      }

      if (profileData.role !== 'dispatcher') {
        console.error(`❌ Invalid role [${requestId}]: ${profileData.role}`);
        return NextResponse.json({ 
          error: 'Access denied',
          details: 'Dispatcher role required for this action',
          requestId 
        }, { status: 403 });
      }

      profile = profileData;
      console.log(`✅ Dispatcher verified [${requestId}]: ${profile.first_name} ${profile.last_name}`);
    } catch (profileErr) {
      console.error(`❌ Profile validation failed [${requestId}]:`, profileErr);
      return handleError(profileErr, 'Profile validation failed');
    }

    // Parse request body with error handling
    let body, tripId, action, reason;
    try {
      body = await request.json();
      ({ tripId, action, reason } = body);
    } catch (parseError) {
      console.error(`❌ Request parsing failed [${requestId}]:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid request format',
        details: 'Request body must be valid JSON',
        requestId 
      }, { status: 400 });
    }
    
    if (!tripId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Trip ID and action are required',
        received: { tripId: !!tripId, action: !!action },
        requestId 
      }, { status: 400 });
    }

    console.log(`🔄 Processing [${requestId}]: ${action} for trip ${tripId.slice(0, 8)}...`);

    // Get trip details with enhanced error handling
    let trip;
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error(`❌ Trip query error [${requestId}]:`, tripError);
        if (tripError.code === 'PGRST116') {
          return NextResponse.json({
            error: 'Trip not found',
            details: `No trip found with ID: ${tripId}`,
            requestId
          }, { status: 404 });
        }
        return handleError(tripError, 'Failed to fetch trip details');
      }

      if (!tripData) {
        console.error(`❌ No trip data returned [${requestId}]`);
        return NextResponse.json({
          error: 'Trip not found',
          details: `No trip found with ID: ${tripId}`,
          requestId
        }, { status: 404 });
      }

      trip = tripData;
      console.log(`✅ Trip found [${requestId}]: ${trip.id} - Status: ${trip.status}`);
    } catch (tripErr) {
      console.error(`❌ Trip fetch failed [${requestId}]:`, tripErr);
      return handleError(tripErr, 'Failed to fetch trip details');
    }

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

async function handleApproveWithFallback(supabase, trip, requestId) {
  console.log(`🔄 Starting approval process for trip [${requestId}]:`, trip.id);

  // Validate current status
  if (trip.status !== 'pending') {
    return NextResponse.json({
      error: 'Invalid status transition',
      details: `Cannot approve trip in status: ${trip.status}. Trip must be in 'pending' status.`
    }, { status: 400 });
  }

  try {
    // First set to approved_pending_payment status
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
      console.error('❌ Failed to update trip to approved_pending_payment:', updateError);
      throw new Error(`Failed to approve trip: ${updateError.message}`);
    }

    console.log('✅ Trip updated to approved_pending_payment status');

    // If this is an individual BookingCCT trip (has user_id, no facility_id, and has payment_method_id)
    if (trip.user_id && !trip.facility_id && trip.payment_method_id) {
      console.log('🔄 This is an individual trip with payment method - attempting payment processing...');
      
      try {
        const bookingAppUrl = process.env.BOOKING_APP_URL || 'https://booking.compassionatecaretransportation.com';
        console.log(`🔍 Attempting to charge payment via: ${bookingAppUrl}/api/stripe/charge-payment`);
        
        // Call the BookingCCT payment charging API with enhanced error handling
        const chargeResult = await processPaymentWithTimeout(trip.id, bookingAppUrl, requestId);

        if (chargeResult.success) {
          console.log('✅ Payment charged successfully for trip:', trip.id);
          
          // Update trip status to "paid_in_progress" since payment was successful
          const { data: paidTrip, error: paymentUpdateError } = await supabase
            .from('trips')
            .update({
              status: 'paid_in_progress',
              payment_status: 'paid',
              payment_intent_id: chargeResult.paymentIntent.id,
              charged_at: new Date().toISOString(),
              payment_amount: chargeResult.trip.amount
            })
            .eq('id', trip.id)
            .select()
            .single();

          if (paymentUpdateError) {
            console.error('Failed to update trip with payment info:', paymentUpdateError);
          }

          return NextResponse.json({
            success: true,
            trip: paidTrip || updatedTrip,
            payment: {
              charged: true,
              status: 'paid',
              amount: chargeResult.trip.amount,
              paymentIntentId: chargeResult.paymentIntent.id
            },
            message: 'Trip approved and payment processed successfully - Status: PAID & IN PROGRESS'
          });
        } else {
          console.error('❌ Payment charging failed:', chargeResult);
          
          // Update trip with payment failure status
          const { data: failedTrip, error: failureUpdateError } = await supabase
            .from('trips')
            .update({
              status: 'payment_failed',
              payment_status: 'failed',
              payment_error: chargeResult.error || 'Payment charge failed'
            })
            .eq('id', trip.id)
            .select()
            .single();

          return NextResponse.json({
            success: true,
            trip: failedTrip || updatedTrip,
            payment: {
              charged: false,
              status: 'failed',
              error: chargeResult.error || 'Payment charge failed'
            },
            warning: 'Trip approved but payment failed. Client needs to retry payment.',
            message: 'Trip approved but payment failed'
          });
        }
      } catch (paymentError) {
        console.error('Payment charging request failed:', paymentError);
        console.error('Payment error details:', {
          name: paymentError.name,
          message: paymentError.message,
          stack: paymentError.stack
        });
        
        // Determine error type for better user feedback
        let errorType = 'unknown';
        let userMessage = 'Payment system temporarily unavailable';
        
        if (paymentError.message.includes('timeout')) {
          errorType = 'timeout';
          userMessage = 'Payment system is taking too long to respond';
        } else if (paymentError.message.includes('fetch') || paymentError.message.includes('network')) {
          errorType = 'network';
          userMessage = 'Unable to connect to payment system';
        } else if (paymentError.message.includes('ECONNREFUSED')) {
          errorType = 'connection_refused';
          userMessage = 'Payment service is temporarily down';
        }
        
        console.log(`🔄 Payment failed (${errorType}) - falling back to manual payment approval...`);
        
        const { data: fallbackTrip, error: fallbackError } = await supabase
          .from('trips')
          .update({
            status: 'upcoming', // Approve without payment for manual handling
            payment_status: 'pending',
            payment_error: `Automatic payment failed: ${userMessage}. Manual payment required.`,
            approval_notes: `Payment system unavailable (${errorType}) - approved for manual payment processing`
          })
          .eq('id', trip.id)
          .select()
          .single();

        if (fallbackError) {
          console.error('❌ Fallback approval also failed:', fallbackError);
          throw new Error(`Both payment processing and fallback approval failed: ${fallbackError.message}`);
        }

        return NextResponse.json({
          success: true,
          trip: fallbackTrip,
          payment: {
            charged: false,
            status: 'pending',
            error: userMessage,
            fallback: true,
            errorType
          },
          warning: `Trip approved successfully, but ${userMessage.toLowerCase()}. Payment will need to be processed manually.`,
          message: `Trip approved - manual payment required due to ${errorType}`
        });
      }
    } else {
      // Facility trip or trip without payment method - no automatic charging
      console.log('🔄 This is a facility trip or trip without payment method - no automatic charging required');
      
      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        payment: {
          charged: false,
          status: 'not_applicable',
          reason: trip.facility_id ? 'facility_billing' : 'no_payment_method'
        },
        message: 'Trip approved successfully'
      });
    }
  } catch (error) {
    console.error('❌ Error in handleApprove:', error);
    throw error; // Re-throw to be caught by main error handler
  }
}

async function processPaymentWithTimeout(tripId, bookingAppUrl, requestId) {
  // Create a timeout promise that rejects after 8 seconds
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Payment API timeout after 8 seconds')), 8000);
  });

  const fetchPromise = fetch(`${bookingAppUrl}/api/stripe/charge-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tripId })
  });

  // Race between the fetch and timeout
  const chargeResponse = await Promise.race([fetchPromise, timeoutPromise]);

  // Check if the response is ok before trying to parse JSON
  if (!chargeResponse.ok) {
    console.error(`❌ Payment API returned status ${chargeResponse.status}`);
    const errorText = await chargeResponse.text();
    console.error(`❌ Payment API error response: ${errorText}`);
    
    // Provide specific error messages based on status codes
    let errorMessage = `Payment API returned ${chargeResponse.status}`;
    if (chargeResponse.status === 400) {
      errorMessage = `Payment validation failed: ${errorText}`;
    } else if (chargeResponse.status === 401) {
      errorMessage = 'Payment API authentication failed';
    } else if (chargeResponse.status === 404) {
      errorMessage = 'Trip not found in payment system';
    } else if (chargeResponse.status >= 500) {
      errorMessage = 'Payment system internal error';
    }
    
    throw new Error(errorMessage);
  }

  return chargeResponse.json();
}

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

  return NextResponse.json({
    success: true,
    trip: updatedTrip,
    message: 'Trip rejected successfully'
  });
}

async function handleComplete(supabase, trip, requestId) {
  console.log(`🔄 Starting completion for trip [${requestId}]: ${trip.id}`);
  console.log(`   Current status: ${trip.status}`);
  console.log(`   Trip details:`, {
    id: trip.id,
    status: trip.status,
    user_id: trip.user_id,
    facility_id: trip.facility_id,
    payment_status: trip.payment_status
  });

  // Validate current status - allow more statuses for completion
  const allowedStatuses = ['paid_in_progress', 'upcoming', 'approved_pending_payment', 'in_process'];
  if (!allowedStatuses.includes(trip.status)) {
    console.error(`❌ Invalid status transition [${requestId}]: ${trip.status} not in allowed statuses: ${allowedStatuses.join(', ')}`);
    return NextResponse.json({
      error: 'Invalid status transition',
      details: `Cannot complete trip in status: ${trip.status}. Trip must be in one of: ${allowedStatuses.join(', ')}`
    }, { status: 400 });
  }

  try {
    console.log(`🔄 Updating trip status to completed [${requestId}]...`);
    
    // Update trip to completed status
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completion_notes: `Completed by dispatcher at ${new Date().toLocaleString()} [${requestId}]`
      })
      .eq('id', trip.id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Database update failed [${requestId}]:`, updateError);
      throw new Error(`Failed to complete trip: ${updateError.message}`);
    }

    if (!updatedTrip) {
      console.error(`❌ No trip returned after update [${requestId}]`);
      throw new Error('Trip update succeeded but no data returned');
    }

    console.log(`✅ Trip completed successfully [${requestId}]:`, {
      id: updatedTrip.id,
      previousStatus: trip.status,
      newStatus: updatedTrip.status,
      completedAt: updatedTrip.completed_at
    });

    // Return success response
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: 'Trip completed successfully',
      details: {
        previousStatus: trip.status,
        newStatus: updatedTrip.status,
        completedAt: updatedTrip.completed_at,
        requestId
      }
    });
  } catch (error) {
    console.error(`❌ Error in handleComplete [${requestId}]:`, error);
    throw error; // Re-throw to be caught by main error handler
  }
}
