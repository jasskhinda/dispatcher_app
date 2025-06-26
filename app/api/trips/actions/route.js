import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session and verify dispatcher role
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check dispatcher role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'dispatcher') {
      return NextResponse.json({ error: 'Access denied - Dispatcher only' }, { status: 403 });
    }

    const { tripId, action } = await request.json();
    
    if (!tripId || !action) {
      return NextResponse.json({ 
        error: 'Trip ID and action are required' 
      }, { status: 400 });
    }

    // Get trip details to determine if it's an individual BookingCCT trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Handle different actions
    switch (action) {
      case 'approve':
        return await handleApprove(supabase, trip);
      case 'reject':
        return await handleReject(supabase, trip, request);
      case 'complete':
        return await handleComplete(supabase, trip);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Trip action error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

async function handleApprove(supabase, trip) {
  // Update trip to approved status
  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update({
      status: 'upcoming',
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
      // Call the BookingCCT payment charging API
      const chargeResponse = await fetch(`${process.env.BOOKING_APP_URL || 'http://localhost:3000'}/api/stripe/charge-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId: trip.id }),
      });

      const chargeResult = await chargeResponse.json();

      if (chargeResponse.ok && chargeResult.success) {
        console.log('✅ Payment charged successfully for trip:', trip.id);
        return NextResponse.json({
          success: true,
          trip: updatedTrip,
          payment: {
            charged: true,
            status: 'paid',
            amount: chargeResult.trip.amount,
            paymentIntentId: chargeResult.paymentIntent.id
          },
          message: 'Trip approved and payment charged successfully'
        });
      } else {
        console.error('❌ Payment charging failed:', chargeResult);
        
        // Update trip with payment failure but keep it approved
        await supabase
          .from('trips')
          .update({
            payment_status: 'failed',
            payment_error: chargeResult.error || 'Payment charge failed'
          })
          .eq('id', trip.id);

        return NextResponse.json({
          success: true,
          trip: updatedTrip,
          payment: {
            charged: false,
            status: 'failed',
            error: chargeResult.error || 'Payment charge failed'
          },
          warning: 'Trip approved but payment charging failed. Please handle payment manually.',
          message: 'Trip approved with payment charging issue'
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

async function handleReject(supabase, trip, request) {
  const body = await request.json();
  const reason = body.reason || 'Rejected by dispatcher';

  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
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
