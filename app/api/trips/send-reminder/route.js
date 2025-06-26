import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createRouteHandlerClient();
  
  try {
    const { tripId } = await request.json();
    
    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Get user session and verify dispatcher access
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Only send reminders for payment failed trips
    if (trip.status !== 'payment_failed') {
      return NextResponse.json({ 
        error: 'Reminders can only be sent for trips with failed payments' 
      }, { status: 400 });
    }

    // Send reminder to BookingCCT app
    try {
      const reminderResponse = await fetch(`${process.env.BOOKING_APP_URL || 'http://localhost:3000'}/api/trips/payment-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tripId: trip.id,
          userEmail: trip.user_email || trip.passenger_email,
          amount: trip.price
        }),
      });

      const reminderResult = await reminderResponse.json();

      if (reminderResponse.ok && reminderResult.success) {
        // Update trip with reminder sent timestamp
        await supabase
          .from('trips')
          .update({
            payment_reminder_sent: new Date().toISOString(),
            payment_reminder_count: (trip.payment_reminder_count || 0) + 1
          })
          .eq('id', tripId);

        return NextResponse.json({
          success: true,
          message: 'Payment reminder sent successfully'
        });
      } else {
        throw new Error(reminderResult.error || 'Failed to send reminder');
      }
    } catch (reminderError) {
      console.error('Failed to send reminder:', reminderError);
      return NextResponse.json({
        error: 'Failed to send payment reminder',
        details: reminderError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Send reminder error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
