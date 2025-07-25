import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeAssignmentToken } from '@/lib/emailService';

// Use service role key for this operation since drivers might not be logged in via the web
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔄 Trip response API called [${requestId}] at ${new Date().toISOString()}`);
  
  try {
    // Parse request body
    const body = await request.json();
    const { token, action } = body;
    
    console.log(`📦 Trip response [${requestId}]:`, { 
      hasToken: !!token, 
      action,
      tokenPreview: token?.substring(0, 20) + '...' 
    });

    if (!token || !action) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'Both token and action are required',
        requestId
      }, { status: 400 });
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({
        error: 'Invalid action',
        details: 'Action must be either "accept" or "reject"',
        requestId
      }, { status: 400 });
    }

    // Decode and validate token
    let tokenData;
    try {
      tokenData = decodeAssignmentToken(token);
      console.log(`🔓 Token decoded [${requestId}]:`, { 
        tripId: tokenData.tripId?.substring(0, 8) + '...',
        driverId: tokenData.driverId?.substring(0, 8) + '...',
        age: Date.now() - tokenData.timestamp
      });
    } catch (tokenError) {
      console.error(`❌ Token decode error [${requestId}]:`, tokenError);
      return NextResponse.json({
        error: 'Invalid or expired token',
        details: tokenError.message,
        requestId
      }, { status: 400 });
    }

    const { tripId, driverId } = tokenData;

    // Get trip details to verify it's still assignable
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error(`❌ Trip query error [${requestId}]:`, tripError);
      return NextResponse.json({
        error: 'Trip not found',
        details: 'The trip may have been cancelled or no longer exists',
        requestId
      }, { status: 404 });
    }

    // Verify the trip is assigned to this driver
    if (trip.driver_id !== driverId) {
      console.error(`❌ Driver mismatch [${requestId}]:`, { 
        expectedDriver: driverId?.substring(0, 8) + '...',
        actualDriver: trip.driver_id?.substring(0, 8) + '...' 
      });
      return NextResponse.json({
        error: 'Trip assignment mismatch',
        details: 'This trip is not assigned to you or has been reassigned',
        requestId
      }, { status: 403 });
    }

    // Check if trip is in a state that allows response
    if (!['confirmed', 'upcoming', 'in_progress', 'awaiting_driver_acceptance'].includes(trip.status)) {
      console.error(`❌ Invalid trip status [${requestId}]:`, trip.status);
      return NextResponse.json({
        error: 'Trip cannot be modified',
        details: `Trip status "${trip.status}" does not allow acceptance or rejection`,
        requestId
      }, { status: 400 });
    }

    // Get driver details
    const { data: driver, error: driverError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      console.error(`❌ Driver query error [${requestId}]:`, driverError);
      return NextResponse.json({
        error: 'Driver not found',
        details: 'Driver profile not found',
        requestId
      }, { status: 404 });
    }

    if (action === 'accept') {
      // Driver accepts the trip
      console.log(`✅ Driver accepting trip [${requestId}]`);
      
      // Update trip status to in_progress when driver accepts
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'in_progress',
          driver_response: 'accepted',
          driver_response_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (updateError) {
        console.error(`❌ Trip update failed [${requestId}]:`, updateError);
        return NextResponse.json({
          error: 'Failed to accept trip',
          details: updateError.message,
          requestId
        }, { status: 500 });
      }

      // Update driver status
      const { error: driverUpdateError } = await supabase
        .from('profiles')
        .update({
          status: 'on_trip',
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (driverUpdateError) {
        console.warn(`⚠️ Driver status update failed [${requestId}]:`, driverUpdateError);
      }

      console.log(`✅ Trip accepted successfully [${requestId}]`);
      
      return NextResponse.json({
        success: true,
        message: `Trip accepted successfully! You are now assigned to this trip.`,
        action: 'accept',
        tripDetails: {
          id: trip.id,
          pickup_location: trip.pickup_location,
          dropoff_location: trip.dropoff_location,
          pickup_time: trip.pickup_time,
          client_name: trip.client_name
        },
        requestId
      });

    } else if (action === 'reject') {
      // Driver rejects the trip
      console.log(`❌ Driver rejecting trip [${requestId}]`);
      
      // Remove driver assignment and set trip back to upcoming for reassignment
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          driver_id: null,
          status: 'upcoming',
          driver_response: 'rejected',
          rejected_by_driver_id: driverId,
          driver_response_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (updateError) {
        console.error(`❌ Trip update failed [${requestId}]:`, updateError);
        return NextResponse.json({
          error: 'Failed to reject trip',
          details: updateError.message,
          requestId
        }, { status: 500 });
      }

      // Update driver status back to available
      const { error: driverUpdateError } = await supabase
        .from('profiles')
        .update({
          status: 'available',
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (driverUpdateError) {
        console.warn(`⚠️ Driver status update failed [${requestId}]:`, driverUpdateError);
      }

      console.log(`✅ Trip rejected successfully [${requestId}]`);
      
      return NextResponse.json({
        success: true,
        message: `Trip declined successfully. It will be reassigned to another driver.`,
        action: 'reject',
        tripDetails: {
          id: trip.id,
          pickup_location: trip.pickup_location,
          dropoff_location: trip.dropoff_location,
          pickup_time: trip.pickup_time,
          client_name: trip.client_name
        },
        requestId
      });
    }

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