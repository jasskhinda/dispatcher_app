// Fixed test users for E2E testing
// These users should be manually created in the test Supabase instance
// Credentials are loaded from environment variables

import dotenv from 'dotenv';

// Load environment variables explicitly at runtime
dotenv.config({ path: '.env.test' });

// Debug logging for environment variables
const DEBUG_ENV = true;
if (DEBUG_ENV) {
  console.log('\n🔐 Test User Credentials:');
  console.log(`   Dispatcher Email: ${process.env.TEST_DISPATCHER_EMAIL || 'UNDEFINED'}`);
  console.log(`   Client Email: ${process.env.TEST_CLIENT_EMAIL || 'UNDEFINED'}`);
}

export const testUsers = {
  // Valid dispatcher user that has access to the app
  dispatcher: {
    email: process.env.TEST_DISPATCHER_EMAIL || 'test-dispatcher@example.com',
    password: process.env.TEST_DISPATCHER_PASSWORD || 'test-dispatcher-password',
    role: 'dispatcher'
  },
  
  // User with client role that should be rejected with access denied
  nonDispatcher: {
    email: process.env.TEST_CLIENT_EMAIL || 'test-client@example.com',
    password: process.env.TEST_CLIENT_PASSWORD || 'test-client-password',
    role: 'client'
  },
  
  // User that doesn't exist in the system
  invalid: {
    email: process.env.TEST_INVALID_EMAIL || 'nonexistent@example.com',
    password: process.env.TEST_INVALID_PASSWORD || 'wrongpassword',
    role: null
  }
};