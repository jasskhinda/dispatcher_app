import { getDispatcherEmails } from './dispatchers';
import { sendEmailToMany } from './email';

/**
 * Format a date in a nice readable format
 * @param {string|Date} dateStr - Date to format
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

/**
 * Send a notification to all dispatchers about a new trip booking
 * @param {Object} trip - Trip data
 * @param {Object} user - User data who booked the trip
 * @returns {Promise<Object>} - Notification result
 */
export async function notifyDispatchersOfNewTrip(trip, user) {
  try {
    // Get all dispatcher emails
    const dispatcherEmails = await getDispatcherEmails();
    
    if (!dispatcherEmails.length) {
      console.warn('No dispatchers found to notify');
      
      // Return success in development environment to avoid blocking the user flow
      if (process.env.NODE_ENV !== 'production') {
        console.log('Development mode: Continuing without dispatcher notifications');
        return { 
          success: true, 
          info: 'Development mode - skipped dispatcher notifications' 
        };
      }
      
      return { success: false, error: 'No dispatchers found' };
    }
    
    // Prepare email content
    const subject = `New Trip Request: ${trip.id}`;
    
    // Create a text version of the email
    const text = `
      NEW TRIP REQUEST
      
      Trip ID: ${trip.id}
      Status: ${trip.status}
      
      Client: ${user.user_metadata?.full_name || user.email}
      Email: ${user.email}
      
      Pickup: ${trip.pickup_address}
      Destination: ${trip.destination_address}
      
      Pickup Time: ${formatDate(trip.pickup_time)}
      
      Wheelchair Required: ${trip.wheelchair_type === 'wheelchair' ? 'Yes' : 'No'}
      Round Trip: ${trip.is_round_trip ? 'Yes' : 'No'}
      
      Distance: ${trip.distance ? `${trip.distance} miles` : 'Not calculated'}
      Estimated Price: ${trip.price ? `$${trip.price}` : 'Not calculated'}
      
      Special Requirements: ${trip.special_requirements || 'None'}
      
      Please log in to the dispatcher portal to approve or decline this trip request.
    `.trim().replace(/\n {6}/g, '\n');
    
    // Create an HTML version of the email with better formatting
    const html = `
      <h1 style="color: #2563eb;">New Trip Request</h1>
      
      <p style="font-size: 16px; margin-bottom: 25px;">A new trip has been requested and is awaiting your approval.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #1f2937;">Trip Details</h2>
        
        <p><strong>Trip ID:</strong> ${trip.id}</p>
        <p><strong>Status:</strong> <span style="color: #7c3aed; font-weight: bold;">${trip.status}</span></p>
        
        <div style="margin: 20px 0; border-top: 1px solid #d1d5db;"></div>
        
        <p><strong>Client:</strong> ${user.user_metadata?.full_name || user.email}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        
        <div style="margin: 20px 0; border-top: 1px solid #d1d5db;"></div>
        
        <p><strong>Pickup:</strong> ${trip.pickup_address}</p>
        <p><strong>Destination:</strong> ${trip.destination_address}</p>
        <p><strong>Pickup Time:</strong> ${formatDate(trip.pickup_time)}</p>
        
        <div style="margin: 20px 0; border-top: 1px solid #d1d5db;"></div>
        
        <p><strong>Wheelchair Required:</strong> ${trip.wheelchair_type === 'wheelchair' ? 'Yes' : 'No'}</p>
        <p><strong>Round Trip:</strong> ${trip.is_round_trip ? 'Yes' : 'No'}</p>
        <p><strong>Distance:</strong> ${trip.distance ? `${trip.distance} miles` : 'Not calculated'}</p>
        <p><strong>Estimated Price:</strong> ${trip.price ? `$${trip.price}` : 'Not calculated'}</p>
        
        ${trip.special_requirements ? `
          <div style="margin: 20px 0; border-top: 1px solid #d1d5db;"></div>
          <p><strong>Special Requirements:</strong> ${trip.special_requirements}</p>
        ` : ''}
      </div>
      
      <p>Please <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://compassionate-rides.vercel.app'}/dashboard" style="color: #2563eb; text-decoration: underline;">log in to the dispatcher portal</a> to approve or decline this trip request.</p>
    `;
    
    // Send email to all dispatchers
    const result = await sendEmailToMany({
      to: dispatcherEmails,
      subject,
      text,
      html
    });
    
    if (!result.success) {
      console.error('Failed to send emails to all dispatchers:', result.error);
    } else {
      console.log('Notification sent to dispatchers:', result.info);
    }
    
    return result;
  } catch (error) {
    console.error('Error in notifyDispatchersOfNewTrip:', error);
    return { success: false, error: error.message };
  }
}