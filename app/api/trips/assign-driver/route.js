import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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

    // Check driver availability status
    if (driver.status === 'on_trip') {
      console.error(`❌ Driver unavailable [${requestId}]: ${driver.first_name} ${driver.last_name} is currently on another trip`);
      return NextResponse.json({
        error: 'Driver is currently on another trip',
        details: `${driver.first_name} ${driver.last_name} is currently assigned to another trip and cannot be assigned to new trips until they complete their current trip.`,
        driverStatus: driver.status,
        requestId
      }, { status: 400 });
    }

    if (driver.status === 'offline') {
      console.error(`❌ Driver offline [${requestId}]: ${driver.first_name} ${driver.last_name} is offline`);
      return NextResponse.json({
        error: 'Driver is offline',
        details: `${driver.first_name} ${driver.last_name} is currently offline and unavailable for trip assignments.`,
        driverStatus: driver.status,
        requestId
      }, { status: 400 });
    }

    // Check for conflicting trips (optional - basic time conflict check)
    if (trip.pickup_time) {
      const { data: conflictingTrips, error: conflictError } = await supabase
        .from('trips')
        .select('id')
        .eq('driver_id', driverId)
        .in('status', ['confirmed', 'in_progress', 'upcoming'])
        .gte('pickup_time', new Date(trip.pickup_time).toISOString())
        .lte('pickup_time', new Date(new Date(trip.pickup_time).getTime() + 4 * 60 * 60 * 1000).toISOString()); // 4 hour window

      if (conflictError) {
        console.warn(`⚠️ Conflict check failed [${requestId}]:`, conflictError);
        // Continue with assignment despite conflict check failure
      } else if (conflictingTrips && conflictingTrips.length > 0) {
        console.warn(`⚠️ Driver has conflicting trips [${requestId}]:`, conflictingTrips);
        return NextResponse.json({ 
          error: 'Driver has conflicting trips at this time',
          details: `Driver ${driver.first_name} ${driver.last_name} has ${conflictingTrips.length} conflicting trip(s)`,
          conflictingTrips,
          requestId 
        }, { status: 400 });
      }
    }

    console.log(`🔄 Assigning trip [${requestId}]: ${tripId} to driver ${driverId}`);
    
    // Assign the trip to the driver
    const updateData = {
      driver_id: driverId,
      updated_at: new Date().toISOString()
    };

    // Update trip status to in_progress if it's upcoming
    if (trip.status === 'upcoming') {
      updateData.status = 'in_progress';
    }

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

    // Update driver status to indicate they're on a trip
    try {
      const { error: driverUpdateError } = await supabase
        .from('profiles')
        .update({ 
          status: 'on_trip',
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (driverUpdateError) {
        console.warn(`⚠️ Driver status update failed [${requestId}]:`, driverUpdateError);
        // Continue even if driver status update fails
      }
    } catch (driverUpdateErr) {
      console.warn(`⚠️ Driver status update error [${requestId}]:`, driverUpdateErr);
    }

    console.log(`✅ Successfully assigned trip [${requestId}]: ${tripId} to driver ${driverId}`);
    
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