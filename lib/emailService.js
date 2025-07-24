import nodemailer from 'nodemailer';

// Create nodemailer transporter using SMTP configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // false for TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false // For Resend compatibility
    }
  });
};

// Send driver assignment notification email
export async function sendDriverAssignmentEmail(driverInfo, tripInfo, assignmentToken) {
  try {
    const transporter = createTransporter();
    
    // Format pickup time for better readability
    const pickupDate = new Date(tripInfo.pickup_time);
    const formattedDate = pickupDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = pickupDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Create accept/reject URLs
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3015';
    
    const acceptUrl = `${baseUrl}/driver/trip-response?token=${assignmentToken}&action=accept`;
    const rejectUrl = `${baseUrl}/driver/trip-response?token=${assignmentToken}&action=reject`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Trip Assignment</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f8f9fa;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #5fbfc0, #4aa5a6);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #2c3e50;
            }
            .trip-details {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #5fbfc0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e9ecef;
            }
            .detail-row:last-child {
              border-bottom: none;
              margin-bottom: 0;
            }
            .detail-label {
              font-weight: 600;
              color: #495057;
            }
            .detail-value {
              color: #212529;
              text-align: right;
            }
            .action-buttons {
              text-align: center;
              margin: 30px 0;
            }
            .btn {
              display: inline-block;
              padding: 12px 30px;
              margin: 0 10px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
              text-align: center;
              min-width: 120px;
            }
            .btn-accept {
              background-color: #28a745;
              color: white;
            }
            .btn-accept:hover {
              background-color: #218838;
            }
            .btn-reject {
              background-color: #dc3545;
              color: white;
            }
            .btn-reject:hover {
              background-color: #c82333;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 14px;
              color: #6c757d;
              border-top: 1px solid #e9ecef;
            }
            .footer p {
              margin: 5px 0;
            }
            .urgent {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 6px;
              margin: 15px 0;
              text-align: center;
              font-weight: 600;
            }
            @media (max-width: 600px) {
              body {
                padding: 10px;
              }
              .container {
                border-radius: 0;
              }
              .content {
                padding: 20px;
              }
              .detail-row {
                flex-direction: column;
                text-align: left;
              }
              .detail-value {
                text-align: left;
                margin-top: 5px;
              }
              .btn {
                display: block;
                margin: 10px 0;
                width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 New Trip Assignment</h1>
            </div>
            
            <div class="content">
              <div class="greeting">
                Hello ${driverInfo.first_name},
              </div>
              
              <p>
                You have been assigned to a new trip with Compassionate Care Transportation. 
                Please review the details below and respond promptly.
              </p>
              
              ${tripInfo.is_emergency ? `
                <div class="urgent">
                  ⚠️ URGENT TRIP - This is an emergency medical transportation request
                </div>
              ` : ''}
              
              <div class="trip-details">
                <h3 style="margin-top: 0; color: #2c3e50;">Trip Details</h3>
                
                <div class="detail-row">
                  <span class="detail-label">📅 Date & Time:</span>
                  <span class="detail-value">${formattedDate}<br>${formattedTime}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">📍 Pickup Location:</span>
                  <span class="detail-value">${tripInfo.pickup_location}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">🏥 Drop-off Location:</span>
                  <span class="detail-value">${tripInfo.dropoff_location}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">👤 Passenger:</span>
                  <span class="detail-value">${tripInfo.client_name || 'Name not provided'}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">📱 Contact:</span>
                  <span class="detail-value">${tripInfo.client_phone || 'Phone not provided'}</span>
                </div>
                
                ${tripInfo.special_instructions ? `
                  <div class="detail-row">
                    <span class="detail-label">📝 Special Instructions:</span>
                    <span class="detail-value">${tripInfo.special_instructions}</span>
                  </div>
                ` : ''}
                
                <div class="detail-row">
                  <span class="detail-label">💰 Trip Fare:</span>
                  <span class="detail-value">$${tripInfo.total_cost || 'TBD'}</span>
                </div>
              </div>
              
              <div class="action-buttons">
                <a href="${acceptUrl}" class="btn btn-accept">✅ Accept Trip</a>
                <a href="${rejectUrl}" class="btn btn-reject">❌ Decline Trip</a>
              </div>
              
              <p style="text-align: center; color: #6c757d; font-size: 14px;">
                Please respond within 15 minutes. If you don't respond, the trip may be reassigned to another driver.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Compassionate Care Transportation</strong></p>
              <p>Providing caring transportation services with compassion and professionalism</p>
              <p>Need help? Contact dispatch at: <a href="tel:+1234567890">📞 (123) 456-7890</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Hi ${driverInfo.first_name},

You have been assigned to a new trip with Compassionate Care Transportation.

Trip Details:
- Date & Time: ${formattedDate} at ${formattedTime}
- Pickup: ${tripInfo.pickup_location}  
- Drop-off: ${tripInfo.dropoff_location}
- Passenger: ${tripInfo.client_name || 'Name not provided'}
- Contact: ${tripInfo.client_phone || 'Phone not provided'}
- Fare: $${tripInfo.total_cost || 'TBD'}

${tripInfo.special_instructions ? `Special Instructions: ${tripInfo.special_instructions}` : ''}

To respond to this assignment:
- Accept: ${acceptUrl}
- Decline: ${rejectUrl}

Please respond within 15 minutes.

Best regards,
Compassionate Care Transportation Team
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: driverInfo.email,
      subject: `🚗 New Trip Assignment - ${formattedDate} at ${formattedTime}`,
      text: emailText,
      html: emailHtml,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Driver assignment email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      recipient: driverInfo.email
    };

  } catch (error) {
    console.error('Failed to send driver assignment email:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

// Generate a secure token for trip response
export function generateAssignmentToken(tripId, driverId) {
  const timestamp = Date.now();
  const data = `${tripId}:${driverId}:${timestamp}`;
  // In production, use proper JWT or crypto signing
  return Buffer.from(data).toString('base64url');
}

// Decode assignment token
export function decodeAssignmentToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [tripId, driverId, timestamp] = decoded.split(':');
    
    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge > maxAge) {
      throw new Error('Token expired');
    }
    
    return { tripId, driverId, timestamp: parseInt(timestamp) };
  } catch (error) {
    throw new Error('Invalid token');
  }
}