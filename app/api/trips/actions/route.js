import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🚀 Trip actions API called [${requestId}] at ${new Date().toISOString()}`);
  console.log(`📡 Request URL: ${request.url}`);
  console.log(`📡 Request method: ${request.method}`);
  
  try {
    // Check environment variables first
    console.log(`🔍 Environment check [${requestId}]:`, {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      BOOKING_APP_URL: process.env.BOOKING_APP_URL || 'not set'
    });
    
    // Create Supabase client with proper error handling
    let supabase;
    try {
      supabase = createRouteHandlerClient({ cookies });
      console.log(`✅ Supabase client created successfully [${requestId}]`);
    } catch (supabaseError) {
      console.error(`❌ Failed to create Supabase client [${requestId}]:`, supabaseError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: supabaseError.message,
        requestId 
      }, { status: 500 });
    }

    // Get user session and verify dispatcher role
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error(`❌ Session error [${requestId}]:`, sessionError);
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: sessionError.message,
        requestId 
      }, { status: 401 });
    }
    
    if (!session) {
      console.error(`❌ No session found [${requestId}]`);
      return NextResponse.json({ 
        error: 'Unauthorized - No session',
        requestId 
      }, { status: 401 });
    }

    console.log(`✅ Session found for user [${requestId}]:`, session.user.email);

    // Check dispatcher role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ 
        error: 'Profile verification failed',
        details: profileError.message 
      }, { status: 500 });
    }

    if (!profile) {
      console.error('No profile found for user:', session.user.id);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    console.log('✅ Profile found:', profile.role, profile.first_name, profile.last_name);

    if (profile?.role !== 'dispatcher') {
      console.error('User role is not dispatcher:', profile?.role);
      return NextResponse.json({ error: 'Access denied - Dispatcher role required' }, { status: 403 });
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError.message 
      }, { status: 400 });
    }

    const { tripId, action, reason } = body;
    
    console.log('✅ Processing action:', { tripId: tripId?.slice(0, 8) + '...', action, reason });
    
    if (!tripId || !action) {
      return NextResponse.json({ 
        error: 'Trip ID and action are required',
        received: { tripId: !!tripId, action: !!action }
      }, { status: 400 });
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError) {
      console.error('Trip fetch error:', tripError);
      return NextResponse.json({ 
        error: 'Trip not found',
        details: tripError.message 
      }, { status: 404 });
    }

    if (!trip) {
      console.error('Trip not found:', tripId);
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    console.log('✅ Trip found:', trip.id, 'Status:', trip.status);

    // Handle different actions
    switch (action) {
      case 'approve':
        return await handleApprove(supabase, trip);
      case 'reject':
        return await handleReject(supabase, trip, reason);
      case 'complete':
        return await handleComplete(supabase, trip);
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          validActions: ['approve', 'reject', 'complete']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('🚨 Trip action error:', error);
    console.error('🚨 Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    let errorDetails = error.message;
    let statusCode = 500;
    
    if (error.message.includes('fetch')) {
      errorMessage = 'Payment system connection failed';
      errorDetails = 'Unable to connect to payment processing system. Please try again or use manual payment processing.';
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes('permission')) {
      errorMessage = 'Database permission error';
      errorDetails = 'Insufficient permissions to update trip. Please contact support if this persists.';
      statusCode = 403; // Forbidden
    } else if (error.message.includes('authentication')) {
      errorMessage = 'Authentication error';
      errorDetails = 'User authentication failed. Please try logging out and back in.';
      statusCode = 401; // Unauthorized
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout';
      errorDetails = 'Operation took too long to complete. Please try again.';
      statusCode = 504; // Gateway Timeout
    } else if (error.message.includes('status transition')) {
      errorMessage = 'Invalid trip status';
      errorDetails = error.message;
      statusCode = 400; // Bad Request
    } else if (error.message.includes('not found')) {
      errorMessage = 'Trip not found';
      errorDetails = 'The requested trip could not be found.';
      statusCode = 404; // Not Found
    }
    
    // Log the error with full details for debugging
    console.error('🚨 Detailed error information:', {
      message: errorMessage,
      details: errorDetails,
      status: statusCode,
      timestamp: new Date().toISOString(),
      requestId,
      stack: error.stack
    });

    // Return a user-friendly error response
    return NextResponse.json({
      error: errorMessage,
      details: errorDetails,
      requestId,
      suggestions: [
        statusCode === 503 ? "Try the manual payment process instead" : null,
        statusCode === 401 ? "Try logging out and back in" : null,
        statusCode === 504 ? "Try the action again" : null,
        "If the problem persists, contact support with the request ID"
      ].filter(Boolean),
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
}

async function handleApprove(supabase, trip) {
  console.log('🔄 Starting trip approval process for:', trip.id);
  console.log('Trip details:', { 
    user_id: trip.user_id, 
    facility_id: trip.facility_id, 
    payment_method_id: trip.payment_method_id,
    status: trip.status 
  });

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
        const chargeResponse = await fetch(`${bookingAppUrl}/api/stripe/charge-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tripId: trip.id }),
          // Reduced timeout to prevent long hangs
          signal: AbortSignal.timeout(8000) // 8 seconds instead of 15
        });

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

        const chargeResult = await chargeResponse.json();

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
        
        // FALLBACK: If payment processing completely fails, still approve the trip
        // This ensures dispatchers can approve trips even when payment system is down
        console.log('🔄 Payment failed - falling back to manual payment approval...');
        
        const { data: fallbackTrip, error: fallbackError } = await supabase
          .from('trips')
          .update({
            status: 'upcoming', // Approve without payment for manual handling
            payment_status: 'pending',
            payment_error: `Automatic payment failed: ${paymentError.message}. Manual payment required.`,
            approval_notes: 'Payment system unavailable - approved for manual payment processing'
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
            error: 'Payment system unavailable',
            fallback: true
          },
          warning: 'Trip approved but payment system is unavailable. Payment must be processed manually.',
          message: 'Trip approved - manual payment required'
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

async function handleReject(supabase, trip, reason) {
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

async function handleComplete(supabase, trip) {
  // Validate current status
  if (!['paid_in_progress', 'upcoming'].includes(trip.status)) {
    return NextResponse.json({
      error: 'Invalid status transition',
      details: `Cannot complete trip in status: ${trip.status}. Trip must be in 'paid_in_progress' or 'upcoming' status.`
    }, { status: 400 });
  }

  console.log('🔄 Starting trip completion process for:', trip.id);
  console.log('Current trip status:', trip.status);

  try {
    // Update trip to completed status
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
      console.error('Failed to update trip to completed status:', updateError);
      throw new Error(`Failed to complete trip: ${updateError.message}`);
    }

    console.log('✅ Trip completed successfully:', updatedTrip.id);

    // Return success response
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: 'Trip completed successfully',
      details: {
        previousStatus: trip.status,
        completedAt: updatedTrip.completed_at
      }
    });
  } catch (error) {
    console.error('❌ Error in handleComplete:', error);
    throw error; // Re-throw to be caught by main error handler
  }
}
