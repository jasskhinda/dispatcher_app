import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
const { notifyTripApproved, notifyTripCompleted, notifyTripCancelled } = require('@/lib/notifications');

// Helper function to send push notifications to dispatchers
async function sendPushNotification(tripId, action, source, tripDetails = {}) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_DISPATCHER_APP_URL || 'https://dispatch.compassionatecaretransportation.com'}/api/notifications/send-dispatcher-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId,
        action,
        source: source || 'dispatcher_app',
        tripDetails,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Dispatcher push notifications sent:', result);
    } else {
      console.error('❌ Failed to send dispatcher push notifications:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error sending dispatcher push notifications:', error);
  }
}

// Helper function to send push notifications to facility users
async function sendFacilityPushNotification(facilityId, title, body, data = {}) {
  try {
    if (!facilityId) {
      console.log('⚠️ No facilityId provided, skipping facility notification');
      return;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_DISPATCHER_APP_URL || 'https://dispatch.compassionatecaretransportation.com'}/api/notifications/send-facility-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facilityId,
        title,
        body,
        data,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Facility push notification sent:', result);
    } else {
      console.error('❌ Failed to send facility push notification:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error sending facility push notification:', error);
  }
}

// Helper function to enrich trip data with client and facility info
async function enrichTripData(trip, supabase) {
  const enrichedTrip = { ...trip };

  try {
    // Fetch client data if it's a managed client
    if (trip.managed_client_id) {
      const { data: clientData } = await supabase
        .from('facility_managed_clients')
        .select('first_name, last_name, email')
        .eq('id', trip.managed_client_id)
        .single();

      if (clientData) {
        enrichedTrip.client_info = clientData;
      }
    }

    // Fetch facility data if there's a facility_id
    if (trip.facility_id) {
      const { data: facilityData } = await supabase
        .from('facilities')
        .select('contact_email, name')
        .eq('id', trip.facility_id)
        .single();

      if (facilityData) {
        enrichedTrip.facility_info = facilityData;
      }
    }
  } catch (error) {
    console.log('Could not enrich trip data:', error.message);
  }

  return enrichedTrip;
}

export async function POST(request) {
  console.log('🚀 Simple trip actions API called');
  
  try {
    // Parse request body first
    const body = await request.json();
    const { tripId, action } = body;
    
    console.log('📦 Request:', { tripId, action });
    
    if (!tripId || !action) {
      return NextResponse.json({ 
        error: 'Missing tripId or action',
        received: { tripId, action }
      }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    console.log('✅ Supabase client created');

    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.log('✅ Session verified:', session.user.email);

    // Get trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('❌ Trip error:', tripError);
      return NextResponse.json({ 
        error: 'Trip not found',
        details: tripError?.message 
      }, { status: 404 });
    }
    console.log('✅ Trip found:', trip.id, 'Status:', trip.status);

    // Handle actions
    if (action === 'complete') {
      const { data: updatedTrip, error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'completed'
        })
        .eq('id', tripId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update error:', updateError);
        return NextResponse.json({
          error: 'Failed to update trip',
          details: updateError.message
        }, { status: 500 });
      }

      console.log('✅ Trip completed:', updatedTrip.id);

      // Enrich trip data and send notifications
      const enrichedTrip = await enrichTripData(updatedTrip, supabase);
      await notifyTripCompleted(updatedTrip, enrichedTrip).catch(err =>
        console.error('Error sending completion notifications:', err)
      );

      // Send push notification to dispatchers
      sendPushNotification(updatedTrip.id, 'completed', trip.managed_client_id ? 'facility_app' : 'booking_app', {
        pickup_address: trip.pickup_address,
      }).catch(err => console.error('Push notification failed:', err));

      // Send push notification to facility users (if facility trip)
      if (trip.facility_id) {
        const clientName = enrichedTrip.client_info
          ? `${enrichedTrip.client_info.first_name} ${enrichedTrip.client_info.last_name}`
          : 'Client';
        sendFacilityPushNotification(
          trip.facility_id,
          '✅ Trip Completed',
          `${clientName}'s trip has been completed successfully`,
          { tripId: updatedTrip.id, action: 'completed' }
        ).catch(err => console.error('Facility push notification failed:', err));
      }

      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        message: 'Trip completed successfully'
      });
    }

    if (action === 'approve') {
      const { data: updatedTrip, error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'upcoming',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update error:', updateError);
        return NextResponse.json({
          error: 'Failed to update trip',
          details: updateError.message
        }, { status: 500 });
      }

      console.log('✅ Trip approved:', updatedTrip.id);

      // Enrich trip data and send notifications
      const enrichedTrip = await enrichTripData(updatedTrip, supabase);
      await notifyTripApproved(updatedTrip, enrichedTrip).catch(err =>
        console.error('Error sending approval notifications:', err)
      );

      // Send push notification to dispatchers
      sendPushNotification(updatedTrip.id, 'approved', trip.managed_client_id ? 'facility_app' : 'booking_app', {
        pickup_address: trip.pickup_address,
      }).catch(err => console.error('Push notification failed:', err));

      // Send push notification to facility users (if facility trip)
      if (trip.facility_id) {
        const clientName = enrichedTrip.client_info
          ? `${enrichedTrip.client_info.first_name} ${enrichedTrip.client_info.last_name}`
          : 'Client';
        sendFacilityPushNotification(
          trip.facility_id,
          '✅ Trip Approved',
          `${clientName}'s trip has been approved and confirmed`,
          { tripId: updatedTrip.id, action: 'approved' }
        ).catch(err => console.error('Facility push notification failed:', err));
      }

      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        message: 'Trip approved successfully'
      });
    }

    if (action === 'cancel') {
      const { reason } = body;
      const { data: updatedTrip, error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update error:', updateError);
        return NextResponse.json({
          error: 'Failed to update trip',
          details: updateError.message
        }, { status: 500 });
      }

      console.log('✅ Trip cancelled:', updatedTrip.id);

      // Enrich trip data and send notifications
      const enrichedTrip = await enrichTripData(updatedTrip, supabase);
      await notifyTripCancelled(updatedTrip, enrichedTrip, reason).catch(err =>
        console.error('Error sending cancellation notifications:', err)
      );

      // Send push notification to dispatchers
      sendPushNotification(updatedTrip.id, 'cancelled', trip.managed_client_id ? 'facility_app' : 'booking_app', {
        pickup_address: trip.pickup_address,
      }).catch(err => console.error('Push notification failed:', err));

      // Send push notification to facility users (if facility trip)
      if (trip.facility_id) {
        const clientName = enrichedTrip.client_info
          ? `${enrichedTrip.client_info.first_name} ${enrichedTrip.client_info.last_name}`
          : 'Client';
        sendFacilityPushNotification(
          trip.facility_id,
          '❌ Trip Cancelled',
          `${clientName}'s trip has been cancelled${reason ? `: ${reason}` : ''}`,
          { tripId: updatedTrip.id, action: 'cancelled', reason }
        ).catch(err => console.error('Facility push notification failed:', err));
      }

      return NextResponse.json({
        success: true,
        trip: updatedTrip,
        message: 'Trip cancelled successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}