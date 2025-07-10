import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import TripDetailsClient from './TripDetailsClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// This is a Server Component
export default async function TripDetailsPage({ params }) {
  try {
    // Await the params since it's a Promise in Next.js 15
    const { id: tripId } = await params;
    
    // Create server component client
    const supabase = createServerComponentClient({ cookies });

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      redirect('/login');
    }

    // Check if user is a dispatcher
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userProfile || userProfile.role !== 'dispatcher') {
      redirect('/login?error=Access denied. This application is only for dispatchers.');
    }

    // Fetch trip details first
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
      
    if (tripError || !trip) {
      console.error('Error fetching trip:', tripError);
      redirect('/dashboard?error=Trip not found');
    }

    // Then fetch related user profile if user_id exists
    if (trip.user_id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone_number, email')
        .eq('id', trip.user_id)
        .single();
      
      if (userProfile) {
        trip.user_profile = userProfile;
      }
    }

    // Also fetch managed client info if managed_client_id exists
    if (trip.managed_client_id) {
      const { data: managedClient } = await supabase
        .from('managed_clients')
        .select('first_name, last_name, phone_number, email, date_of_birth')
        .eq('id', trip.managed_client_id)
        .single();
      
      if (managedClient) {
        trip.managed_client = managedClient;
      }
    }

    // Then fetch related facility if facility_id exists
    if (trip.facility_id) {
      const { data: facility } = await supabase
        .from('facilities')
        .select('id, name, contact_email, phone_number')
        .eq('id', trip.facility_id)
        .single();
      
      if (facility) {
        trip.facility = facility;
      }
    }

    // Set client name from joined data if not already set
    if (!trip.client_name) {
      if (trip.user_profile) {
        trip.client_name = `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim() || 
                          `Client ${trip.user_id?.substring(0, 8) || 'Unknown'}`;
      } else if (trip.managed_client) {
        trip.client_name = `${trip.managed_client.first_name || ''} ${trip.managed_client.last_name || ''}`.trim() || 
                          `Managed Client ${trip.managed_client_id?.substring(0, 8) || 'Unknown'}`;
      }
    }
    
    // Set phone number from joined data if not already set
    if (!trip.phone_number) {
      if (trip.user_profile?.phone_number) {
        trip.phone_number = trip.user_profile.phone_number;
      } else if (trip.managed_client?.phone_number) {
        trip.phone_number = trip.managed_client.phone_number;
      }
    }

    // If trip has a last_edited_by, fetch editor information
    if (trip.last_edited_by) {
      const { data: editorData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', trip.last_edited_by)
        .single();
        
      if (editorData) {
        trip.editor = editorData;
      }
    }

    return <TripDetailsClient trip={trip} user={session.user} />;
  } catch (error) {
    console.error('Error in trip details page:', error);
    redirect('/dashboard?error=Failed to load trip details');
  }
}