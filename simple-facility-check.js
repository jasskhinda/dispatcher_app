/**
 * Simple script to check facility data via direct API call
 */

const https = require('https');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';

const options = {
  hostname: 'btzfgasugkycbavcwvnx.supabase.co',
  port: 443,
  path: `/rest/v1/facilities?id=eq.${facilityId}&select=*`,
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Checking facility data for:', facilityId);

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const facilities = JSON.parse(data);
      
      if (facilities.length === 0) {
        console.log('❌ No facility found with that ID');
        
        // Try to get all facilities
        const allOptions = {
          ...options,
          path: '/rest/v1/facilities?select=id,name&limit=10'
        };
        
        const allReq = https.request(allOptions, (allRes) => {
          let allData = '';
          allRes.on('data', (chunk) => { allData += chunk; });
          allRes.on('end', () => {
            try {
              const allFacilities = JSON.parse(allData);
              console.log(`\nFound ${allFacilities.length} total facilities:`);
              allFacilities.forEach((f, i) => {
                console.log(`   ${i+1}. "${f.name}" (ID: ${f.id})`);
              });
            } catch (e) {
              console.error('Error parsing all facilities:', e);
            }
          });
        });
        
        allReq.on('error', (err) => {
          console.error('Error fetching all facilities:', err);
        });
        
        allReq.end();
        
      } else {
        const facility = facilities[0];
        console.log('✅ Found facility:');
        console.log('   ID:', facility.id);
        console.log('   Name:', facility.name || 'NULL');
        console.log('   Address:', facility.address || 'NULL');
        console.log('   Phone:', facility.phone_number || 'NULL');
        console.log('   Contact Email:', facility.contact_email || 'NULL');
        console.log('   Billing Email:', facility.billing_email || 'NULL');
        console.log('   Facility Type:', facility.facility_type || 'NULL');
        
        console.log('\n📝 CURRENT ISSUE ANALYSIS:');
        if (!facility.name || facility.name.trim() === '') {
          console.log('❌ PROBLEM: Facility name is missing/empty');
        }
        if (!facility.address || facility.address.trim() === '') {
          console.log('❌ PROBLEM: Facility address is missing/empty');  
        }
        if (!facility.billing_email || facility.billing_email.trim() === '') {
          console.log('❌ PROBLEM: Billing email is missing/empty');
        }
        
        console.log('\n🎯 SOLUTION: Update facility settings in the facility app');
        console.log('   Go to: https://facility.compassionatecaretransportation.com/dashboard/facility-settings');
        console.log('   Update the facility information with correct data');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.end();
