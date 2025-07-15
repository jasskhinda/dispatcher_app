import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/admin-supabase';

export async function GET() {
  try {
    // Check user authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile to verify dispatcher role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'dispatcher') {
      return NextResponse.json({ error: 'Dispatcher access required' }, { status: 403 });
    }

    console.log('🔍 Fetching all trips for dispatcher dashboard...');

    // Use admin client to bypass RLS and get all trips
    const { data: tripsData, error: tripsError } = await adminSupabase
      .from('trips')
      .select(`
        *,
        user_profile:profiles(first_name, last_name, phone_number, email),
        facility:facilities(id, name, contact_email, phone_number),
        managed_client:facility_managed_clients(first_name, last_name, email, phone_number)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (tripsError) {
      console.error('❌ Trips error:', tripsError);
      
      // Fallback: Try basic query without joins
      const { data: basicTrips, error: basicError } = await adminSupabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (basicError) {
        console.error('❌ Basic trips error:', basicError);
        return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
      }

      console.log(`✅ Loaded ${basicTrips?.length || 0} trips via fallback query`);
      return NextResponse.json({ trips: basicTrips || [] });
    }

    console.log(`✅ Loaded ${tripsData?.length || 0} trips for dispatcher dashboard`);
    
    // Count trips by source
    const facilityTrips = tripsData?.filter(trip => trip.facility_id) || [];
    const individualTrips = tripsData?.filter(trip => !trip.facility_id && trip.user_id) || [];
    
    console.log(`📊 Trip sources breakdown:`);
    console.log(`   - Facility app trips: ${facilityTrips.length}`);
    console.log(`   - Individual bookings: ${individualTrips.length}`);
    console.log(`   - Total trips: ${tripsData?.length || 0}`);

    return NextResponse.json({ 
      trips: tripsData || [],
      stats: {
        total: tripsData?.length || 0,
        facility: facilityTrips.length,
        individual: individualTrips.length
      }
    });

  } catch (error) {
    console.error('Error in trips API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}