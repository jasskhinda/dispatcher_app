// Helper function to create transporter with dynamic import
const createTransporter = async () => {
  const nodemailer = await import('nodemailer');
  const mailer = nodemailer.default || nodemailer;
  
  return mailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'resend',
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export const sendDriverAssignmentEmail = async (driver, tripInfo, tripId) => {
  try {
    const transporter = await createTransporter();
    
    if (!transporter) {
      throw new Error('Failed to create email transporter');
    }

    // Format pickup time
    const pickupDateTime = tripInfo.pickup_time 
      ? new Date(tripInfo.pickup_time).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : 'Time not specified';

    // Create the driver app link with trip ID
    const driverAppLink = `https://driver.compassionatecaretransportation.com/dashboard/trips/${tripId}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Trip Assignment</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .trip-details {
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .trip-details h3 {
            margin-top: 0;
            color: #007bff;
            font-size: 20px;
        }
        .detail-row {
            margin: 12px 0;
            display: flex;
            align-items: flex-start;
        }
        .detail-icon {
            margin-right: 10px;
            font-size: 16px;
            min-width: 20px;
        }
        .detail-content {
            flex: 1;
        }
        .detail-label {
            font-weight: 600;
            color: #495057;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            font-size: 14px;
            color: #6c757d;
            text-align: center;
        }
        .company-name {
            color: #007bff;
            font-weight: 600;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .detail-row {
                flex-direction: column;
            }
            .detail-icon {
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚗 New Trip Assignment</h1>
        </div>
        
        <p class="greeting">Hi ${driver.full_name || driver.first_name || 'Driver'},</p>
        
        <p>You have been assigned a new trip. Please review the details below and take action through the driver app.</p>
        
        <div class="trip-details">
            <h3>Trip Details</h3>
            <div class="detail-row">
                <span class="detail-icon">🆔</span>
                <div class="detail-content">
                    <span class="detail-label">Trip ID:</span> ${tripId || 'Not provided'}
                </div>
            </div>
            <div class="detail-row">
                <span class="detail-icon">📅</span>
                <div class="detail-content">
                    <span class="detail-label">Date & Time:</span> ${pickupDateTime}
                </div>
            </div>
            <div class="detail-row">
                <span class="detail-icon">📍</span>
                <div class="detail-content">
                    <span class="detail-label">Pickup Location:</span> ${tripInfo.pickup_location || 'Location not specified'}
                </div>
            </div>
            <div class="detail-row">
                <span class="detail-icon">🏥</span>
                <div class="detail-content">
                    <span class="detail-label">Drop-off Location:</span> ${tripInfo.dropoff_location || 'Location not specified'}
                </div>
            </div>
            <div class="detail-row">
                <span class="detail-icon">👤</span>
                <div class="detail-content">
                    <span class="detail-label">Passenger:</span> ${tripInfo.client_name || 'Name not provided'}
                </div>
            </div>
            <div class="detail-row">
                <span class="detail-icon">📱</span>
                <div class="detail-content">
                    <span class="detail-label">Contact:</span> ${tripInfo.client_phone || 'Phone not provided'}
                </div>
            </div>
        </div>
        
        <div class="cta-container">
            <a href="${driverAppLink}" class="cta-button">
                🚀 TAKE ACTION
            </a>
        </div>
        
        <p><strong>Important:</strong> Please log into the driver app to accept or manage this trip assignment. Time-sensitive trips require immediate attention.</p>
        
        <div class="footer">
            <p>This email was sent by <span class="company-name">Compassionate Care Transportation</span></p>
            <p>If you have any questions, please contact dispatch immediately.</p>
        </div>
    </div>
</body>
</html>`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'dispatch@compassionatecaretransportation.com',
      to: driver.email,
      subject: `🚗 New Trip Assignment - ${tripInfo.client_name || 'Passenger'} (${pickupDateTime})`,
      html: emailHtml,
    };

    console.log('📧 Sending email with options:', {
      from: mailOptions.from,
      to: driver.email?.substring(0, 3) + '***',
      subject: mailOptions.subject
    });

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', {
      messageId: result.messageId,
      response: result.response,
      recipient: driver.email?.substring(0, 3) + '***'
    });

    return {
      success: true,
      messageId: result.messageId,
      recipient: driver.email
    };

  } catch (error) {
    console.error('❌ Email sending failed:', {
      message: error.message,
      stack: error.stack,
      driverEmail: driver?.email?.substring(0, 3) + '***'
    });
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};