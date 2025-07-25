import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { tripId, driverId } = await request.json();
    
    if (!tripId || !driverId) {
      return NextResponse.json({ error: 'Trip ID and Driver ID required' }, { status: 400 });
    }
    
    // Verify dispatcher access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.role !== 'dispatcher') {
      return NextResponse.json({ error: 'Forbidden - Dispatcher access required' }, { status: 403 });
    }
    
    // Verify trip exists and is available for assignment
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
      
    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    
    // Check if trip is already assigned
    if (trip.driver_id) {
      return NextResponse.json({ 
        error: 'Trip is already assigned to another driver' 
      }, { status: 400 });
    }
    
    // Check if trip status allows assignment
    if (!['pending', 'approved', 'confirmed', 'upcoming'].includes(trip.status)) {
      return NextResponse.json({ 
        error: 'Trip status does not allow assignment' 
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
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    // Check if driver is available (not on another trip at the same time)
    if (trip.pickup_time) {
      const { data: conflictingTrips } = await supabase
        .from('trips')
        .select('id')
        .eq('driver_id', driverId)
        .in('status', ['confirmed', 'in_progress'])
        .gte('pickup_time', new Date(trip.pickup_time).toISOString())
        .lte('pickup_time', new Date(new Date(trip.pickup_time).getTime() + 4 * 60 * 60 * 1000).toISOString()); // 4 hour window
        
      if (conflictingTrips && conflictingTrips.length > 0) {
        return NextResponse.json({ 
          error: 'Driver has conflicting trips at this time' 
        }, { status: 400 });
      }
    }
    
    console.log(`Assigning trip ${tripId} to driver ${driverId}`);
    console.log('Trip data:', { 
      id: trip.id, 
      status: trip.status, 
      driver_id: trip.driver_id,
      user_id: trip.user_id,
      managed_client_id: trip.managed_client_id,
      facility_id: trip.facility_id
    });
    
    // Assign the trip to the driver - use valid status values only
    const updateData = {
      driver_id: driverId,
      updated_at: new Date().toISOString()
    };
    
    // Set status to awaiting_driver_acceptance when assigning a driver
    // This ensures the driver has to accept the trip before it becomes active
    if (['pending', 'upcoming'].includes(trip.status)) {
      updateData.status = 'awaiting_driver_acceptance';
    }
    
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId)
      .select('*')
      .single();
      
    if (updateError) {
      console.error('Error assigning trip:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({ 
        error: 'Error assigning trip',
        details: updateError.message,
        code: updateError.code 
      }, { status: 500 });
    }
    
    // Optionally update driver status to indicate they're on a trip
    try {
      await supabase
        .from('profiles')
        .update({ status: 'on_trip' })
        .eq('id', driverId);
    } catch (error) {
      console.warn('Could not update driver status:', error.message);
    }
    
    console.log(`Successfully assigned trip ${tripId} to driver ${driverId}`);
    
    // Send email notification to driver
    try {
      console.log(`🔍 Attempting to send email notification for trip ${tripId}`);
      
      // Get driver email from profiles
      const { data: driverWithEmail, error: emailError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', driverId)
        .single();

      console.log(`📋 Driver email query result:`, {
        hasData: !!driverWithEmail,
        email: driverWithEmail?.email ? `${driverWithEmail.email.substring(0, 3)}***` : 'none',
        error: emailError?.message
      });

      if (driverWithEmail?.email) {
        console.log(`📧 Preparing to send email`);
        
        // Fetch client information based on trip type
        let clientName = 'Name not provided';
        let clientPhone = 'Phone not provided';
        
        if (updatedTrip.user_id) {
          // Individual client from BookingCCT
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, phone_number')
            .eq('id', updatedTrip.user_id)
            .single();
          
          if (userProfile) {
            clientName = userProfile.full_name || 'Name not provided';
            clientPhone = userProfile.phone_number || 'Phone not provided';
          }
        } else if (updatedTrip.managed_client_id) {
          // Facility client from facility_app
          const { data: managedClient } = await supabase
            .from('facility_managed_clients')
            .select('first_name, last_name, phone_number')
            .eq('id', updatedTrip.managed_client_id)
            .single();
          
          if (managedClient) {
            clientName = `${managedClient.first_name || ''} ${managedClient.last_name || ''}`.trim() || 'Name not provided';
            clientPhone = managedClient.phone_number || 'Phone not provided';
          }
        }
        const { sendDriverAssignmentEmail } = await import('@/lib/emailService');
        
        // Prepare driver info with email
        const driverInfoWithEmail = {
          ...driver,
          email: driverWithEmail.email
        };
        
        // Prepare trip info for email - map correct database field names
        const tripInfo = {
          pickup_time: updatedTrip.pickup_time,
          pickup_location: updatedTrip.pickup_address,
          dropoff_location: updatedTrip.destination_address,
          client_name: clientName,
          client_phone: clientPhone,
          special_instructions: updatedTrip.special_requirements,
          total_cost: updatedTrip.price,
          is_emergency: updatedTrip.is_emergency
        };
        
        console.log(`📬 Sending email to driver:`, {
          to: driverInfoWithEmail.email.substring(0, 3) + '***',
          hasPickupTime: !!tripInfo.pickup_time,
          hasLocations: !!(tripInfo.pickup_location && tripInfo.dropoff_location),
          tripData: {
            pickup_address: updatedTrip.pickup_address,
            destination_address: updatedTrip.destination_address,
            client_name: clientName,
            client_phone: clientPhone,
            user_id: updatedTrip.user_id,
            managed_client_id: updatedTrip.managed_client_id,
            price: updatedTrip.price
          }
        });
        
        // Send the email with trip ID for driver app link
        const emailResult = await sendDriverAssignmentEmail(driverInfoWithEmail, tripInfo, tripId);
        console.log(`✅ Email sent successfully:`, {
          messageId: emailResult.messageId,
          recipient: emailResult.recipient?.substring(0, 3) + '***'
        });
      } else {
        console.warn(`⚠️ No email found for driver - driverWithEmail:`, driverWithEmail);
      }
    } catch (emailError) {
      console.error(`❌ Failed to send email notification:`, {
        message: emailError.message,
        stack: emailError.stack,
        name: emailError.name
      });
      // Don't fail the assignment if email fails - just log the error
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Trip successfully assigned. Email notification sent.',
      data: {
        tripId,
        driverId,
        assignedTrip: updatedTrip
      }
    });
    
  } catch (error) {
    console.error('Error in trip assignment:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}