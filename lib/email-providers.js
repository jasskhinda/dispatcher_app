// Use require for Next.js API route compatibility
const nodemailer = require('nodemailer');

/**
 * Email provider configurations
 * Since Google App Passwords may not be available, this supports multiple providers
 */

// Provider 1: Google OAuth2 (recommended for Google Workspace)
async function createGoogleOAuth2Transporter() {
  // This requires setting up OAuth2 credentials in Google Cloud Console
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.SMTP_USER || 'app@compassionatecaretransportation.com',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
  });
}

// Provider 2: Resend (simple, reliable, developer-friendly)
async function createResendTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_API_KEY,
    },
  });
}

// Provider 3: SendGrid (enterprise-grade, reliable)
async function createSendGridTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY,
    },
  });
}

// Provider 4: SendPulse (great free tier - 15,000 emails/month)
async function createSendPulseTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-pulse.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.SENDPULSE_USER,
      pass: process.env.SENDPULSE_PASSWORD,
    },
    pool: true, // Use pooled connections
    maxConnections: 5, // Maximum number of simultaneous connections
    maxMessages: 100, // Maximum messages per connection
    rateDelta: 1000, // Rate limiting: time window in ms
    rateLimit: 5, // Rate limiting: max messages per rateDelta
    connectionTimeout: 10000, // 10 second connection timeout
    greetingTimeout: 10000, // 10 second greeting timeout
    socketTimeout: 30000, // 30 second socket timeout
  });
}

// Provider 5: Brevo (formerly Sendinblue - free tier available)
async function createBrevoTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_LOGIN,
      pass: process.env.BREVO_API_KEY,
    },
  });
}

// Provider 6: Standard SMTP (if you have access to another email server)
async function createSMTPTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

/**
 * Auto-detect and create the appropriate transporter based on available environment variables
 */
async function createTransporter() {
  // Priority order for email providers

  // 1. Try Resend (easiest to set up)
  if (process.env.RESEND_API_KEY) {
    console.log('Using Resend for email delivery');
    return createResendTransporter();
  }

  // 2. Try SendGrid
  if (process.env.SENDGRID_API_KEY) {
    console.log('Using SendGrid for email delivery');
    return createSendGridTransporter();
  }

  // 3. Try SendPulse
  if (process.env.SENDPULSE_USER && process.env.SENDPULSE_PASSWORD) {
    console.log('Using SendPulse for email delivery');
    return createSendPulseTransporter();
  }

  // 4. Try Brevo
  if (process.env.BREVO_API_KEY && process.env.BREVO_LOGIN) {
    console.log('Using Brevo for email delivery');
    return createBrevoTransporter();
  }

  // 5. Try Google OAuth2
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('Using Google OAuth2 for email delivery');
    return createGoogleOAuth2Transporter();
  }

  // 6. Try standard SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    console.log('Using standard SMTP for email delivery');
    return createSMTPTransporter();
  }

  // 7. Development mode - just log emails
  if (process.env.NODE_ENV !== 'production') {
    console.log('No email provider configured - using stream transport for development');
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  throw new Error('No email provider configured. Please set up one of: Resend, SendGrid, Brevo, Google OAuth2, or SMTP credentials.');
}

// Export for CommonJS compatibility
module.exports = {
  createTransporter,
  createGoogleOAuth2Transporter,
  createResendTransporter,
  createSendGridTransporter,
  createSendPulseTransporter,
  createBrevoTransporter,
  createSMTPTransporter
};