// Use require for Next.js API route compatibility
const { createTransporter } = require('./email-providers');

// Create transporter instance - will be initialized on first use
let transporter = null;

/**
 * Get or create the email transporter
 */
async function getTransporter() {
  if (!transporter) {
    transporter = await createTransporter();
  }
  return transporter;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email content
 * @param {string} options.html - HTML email content (optional)
 * @returns {Promise} - Email sending result
 */
async function sendEmail({ to, subject, text, html }) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Compassionate Care Transportation <app@compassionatecaretransportation.com>',
      to,
      subject,
      text,
      html: html || text,
    };

    // Get the appropriate transporter
    const emailTransporter = await getTransporter();

    // In development mode with stream transport, just log
    if (emailTransporter.transporter?.name === 'StreamTransport') {
      console.log('Email would be sent:', mailOptions);
      return { success: true, info: 'Email logged in development mode' };
    }

    const info = await emailTransporter.sendMail(mailOptions);
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
async function sendEmailToMany({ to, subject, text, html }) {
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

// Export functions for CommonJS compatibility
module.exports = {
  sendEmail,
  sendEmailToMany
};