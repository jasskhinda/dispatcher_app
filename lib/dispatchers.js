import { adminSupabase } from './admin-supabase';

// Use the centralized admin client from admin-supabase.js
const supabaseAdmin = adminSupabase;

/**
 * Fetch all users with the 'dispatcher' role
 * @returns {Promise<Array>} - Array of dispatcher users with their emails
 */
export async function getDispatchers() {
  try {
    // First get all profiles with 'dispatcher' role
    const { data: dispatcherProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'dispatcher');

    if (profilesError) {
      console.error('Error fetching dispatcher profiles:', profilesError);
      return [];
    }

    if (!dispatcherProfiles.length) {
      console.log('No dispatchers found in profiles table');
      return [];
    }

    // Get user emails from auth.users table using the service role key
    // In development, we'll use an alternative approach if service key isn't available
    const dispatcherIds = dispatcherProfiles.map(profile => profile.id);
    
    let dispatchers = [];
    
    try {
      // Try to use admin API first (requires service role key)
      const { data: usersData, error: usersError } = await supabaseAdmin
        .auth.admin.listUsers();
  
      if (!usersError) {
        // Filter to only users with IDs from our dispatcher profiles
        // and attach their profile data
        dispatchers = usersData.users
          .filter(user => dispatcherIds.includes(user.id))
          .map(user => {
            const profile = dispatcherProfiles.find(p => p.id === user.id);
            return {
              id: user.id,
              email: user.email,
              full_name: profile?.full_name || user.user_metadata?.full_name || 'Dispatcher',
            };
          });
      } else {
        console.warn('Admin API access denied. Falling back to profiles table only:', usersError.message);
        
        // Fallback to just using the profile data we have
        // Note: This won't have emails unless they're stored in profiles table
        dispatchers = dispatcherProfiles.map(profile => ({
          id: profile.id,
          email: profile.email || `${profile.id}@example.com`, // Fallback email that won't work
          full_name: profile.full_name || 'Dispatcher',
        }));
        
        console.log('Using dispatcher data from profiles only:', dispatchers);
      }
    } catch (error) {
      console.error('Error fetching dispatcher users:', error);
      
      // Fallback to just using the profile data we have
      dispatchers = dispatcherProfiles.map(profile => ({
        id: profile.id,
        email: profile.email || `${profile.id}@example.com`, // Fallback email that won't work
        full_name: profile.full_name || 'Dispatcher',
      }));
    }

    return dispatchers;
  } catch (error) {
    console.error('Error in getDispatchers function:', error);
    return [];
  }
}

/**
 * Get just the dispatcher email addresses
 * @returns {Promise<Array<string>>} - Array of dispatcher email addresses
 */
export async function getDispatcherEmails() {
  const dispatchers = await getDispatchers();
  return dispatchers.map(d => d.email);
}

/**
 * Get all users with the 'driver' role
 * @returns {Promise<Array>} - Array of driver users with their information
 */
export async function getDrivers() {
  try {
    // First get all profiles with 'driver' role
    const { data: driverProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, full_name, phone_number')
      .eq('role', 'driver');

    if (profilesError) {
      console.error('Error fetching driver profiles:', profilesError);
      return [];
    }

    if (!driverProfiles.length) {
      console.log('No drivers found in profiles table');
      return [];
    }

    // Get user emails from auth.users table using the service role key
    const driverIds = driverProfiles.map(profile => profile.id);
    
    let drivers = [];
    
    try {
      // Try to use admin API first (requires service role key)
      const { data: usersData, error: usersError } = await supabaseAdmin
        .auth.admin.listUsers();
  
      if (!usersError) {
        // Filter to only users with IDs from our driver profiles
        // and attach their profile data
        drivers = usersData.users
          .filter(user => driverIds.includes(user.id))
          .map(user => {
            const profile = driverProfiles.find(p => p.id === user.id);
            return {
              id: user.id,
              email: user.email,
              full_name: profile?.full_name || 
                (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : null) ||
                user.user_metadata?.full_name || 'Driver',
              first_name: profile?.first_name || user.user_metadata?.first_name,
              last_name: profile?.last_name || user.user_metadata?.last_name,
              phone_number: profile?.phone_number
            };
          });
      } else {
        console.warn('Admin API access denied. Falling back to profiles table only:', usersError.message);
        
        // Fallback to just using the profile data we have
        drivers = driverProfiles.map(profile => ({
          id: profile.id,
          email: profile.email || `${profile.id}@example.com`, // Fallback email
          full_name: profile.full_name || 
            (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : null) ||
            'Driver',
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone_number: profile.phone_number
        }));
      }
    } catch (error) {
      console.error('Error fetching driver users:', error);
      
      // Fallback to just using the profile data we have
      drivers = driverProfiles.map(profile => ({
        id: profile.id,
        email: profile.email || `${profile.id}@example.com`, // Fallback email
        full_name: profile.full_name || 
          (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : null) ||
          'Driver',
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone_number: profile.phone_number
      }));
    }

    return drivers;
  } catch (error) {
    console.error('Error in getDrivers function:', error);
    return [];
  }
}

/**
 * Assign a driver to a trip
 * @param {string} tripId - The ID of the trip to assign
 * @param {string} driverId - The ID of the driver user to assign
 * @param {string} vehicleInfo - Optional vehicle information
 * @returns {Promise<Object>} - The updated trip
 */
export async function assignDriverToTrip(tripId, driverId, vehicleInfo = '') {
  try {
    // Get driver info to set the driver_name as a fallback
    const { data: driverProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, full_name')
      .eq('id', driverId)
      .single();
    
    if (profileError) {
      console.error('Error fetching driver profile:', profileError);
      throw new Error('Could not fetch driver profile');
    }
    
    const driverName = driverProfile.full_name || 
      (driverProfile.first_name && driverProfile.last_name 
        ? `${driverProfile.first_name} ${driverProfile.last_name}`
        : 'Assigned Driver');
    
    // Update the trip with the driver assignment
    const { data: updatedTrip, error: updateError } = await supabaseAdmin
      .from('trips')
      .update({
        driver_id: driverId,
        driver_name: driverName, // Keep driver_name for backward compatibility
        vehicle: vehicleInfo,
        status: 'upcoming' // Update status from pending to upcoming
      })
      .eq('id', tripId)
      .select();
    
    if (updateError) {
      console.error('Error updating trip with driver:', updateError);
      throw new Error('Could not assign driver to trip');
    }
    
    return updatedTrip;
  } catch (error) {
    console.error('Error in assignDriverToTrip:', error);
    throw error;
  }
}