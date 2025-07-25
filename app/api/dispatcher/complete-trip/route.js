import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { tripId } = await request.json();
    
    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID required' }, { status: 400 });
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
    
    // Verify trip exists and can be completed
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
      
    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    
    // Check if trip can be completed
    if (!['in_progress', 'upcoming', 'awaiting_driver_acceptance'].includes(trip.status)) {
      return NextResponse.json({ 
        error: 'Trip cannot be completed from current status' 
      }, { status: 400 });
    }
    
    // Mark trip as completed
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId)
      .select('*')
      .single();
      
    if (updateError) {
      console.error('Error completing trip:', updateError);
      return NextResponse.json({ 
        error: 'Error completing trip',
        details: updateError.message
      }, { status: 500 });
    }
    
    // Update driver status back to active if they were on this trip
    if (trip.driver_id) {
      try {
        await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', trip.driver_id);
      } catch (error) {
        console.warn('Could not update driver status:', error.message);
      }
    }
    
    console.log(`Successfully completed trip ${tripId}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Trip completed successfully',
      data: {
        tripId,
        completedTrip: updatedTrip
      }
    });
    
  } catch (error) {
    console.error('Error in complete trip:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}