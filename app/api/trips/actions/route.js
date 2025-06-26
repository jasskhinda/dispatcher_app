import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  console.log('🚀 Trip actions API called');
  
  try {
    // Create Supabase client with proper error handling
    let supabase;
    try {
      supabase = createRouteHandlerClient({ cookies });
    } catch (supabaseError) {
      console.error('Failed to create Supabase client:', supabaseError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: supabaseError.message 
      }, { status: 500 });
    }

    // Get user session and verify dispatcher role
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: sessionError.message 
      }, { status: 401 });
    }
    
    if (!session) {
      console.error('No session found');
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    console.log('✅ Session found for user:', session.user.email);

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
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

async function handleApprove(supabase, trip) {
  // First set to approved_pending_payment status
  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update({
      status: 'approved_pending_payment',
      driver_name: 'Assigned Driver',
      vehicle: 'Standard Accessible Vehicle',
      updated_at: new Date().toISOString()
    })
    .eq('id', trip.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to approve trip: ${updateError.message}`);
  }

  // If this is an individual BookingCCT trip (has user_id, no facility_id, and has payment_method_id)
  if (trip.user_id && !trip.facility_id && trip.payment_method_id) {
    try {
      const bookingAppUrl = process.env.BOOKING_APP_URL || 'https://booking.compassionatecaretransportation.com';
      console.log(`🔍 Attempting to charge payment via: ${bookingAppUrl}/api/stripe/charge-payment`);
      
      // Call the BookingCCT payment charging API
      const chargeResponse = await fetch(`${bookingAppUrl}/api/stripe/charge-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId: trip.id }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const chargeResult = await chargeResponse.json();

      if (chargeResponse.ok && chargeResult.success) {
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
      
      // Update trip with payment failure
      await supabase
        .from('trips')
        .update({
          payment_status: 'failed',
          payment_error: 'Payment API unavailable'
        })
        .eq('id', trip.id);

      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        payment: {
          charged: false,
          status: 'failed',
          error: 'Payment API unavailable'
        },
        warning: 'Trip approved but payment system is unavailable. Please handle payment manually.',
        message: 'Trip approved with payment system issue'
      });
    }
  } else {
    // Facility trip or trip without payment method - no automatic charging
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
  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', trip.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to complete trip: ${updateError.message}`);
  }

  return NextResponse.json({
    success: true,
    trip: updatedTrip,
    message: 'Trip completed successfully'
  });
}
