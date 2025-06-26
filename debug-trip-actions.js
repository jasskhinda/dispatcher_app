#!/usr/bin/env node

/**
 * Debug script to test trip actions API directly
 * Run this script to understand what's causing the internal server error
 */

console.log('🔍 Debugging Trip Actions API');
console.log('===============================\n');

const API_URL = 'https://dispatch.compassionatecaretransportation.com/api/trips/actions';

async function debugTripActions() {
  // First, let's check if we can reach the API endpoint
  console.log('1️⃣ Testing API connectivity...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: 'test-trip-id',
        action: 'approve'
      })
    });

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('📡 Response Body:', result);

    if (response.status >= 500) {
      console.log('\n❌ INTERNAL SERVER ERROR DETECTED');
      console.log('This indicates a server-side issue. Common causes:');
      console.log('- Database connection problems');
      console.log('- Missing environment variables');
      console.log('- Code compilation errors');
      console.log('- Authentication/authorization issues');
    } else if (response.status === 401 || response.status === 403) {
      console.log('\n🔒 AUTHENTICATION ERROR DETECTED');
      console.log('This indicates you need to be logged in as a dispatcher');
    } else if (response.status === 404) {
      console.log('\n🚫 NOT FOUND ERROR');
      console.log('The API endpoint might not exist or be correctly configured');
    } else if (response.status === 400) {
      console.log('\n⚠️ BAD REQUEST ERROR');
      console.log('The request format might be incorrect');
    }

  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.log('\nThis could indicate:');
    console.log('- The server is not running');
    console.log('- Network connectivity issues');
    console.log('- CORS configuration problems');
  }
}

// Also check environment variables that might be missing
console.log('2️⃣ Checking environment configuration...');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'BOOKING_APP_URL'
];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: Missing`);
  }
});

debugTripActions();
