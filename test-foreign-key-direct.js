// Test the facility foreign key relationship fix
// This script runs in Node.js to test the query syntax

const https = require('https');

// Direct test using HTTP requests to simulate Supabase queries
async function testForeignKeyFix() {
  console.log('🧪 Testing Facility Foreign Key Relationship Fix...\n');
  
  const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NzYzNjQsImV4cCI6MjAzMzQ1MjM2NH0.U4TG4Rnwaj7wCGGGPCLJWtcO9bgkRRoUcxcOvlCeqXMM';
  
  // Test 1: Check if FacilityGroupB exists
  console.log('1️⃣ Checking if FacilityGroupB exists...');
  
  const facilityQuery = `select=id,name,contact_email&name=eq.FacilityGroupB`;
  const facilityUrl = `${supabaseUrl}/rest/v1/facilities?${facilityQuery}`;
  
  try {
    const facilityResponse = await makeRequest(facilityUrl, supabaseKey);
    const facilities = JSON.parse(facilityResponse);
    
    if (facilities.length > 0) {
      console.log('✅ FacilityGroupB found:', facilities[0]);
      const facilityId = facilities[0].id;
      
      // Test 2: Check trips with the new query syntax
      console.log('\n2️⃣ Testing new query syntax for trips with facility data...');
      
      const tripsQuery = `select=id,pickup_address,facility_id,user_id,facility:facilities(id,name,contact_email)&facility_id=eq.${facilityId}&limit=3`;
      const tripsUrl = `${supabaseUrl}/rest/v1/trips?${tripsQuery}`;
      
      const tripsResponse = await makeRequest(tripsUrl, supabaseKey);
      const trips = JSON.parse(tripsResponse);
      
      console.log(`✅ Query succeeded! Found ${trips.length} trips for FacilityGroupB`);
      
      trips.forEach((trip, index) => {
        const facilityName = trip.facility?.name || 'No facility data';
        const pickupShort = trip.pickup_address?.substring(0, 50) + '...';
        console.log(`  ${index + 1}. 🏥 ${facilityName} - ${pickupShort}`);
      });
      
      if (trips.length > 0 && trips[0].facility?.name) {
        console.log('\n🎉 SUCCESS: The foreign key relationship fix is working!');
        console.log(`✅ Facility names are loading correctly: "${trips[0].facility.name}"`);
        console.log('✅ This means the dispatcher app should now show "🏥 FacilityGroupB" instead of "🏥 Facility e1b94bde"');
      } else {
        console.log('\n⚠️ Trips found but facility data not properly joined');
      }
      
    } else {
      console.log('❌ FacilityGroupB not found in database');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

function makeRequest(url, authToken) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': authToken,
        'Content-Type': 'application/json'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

testForeignKeyFix();
