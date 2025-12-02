import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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

// Helper function to send push notifications to drivers
async function sendDriverPushNotification(driverId, tripId, action, data = {}) {
  try {
    if (!driverId) {
      console.log('⚠️ No driverId provided, skipping driver notification');
      return;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_DISPATCHER_APP_URL || 'https://dispatch.compassionatecaretransportation.com'}/api/notifications/send-driver-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driverId,
        tripId,
        action,
        data,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Driver push notification sent:', result);
    } else {
      console.error('❌ Failed to send driver push notification:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error sending driver push notification:', error);
  }
}

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🚀 Driver assignment API called [${requestId}] at ${new Date().toISOString()}`);
  
  try {
    // Parse request body
    let body, tripId, driverId;
    try {
      body = await request.json();
      ({ tripId, driverId } = body);
      console.log(`📦 Assignment request [${requestId}]:`, { tripId: tripId?.substring(0, 8) + '...', driverId: driverId?.substring(0, 8) + '...' });
    } catch (parseError) {
      console.error(`❌ JSON parse error [${requestId}]:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError.message,
        requestId 
      }, { status: 400 });
    }
    
    if (!tripId || !driverId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Both tripId and driverId are required',
        received: { tripId: !!tripId, driverId: !!driverId },
        requestId 
      }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get and verify session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error(`❌ Session error [${requestId}]:`, sessionError);
      return NextResponse.json({
        error: 'Authentication required',
        details: sessionError?.message || 'Please log in to perform this action',
        requestId
      }, { status: 401 });
    }

    // Verify dispatcher role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error(`❌ Profile error [${requestId}]:`, profileError);
      return NextResponse.json({
        error: 'Profile verification failed',
        details: profileError?.message || 'User profile not found',
        requestId
      }, { status: 403 });
    }

    if (profile.role !== 'dispatcher') {
      console.error(`❌ Invalid role [${requestId}]: ${profile.role}`);
      return NextResponse.json({ 
        error: 'Access denied',
        details: `Dispatcher role required. Current role: ${profile.role}`,
        requestId 
      }, { status: 403 });
    }

    console.log(`✅ Dispatcher verified [${requestId}]: ${profile.first_name} ${profile.last_name}`);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error(`❌ Trip query error [${requestId}]:`, tripError);
      return NextResponse.json({
        error: 'Trip not found',
        details: tripError?.message || `No trip found with ID: ${tripId}`,
        requestId
      }, { status: 404 });
    }

    // Check if trip is already assigned
    if (trip.driver_id) {
      console.error(`❌ Trip already assigned [${requestId}]: ${trip.driver_id}`);
      return NextResponse.json({ 
        error: 'Trip is already assigned to another driver',
        details: `Trip ${tripId} is already assigned to driver ${trip.driver_id}`,
        requestId 
      }, { status: 400 });
    }

    // Check if trip status allows assignment
    if (!['pending', 'approved', 'confirmed', 'upcoming'].includes(trip.status)) {
      console.error(`❌ Invalid trip status [${requestId}]: ${trip.status}`);
      return NextResponse.json({ 
        error: 'Trip status does not allow assignment',
        details: `Cannot assign driver to trip with status: ${trip.status}`,
        currentStatus: trip.status,
        requestId 
      }, { status: 400 });
    }

    // Verify driver exists and is available
    const { data: driver, error: driverError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', driverId)
      .eq('role', 'driver')
      .single();

    if (driverError || !driver) {
      console.error(`❌ Driver query error [${requestId}]:`, driverError);
      return NextResponse.json({
        error: 'Driver not found',
        details: driverError?.message || `No driver found with ID: ${driverId}`,
        requestId
      }, { status: 404 });
    }

    // Log driver status for information but don't block assignment
    console.log(`ℹ️ Driver status [${requestId}]: ${driver.first_name} ${driver.last_name} is currently ${driver.status || 'available'}`);
    
    // Note: Removed status restrictions - drivers can be assigned trips regardless of current status

    // Note: Time conflict checking removed - drivers can be assigned multiple trips regardless of timing

    console.log(`🔄 Assigning trip [${requestId}]: ${tripId} to driver ${driverId}`);

    // Assign the trip to the driver
    // Note: Trip status remains unchanged - driver assignment is optional
    // driver_acceptance_status tracks whether driver accepted/rejected (separate from trip status)
    const updateData = {
      driver_id: driverId,
      driver_acceptance_status: 'pending', // Awaiting driver response
      updated_at: new Date().toISOString()
    };

    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Trip update failed [${requestId}]:`, updateError);
      return NextResponse.json({ 
        error: 'Failed to assign trip',
        details: updateError.message,
        code: updateError.code,
        requestId 
      }, { status: 500 });
    }

    // Note: Driver status will be updated to 'on_trip' when they accept the trip

    console.log(`✅ Successfully assigned trip [${requestId}]: ${tripId} to driver ${driverId}`);

    // Send push notification to dispatchers
    sendPushNotification(updatedTrip.id, 'driver_assigned', trip.managed_client_id ? 'facility_app' : 'booking_app', {
      pickup_address: trip.pickup_address,
      driver_name: `${driver.first_name} ${driver.last_name}`,
    }).catch(err => console.error('Push notification failed:', err));

    // Send push notification to facility users (if facility trip)
    if (trip.facility_id) {
      sendFacilityPushNotification(
        trip.facility_id,
        '🚗 Driver Assigned',
        `${driver.first_name} ${driver.last_name} has been assigned to the trip`,
        { tripId: updatedTrip.id, action: 'driver_assigned', driverName: `${driver.first_name} ${driver.last_name}` }
      ).catch(err => console.error('Facility push notification failed:', err));
    }

    // Send push notification to the assigned driver
    sendDriverPushNotification(
      driverId,
      updatedTrip.id,
      'trip_assigned',
      {
        pickupAddress: trip.pickup_address,
        dropoffAddress: trip.dropoff_address,
        pickupTime: trip.pickup_time,
      }
    ).catch(err => console.error('Driver push notification failed:', err));

    return NextResponse.json({
      success: true,
      message: `Trip successfully assigned to ${driver.first_name} ${driver.last_name}`,
      data: {
        tripId,
        driverId,
        driverName: `${driver.first_name} ${driver.last_name}`,
        previousStatus: trip.status,
        newStatus: updatedTrip.status,
        assignedTrip: updatedTrip,
        requestId
      }
    });

  } catch (error) {
    console.error(`🚨 Unhandled error [${requestId}]:`, error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}