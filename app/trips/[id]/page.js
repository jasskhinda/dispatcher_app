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

    // Fetch trip details with edit tracking
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        editor:last_edited_by(
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('Error fetching trip:', tripError);
      redirect('/dashboard?error=Trip not found');
    }

    // Try to get client name if not already set
    if (!trip.client_name && trip.user_id) {
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', trip.user_id)
        .single();
        
      if (clientProfile) {
        trip.client_name = `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 
                          `Client ${trip.user_id.substring(0, 4)}`;
      }
    }

    return <TripDetailsClient trip={trip} user={session.user} />;
  } catch (error) {
    console.error('Error in trip details page:', error);
    redirect('/dashboard?error=Failed to load trip details');
  }
}