import nodemailer from 'nodemailer';

// Configure nodemailer transporter for Google Workspace
// Using Google SMTP with App Password for authentication
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true' || false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || '', // Your Google Workspace email
    pass: process.env.SMTP_PASSWORD || '', // App-specific password from Google
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production' // Only enforce in production
  },
  // For development, if no SMTP credentials are available:
  ...(process.env.NODE_ENV !== 'production' && (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) ? {
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
      from: process.env.EMAIL_FROM || 'Compassionate Care Transportation <noreply@compassionatecaretransportation.com>',
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