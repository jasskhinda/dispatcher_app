import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🔧 Driver status fix API called [${requestId}] at ${new Date().toISOString()}`);
  
  try {
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

    if (profileError || !profile || profile.role !== 'dispatcher') {
      console.error(`❌ Access denied [${requestId}]: ${profile?.role || 'No profile'}`);
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Dispatcher role required',
        requestId 
      }, { status: 403 });
    }

    console.log(`✅ Dispatcher verified [${requestId}]: ${profile.first_name} ${profile.last_name}`);

    // Find drivers who are marked as 'on_trip' but don't have any active trips
    const { data: driversOnTrip, error: driversError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, status')
      .eq('role', 'driver')
      .eq('status', 'on_trip');

    if (driversError) {
      console.error(`❌ Error fetching drivers [${requestId}]:`, driversError);
      return NextResponse.json({
        error: 'Failed to fetch drivers',
        details: driversError.message,
        requestId
      }, { status: 500 });
    }

    const fixedDrivers = [];
    
    for (const driver of driversOnTrip) {
      // Check if driver has any active trips
      const { data: activeTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id, status')
        .eq('driver_id', driver.id)
        .in('status', ['confirmed', 'in_progress', 'upcoming']);

      if (tripsError) {
        console.error(`❌ Error checking trips for driver ${driver.id} [${requestId}]:`, tripsError);
        continue;
      }

      // If no active trips, update driver status to available
      if (!activeTrips || activeTrips.length === 0) {
        console.log(`🔧 Fixing status for driver [${requestId}]: ${driver.first_name} ${driver.last_name}`);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            status: 'available',
            updated_at: new Date().toISOString()
          })
          .eq('id', driver.id);

        if (updateError) {
          console.error(`❌ Failed to update driver ${driver.id} [${requestId}]:`, updateError);
        } else {
          fixedDrivers.push({
            id: driver.id,
            name: `${driver.first_name} ${driver.last_name}`,
            previousStatus: 'on_trip',
            newStatus: 'available'
          });
          console.log(`✅ Fixed driver status [${requestId}]: ${driver.first_name} ${driver.last_name}`);
        }
      } else {
        console.log(`ℹ️ Driver has active trips [${requestId}]: ${driver.first_name} ${driver.last_name} (${activeTrips.length} trips)`);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Fixed ${fixedDrivers.length} driver status(es)`,
      data: {
        fixedDrivers,
        totalChecked: driversOnTrip.length,
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