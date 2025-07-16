import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🚀 Trip actions API called [${requestId}] at ${new Date().toISOString()}`);
  
  try {
    // Parse request body first to catch JSON errors early
    let body, tripId, action, reason;
    try {
      body = await request.json();
      ({ tripId, action, reason } = body);
      console.log(`📦 Request [${requestId}]:`, { tripId: tripId?.substring(0, 8) + '...', action, reason });
    } catch (parseError) {
      console.error(`❌ JSON parse error [${requestId}]:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError.message,
        requestId 
      }, { status: 400 });
    }
    
    if (!tripId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Both tripId and action are required',
        received: { tripId: !!tripId, action: !!action },
        requestId 
      }, { status: 400 });
    }

    // Create Supabase client with enhanced error handling
    let supabase;
    try {
      supabase = createRouteHandlerClient({ cookies });
      console.log(`✅ Supabase client created [${requestId}]`);
    } catch (clientError) {
      console.error(`❌ Supabase client creation failed [${requestId}]:`, clientError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: 'Unable to establish database connection',
        requestId
      }, { status: 503 });
    }

    // Get and verify session
    let session;
    try {
      const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`❌ Session error [${requestId}]:`, sessionError);
        return NextResponse.json({
          error: 'Authentication failed',
          details: sessionError.message,
          requestId
        }, { status: 401 });
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
      console.error(`❌ Session check failed [${requestId}]:`, sessionErr);
      return NextResponse.json({
        error: 'Session validation failed',
        details: sessionErr.message,
        requestId
      }, { status: 401 });
    }

    // Verify dispatcher role
    let profile;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error(`❌ Profile error [${requestId}]:`, profileError);
        return NextResponse.json({
          error: 'Profile verification failed',
          details: profileError.message,
          requestId
        }, { status: 403 });
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
          details: `Dispatcher role required. Current role: ${profileData.role}`,
          requestId 
        }, { status: 403 });
      }

      profile = profileData;
      console.log(`✅ Dispatcher verified [${requestId}]: ${profile.first_name} ${profile.last_name}`);
    } catch (profileErr) {
      console.error(`❌ Profile check failed [${requestId}]:`, profileErr);
      return NextResponse.json({
        error: 'Profile validation failed',
        details: profileErr.message,
        requestId
      }, { status: 403 });
    }

    // Get trip details
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
            details: `No trip exists with ID: ${tripId}`,
            requestId
          }, { status: 404 });
        }
        return NextResponse.json({
          error: 'Database query failed',
          details: tripError.message,
          requestId
        }, { status: 500 });
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
      return NextResponse.json({
        error: 'Failed to fetch trip',
        details: tripErr.message,
        requestId
      }, { status: 500 });
    }

    // Handle different actions
    console.log(`🔄 Processing action [${requestId}]: ${action} for trip ${trip.id}`);
    
    switch (action) {
      case 'approve':
        return await handleApprove(supabase, trip, requestId);
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
      details: error.message,
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function handleApprove(supabase, trip, requestId) {
  console.log(`🔄 Approving trip [${requestId}]: ${trip.id}`);
  
  if (trip.status !== 'pending') {
    return NextResponse.json({
      error: 'Invalid status transition',
      details: `Cannot approve trip in status: ${trip.status}. Trip must be 'pending'.`,
      currentStatus: trip.status,
      requestId
    }, { status: 400 });
  }

  try {
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'upcoming',
        updated_at: new Date().toISOString()
      })
      .eq('id', trip.id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Approval update failed [${requestId}]:`, updateError);
      throw new Error(`Failed to approve trip: ${updateError.message}`);
    }

    console.log(`✅ Trip approved [${requestId}]: ${updatedTrip.id}`);
    
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: 'Trip approved successfully',
      details: {
        previousStatus: trip.status,
        newStatus: updatedTrip.status,
        requestId
      }
    });
  } catch (error) {
    console.error(`❌ Error in handleApprove [${requestId}]:`, error);
    throw error;
  }
}

async function handleReject(supabase, trip, reason, requestId) {
  console.log(`🔄 Rejecting trip [${requestId}]: ${trip.id}`);
  
  const rejectionReason = reason || 'Rejected by dispatcher';

  try {
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
      console.error(`❌ Rejection update failed [${requestId}]:`, updateError);
      throw new Error(`Failed to reject trip: ${updateError.message}`);
    }

    console.log(`✅ Trip rejected [${requestId}]: ${updatedTrip.id}`);
    
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: 'Trip rejected successfully',
      details: {
        previousStatus: trip.status,
        newStatus: updatedTrip.status,
        reason: rejectionReason,
        requestId
      }
    });
  } catch (error) {
    console.error(`❌ Error in handleReject [${requestId}]:`, error);
    throw error;
  }
}

async function handleComplete(supabase, trip, requestId) {
  console.log(`🔄 Completing trip [${requestId}]: ${trip.id}`);
  console.log(`   Current status: ${trip.status}`);
  
  // Allow completion from multiple statuses including in_progress
  const allowedStatuses = ['upcoming', 'in_progress', 'paid_in_progress', 'approved_pending_payment', 'in_process'];
  if (!allowedStatuses.includes(trip.status)) {
    console.error(`❌ Invalid status for completion [${requestId}]: ${trip.status}`);
    return NextResponse.json({
      error: 'Invalid status transition',
      details: `Cannot complete trip in status: ${trip.status}. Allowed statuses: ${allowedStatuses.join(', ')}`,
      currentStatus: trip.status,
      allowedStatuses,
      requestId
    }, { status: 400 });
  }

  try {
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', trip.id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Completion update failed [${requestId}]:`, updateError);
      throw new Error(`Failed to complete trip: ${updateError.message}`);
    }

    if (!updatedTrip) {
      console.error(`❌ No trip returned after completion [${requestId}]`);
      throw new Error('Trip update succeeded but no data returned');
    }

    // Update driver status back to available if there was a driver assigned
    if (trip.driver_id) {
      try {
        const { error: driverUpdateError } = await supabase
          .from('profiles')
          .update({ 
            status: 'available',
            updated_at: new Date().toISOString()
          })
          .eq('id', trip.driver_id);

        if (driverUpdateError) {
          console.warn(`⚠️ Driver status update failed [${requestId}]:`, driverUpdateError);
          // Don't fail the trip completion if driver update fails
        } else {
          console.log(`✅ Driver status updated to available [${requestId}]: ${trip.driver_id}`);
        }
      } catch (driverUpdateErr) {
        console.warn(`⚠️ Driver status update error [${requestId}]:`, driverUpdateErr);
      }
    }

    console.log(`✅ Trip completed [${requestId}]: ${updatedTrip.id}`);
    
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: 'Trip completed successfully',
      details: {
        previousStatus: trip.status,
        newStatus: updatedTrip.status,
        updatedAt: updatedTrip.updated_at,
        requestId
      }
    });
  } catch (error) {
    console.error(`❌ Error in handleComplete [${requestId}]:`, error);
    throw error;
  }
}