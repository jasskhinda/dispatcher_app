/**
 * Email notifications for new trip bookings
 * Configured with SendPulse SMTP - sends to app@compassionatecaretransportation.com
 * Deployed: October 2025
 */
const { sendEmailToMany } = require('./email');

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
async function notifyDispatchersOfNewTrip(trip, user) {
  try {
    // Fetch all dispatcher emails from the database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: dispatchers, error: dispatcherError } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'dispatcher');

    let dispatcherEmails = [];

    if (dispatcherError) {
      console.error('Error fetching dispatchers:', dispatcherError);
      dispatcherEmails = ['app@compassionatecaretransportation.com'];
      console.log('Fallback: Sending trip notification to app@ due to error');
    } else if (!dispatchers || dispatchers.length === 0) {
      console.warn('No dispatchers found in database');
      dispatcherEmails = ['app@compassionatecaretransportation.com'];
      console.log('Fallback: Sending trip notification to app@ (no dispatchers found)');
    } else {
      dispatcherEmails = dispatchers.map(d => d.email).filter(email => email);
      console.log(`Sending trip notification to ${dispatcherEmails.length} dispatchers:`, dispatcherEmails);
    }

    // Determine client information
    // For facility bookings, trip has managed_client_id
    // For direct bookings, trip has user_id
    let clientName = 'Unknown Client';
    let clientEmail = 'Not available';
    let bookingType = 'Direct Booking';

    if (trip.managed_client_id) {
      // Facility booking - use enriched client_info if available
      if (trip.client_info) {
        clientName = `${trip.client_info.first_name} ${trip.client_info.last_name}`;
        // For facility bookings, show client email in parentheses
        const clientEmailInfo = trip.client_info.email ? ` (Client: ${trip.client_info.email})` : '';

        // Use facility email as the main email
        if (trip.facility_info && trip.facility_info.contact_email) {
          clientEmail = `${trip.facility_info.contact_email}${clientEmailInfo}`;
        } else {
          clientEmail = trip.client_info.email || 'No email on file';
        }
      } else {
        // Fallback to old method
        clientName = trip.client_name || trip.passenger_name || `Managed Client ${trip.managed_client_id.slice(0, 8)}`;
        clientEmail = trip.client_email || 'No email on file';
      }

      bookingType = 'Facility Booking';
    } else {
      // Direct booking - use session user info
      clientName = user.user_metadata?.full_name || user.email || 'Direct Client';
      clientEmail = user.email || 'Not available';
      bookingType = 'Direct Booking';
    }

    // Prepare email content
    const subject = `New Trip Request: ${trip.id}`;

    // Create a text version of the email
    const text = `
      NEW TRIP REQUEST

      Trip ID: ${trip.id}
      Status: ${trip.status}
      Booking Type: ${bookingType}

      Client: ${clientName}
      Email: ${clientEmail}
      
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
    const dispatcherPortalUrl = 'https://dispatch.compassionatecaretransportation.com';
    const tripDetailsUrl = `${dispatcherPortalUrl}/trips/${trip.id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">New Trip Request</h1>

        <p style="font-size: 16px; margin-bottom: 25px;">A new trip has been requested and is awaiting your approval.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1f2937;">Trip Details</h2>

          <p><strong>Trip ID:</strong> ${trip.id}</p>
          <p><strong>Status:</strong> <span style="color: #7c3aed; font-weight: bold;">${trip.status}</span></p>
          <p><strong>Booking Type:</strong> <span style="color: ${bookingType === 'Facility Booking' ? '#2563eb' : '#059669'}; font-weight: bold;">${bookingType}</span></p>

          <div style="margin: 20px 0; border-top: 1px solid #d1d5db;"></div>

          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Email:</strong> ${clientEmail}</p>

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

        <div style="text-align: center; margin: 30px 0;">
          <a href="${tripDetailsUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            VIEW TRIP DETAILS
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center;">Please log in to the dispatcher portal to approve or decline this trip request.</p>
      </div>
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

/**
 * Send booking confirmation email to facility
 * @param {Object} trip - Trip data
 * @param {Object} facilityEmail - Facility contact email
 * @param {Object} clientName - Client name
 * @returns {Promise<Object>} - Email result
 */
async function sendFacilityConfirmation(trip, facilityEmail, clientName) {
  try {
    if (!facilityEmail) {
      console.log('No facility email provided, skipping facility confirmation');
      return { success: true, info: 'No facility email' };
    }

    const subject = `Booking Confirmation: ${clientName} - ${formatDate(trip.pickup_time)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Trip Booking Confirmation</h1>

        <p style="font-size: 16px; margin-bottom: 25px;">A trip has been successfully booked for your client.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1f2937;">Booking Details</h2>

          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Pickup:</strong> ${trip.pickup_address}</p>
          <p><strong>Destination:</strong> ${trip.destination_address}</p>
          <p><strong>Pickup Time:</strong> ${formatDate(trip.pickup_time)}</p>

          <div style="margin: 20px 0; border-top: 1px solid #d1d5db;"></div>

          <p><strong>Wheelchair Required:</strong> ${trip.wheelchair_type === 'wheelchair' ? 'Yes' : 'No'}</p>
          <p><strong>Round Trip:</strong> ${trip.is_round_trip ? 'Yes' : 'No'}</p>
          <p><strong>Distance:</strong> ${trip.distance ? `${trip.distance} miles` : 'Not calculated'}</p>
          <p><strong>Estimated Price:</strong> ${trip.price ? `$${trip.price}` : 'Not calculated'}</p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">You can view this booking in your facility dashboard. A dispatcher will review and approve this trip shortly.</p>
      </div>
    `;

    const result = await sendEmailToMany({
      to: [facilityEmail],
      subject,
      text: `Trip Booking Confirmation\n\nClient: ${clientName}\nPickup: ${trip.pickup_address}\nDestination: ${trip.destination_address}\nPickup Time: ${formatDate(trip.pickup_time)}`,
      html
    });

    if (result.success) {
      console.log('Facility confirmation sent to:', facilityEmail);
    } else {
      console.error('Failed to send facility confirmation:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Error sending facility confirmation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send booking confirmation email to client
 * @param {Object} trip - Trip data
 * @param {string} clientEmail - Client email
 * @param {string} clientName - Client name
 * @returns {Promise<Object>} - Email result
 */
async function sendClientConfirmation(trip, clientEmail, clientName) {
  try {
    if (!clientEmail) {
      console.log('No client email provided, skipping client confirmation');
      return { success: true, info: 'No client email' };
    }

    const subject = `Your Trip Booking Confirmation - ${formatDate(trip.pickup_time)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Your Trip is Confirmed!</h1>

        <p style="font-size: 16px; margin-bottom: 25px;">Hello ${clientName}, your transportation has been booked.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #1f2937;">Trip Details</h2>

          <p><strong>Pickup Location:</strong> ${trip.pickup_address}</p>
          <p><strong>Destination:</strong> ${trip.destination_address}</p>
          <p><strong>Pickup Time:</strong> ${formatDate(trip.pickup_time)}</p>

          <div style="margin: 20px 0; border-top: 1px solid #d1d5db;"></div>

          <p><strong>Wheelchair:</strong> ${trip.wheelchair_type === 'wheelchair' ? 'Yes' : 'No'}</p>
          <p><strong>Round Trip:</strong> ${trip.is_round_trip ? 'Yes' : 'No'}</p>
          <p><strong>Estimated Price:</strong> ${trip.price ? `$${trip.price}` : 'Will be calculated'}</p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">A dispatcher will review and confirm your trip. You will be contacted if there are any questions.</p>
        <p style="color: #6b7280; font-size: 14px;">Thank you for choosing Compassionate Care Transportation!</p>
      </div>
    `;

    const result = await sendEmailToMany({
      to: [clientEmail],
      subject,
      text: `Your Trip is Confirmed!\n\nPickup: ${trip.pickup_address}\nDestination: ${trip.destination_address}\nPickup Time: ${formatDate(trip.pickup_time)}`,
      html
    });

    if (result.success) {
      console.log('Client confirmation sent to:', clientEmail);
    } else {
      console.error('Failed to send client confirmation:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Error sending client confirmation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notifications when trip status changes to UPCOMING (approved)
 * @param {Object} trip - Trip data
 * @param {Object} tripDetails - Enriched trip details (client_info, facility_info)
 * @returns {Promise<void>}
 */
async function notifyTripApproved(trip, tripDetails = {}) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Fetch all dispatcher emails
    const { data: dispatchers } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'dispatcher');

    const dispatcherEmails = dispatchers && dispatchers.length > 0
      ? dispatchers.map(d => d.email).filter(email => email)
      : ['app@compassionatecaretransportation.com'];

    const clientName = tripDetails.client_info
      ? `${tripDetails.client_info.first_name} ${tripDetails.client_info.last_name}`
      : 'Client';

    // Email to dispatchers
    const dispatcherSubject = `Trip Approved: ${clientName} - ${formatDate(trip.pickup_time)}`;
    const dispatcherHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">✅ Trip Approved</h1>
        <p>Trip has been approved and is now upcoming.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Pickup:</strong> ${trip.pickup_address}</p>
          <p><strong>Destination:</strong> ${trip.destination_address}</p>
          <p><strong>Pickup Time:</strong> ${formatDate(trip.pickup_time)}</p>
          <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">UPCOMING</span></p>
        </div>
      </div>
    `;

    await sendEmailToMany({
      to: dispatcherEmails,
      subject: dispatcherSubject,
      text: `Trip Approved: ${clientName}`,
      html: dispatcherHtml
    });

    // Email to facility (if applicable)
    if (tripDetails.facility_info && tripDetails.facility_info.contact_email) {
      const facilityHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">✅ Trip Approved</h1>
          <p>Your trip booking for ${clientName} has been approved!</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Pickup:</strong> ${trip.pickup_address}</p>
            <p><strong>Destination:</strong> ${trip.destination_address}</p>
            <p><strong>Pickup Time:</strong> ${formatDate(trip.pickup_time)}</p>
            <p><strong>Status:</strong> <span style="color: #059669;">UPCOMING</span></p>
          </div>
        </div>
      `;

      await sendEmailToMany({
        to: [tripDetails.facility_info.contact_email],
        subject: `Trip Approved: ${clientName}`,
        text: `Your trip booking has been approved`,
        html: facilityHtml
      });
    }

    // Email to client (if email available)
    const clientEmail = tripDetails.client_info?.email;
    if (clientEmail) {
      const clientHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">✅ Your Trip is Approved!</h1>
          <p>Hello ${clientName}, your trip has been approved and confirmed.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
            <p><strong>Pickup:</strong> ${trip.pickup_address}</p>
            <p><strong>Destination:</strong> ${trip.destination_address}</p>
            <p><strong>Pickup Time:</strong> ${formatDate(trip.pickup_time)}</p>
            <p><strong>Status:</strong> <span style="color: #059669;">CONFIRMED</span></p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">A driver will be assigned to your trip. Thank you for choosing Compassionate Care Transportation!</p>
        </div>
      `;

      await sendEmailToMany({
        to: [clientEmail],
        subject: `Your Trip is Approved!`,
        text: `Your trip has been approved`,
        html: clientHtml
      });
    }

    console.log('Trip approved notifications sent successfully');
  } catch (error) {
    console.error('Error sending trip approved notifications:', error);
  }
}

/**
 * Send notifications when trip status changes to COMPLETED
 * @param {Object} trip - Trip data
 * @param {Object} tripDetails - Enriched trip details
 * @returns {Promise<void>}
 */
async function notifyTripCompleted(trip, tripDetails = {}) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: dispatchers } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'dispatcher');

    const dispatcherEmails = dispatchers && dispatchers.length > 0
      ? dispatchers.map(d => d.email).filter(email => email)
      : ['app@compassionatecaretransportation.com'];

    const clientName = tripDetails.client_info
      ? `${tripDetails.client_info.first_name} ${tripDetails.client_info.last_name}`
      : 'Client';

    // Email to all parties
    const completedHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">✓ Trip Completed</h1>
        <p>Trip has been successfully completed.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Pickup:</strong> ${trip.pickup_address}</p>
          <p><strong>Destination:</strong> ${trip.destination_address}</p>
          <p><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">COMPLETED</span></p>
        </div>
      </div>
    `;

    // Send to dispatchers
    await sendEmailToMany({
      to: dispatcherEmails,
      subject: `Trip Completed: ${clientName}`,
      text: `Trip completed successfully`,
      html: completedHtml
    });

    // Send to facility
    if (tripDetails.facility_info && tripDetails.facility_info.contact_email) {
      await sendEmailToMany({
        to: [tripDetails.facility_info.contact_email],
        subject: `Trip Completed: ${clientName}`,
        text: `Trip completed successfully`,
        html: completedHtml
      });
    }

    // Send to client
    const clientEmail = tripDetails.client_info?.email;
    if (clientEmail) {
      await sendEmailToMany({
        to: [clientEmail],
        subject: `Trip Completed - Thank You!`,
        text: `Your trip has been completed`,
        html: completedHtml.replace('Trip Completed', 'Your Trip is Complete - Thank You!')
      });
    }

    console.log('Trip completed notifications sent successfully');
  } catch (error) {
    console.error('Error sending trip completed notifications:', error);
  }
}

/**
 * Send notifications when trip is CANCELLED/REJECTED
 * @param {Object} trip - Trip data
 * @param {Object} tripDetails - Enriched trip details
 * @param {string} reason - Cancellation reason
 * @returns {Promise<void>}
 */
async function notifyTripCancelled(trip, tripDetails = {}, reason = '') {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: dispatchers } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'dispatcher');

    const dispatcherEmails = dispatchers && dispatchers.length > 0
      ? dispatchers.map(d => d.email).filter(email => email)
      : ['app@compassionatecaretransportation.com'];

    const clientName = tripDetails.client_info
      ? `${tripDetails.client_info.first_name} ${tripDetails.client_info.last_name}`
      : 'Client';

    const reasonText = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : '';

    const cancelledHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">✗ Trip Cancelled</h1>
        <p>Trip has been cancelled.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Pickup:</strong> ${trip.pickup_address}</p>
          <p><strong>Destination:</strong> ${trip.destination_address}</p>
          <p><strong>Pickup Time:</strong> ${formatDate(trip.pickup_time)}</p>
          ${reasonText}
          <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">CANCELLED</span></p>
        </div>
      </div>
    `;

    // Send to dispatchers
    await sendEmailToMany({
      to: dispatcherEmails,
      subject: `Trip Cancelled: ${clientName}`,
      text: `Trip has been cancelled`,
      html: cancelledHtml
    });

    // Send to facility
    if (tripDetails.facility_info && tripDetails.facility_info.contact_email) {
      await sendEmailToMany({
        to: [tripDetails.facility_info.contact_email],
        subject: `Trip Cancelled: ${clientName}`,
        text: `Trip has been cancelled`,
        html: cancelledHtml
      });
    }

    // Send to client
    const clientEmail = tripDetails.client_info?.email;
    if (clientEmail) {
      await sendEmailToMany({
        to: [clientEmail],
        subject: `Your Trip Has Been Cancelled`,
        text: `Your trip has been cancelled`,
        html: cancelledHtml.replace('Trip Cancelled', 'Your Trip Has Been Cancelled')
      });
    }

    console.log('Trip cancelled notifications sent successfully');
  } catch (error) {
    console.error('Error sending trip cancelled notifications:', error);
  }
}

// Export for CommonJS compatibility
module.exports = {
  notifyDispatchersOfNewTrip,
  sendFacilityConfirmation,
  sendClientConfirmation,
  notifyTripApproved,
  notifyTripCompleted,
  notifyTripCancelled
};