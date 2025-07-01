import nodemailer from 'nodemailer';

// Configure nodemailer transporter
// In production, you'd use actual SMTP credentials or a service like SendGrid
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASSWORD || 'password',
  },
  // For development, if no SMTP server is available:
  ...(process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST ? {
    streamTransport: true,
    newline: 'unix',
    buffer: true
  } : {})
});

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email content
 * @param {string} options.html - HTML email content (optional)
 * @returns {Promise} - Email sending result
 */
export async function sendEmail({ to, subject, text, html }) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Compassionate Rides <noreply@compassionaterides.com>',
      to,
      subject,
      text,
      html: html || text,
    };

    // In development without SMTP, just log the email
    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
      console.log('Email would be sent:', mailOptions);
      return { success: true, info: 'Email logged in development mode' };
    }

    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

/**
 * Send an email to multiple recipients
 * @param {Object} options - Email options
 * @param {Array<string>} options.to - Array of recipient emails
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email content
 * @param {string} options.html - HTML email content (optional)
 * @returns {Promise} - Email sending result
 */
export async function sendEmailToMany({ to, subject, text, html }) {
  try {
    // For multiple recipients, we can either:
    // 1. Send one email with all recipients in the TO field (less private)
    // 2. Send individual emails to each recipient (more private)
    
    // Option 2: Individual emails (more private)
    const results = await Promise.all(
      to.map(recipient => 
        sendEmail({
          to: recipient,
          subject,
          text,
          html
        })
      )
    );
    
    const allSuccessful = results.every(result => result.success);
    return { 
      success: allSuccessful, 
      info: `${results.filter(r => r.success).length} of ${to.length} emails sent successfully`
    };
  } catch (error) {
    console.error('Error sending emails to multiple recipients:', error);
    return { success: false, error };
  }
}