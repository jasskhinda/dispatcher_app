#!/usr/bin/env node

/**
 * Test script to verify trip actions API functionality
 * Run this after logging into the dispatcher app to test the endpoints
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function testTripActions() {
  console.log('🧪 Trip Actions API Test');
  console.log('======================\n');

  const baseUrl = await askQuestion('Enter the base URL (default: http://localhost:3000): ') || 'http://localhost:3000';
  const tripId = await askQuestion('Enter a test trip ID: ');
  const sessionCookie = await askQuestion('Enter your session cookie (optional): ');

  if (!tripId) {
    console.log('❌ Trip ID is required');
    rl.close();
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  // Test approve action
  console.log('\n🔄 Testing trip approval...');
  try {
    const approveResponse = await fetch(`${baseUrl}/api/trips/actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tripId: tripId,
        action: 'approve'
      })
    });

    const approveResult = await approveResponse.json();
    console.log('✅ Approve Response:', {
      status: approveResponse.status,
      success: approveResult.success,
      message: approveResult.message,
      payment: approveResult.payment
    });
  } catch (error) {
    console.log('❌ Approve Error:', error.message);
  }

  // Ask if user wants to test reject
  const testReject = await askQuestion('\nTest rejection? (y/n): ');
  if (testReject.toLowerCase() === 'y') {
    console.log('\n🔄 Testing trip rejection...');
    try {
      const rejectResponse = await fetch(`${baseUrl}/api/trips/actions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tripId: tripId,
          action: 'reject',
          reason: 'Test rejection'
        })
      });

      const rejectResult = await rejectResponse.json();
      console.log('✅ Reject Response:', {
        status: rejectResponse.status,
        success: rejectResult.success,
        message: rejectResult.message
      });
    } catch (error) {
      console.log('❌ Reject Error:', error.message);
    }
  }

  rl.close();
}

if (require.main === module) {
  testTripActions().catch(console.error);
}

module.exports = { testTripActions };
