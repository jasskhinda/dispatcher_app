// Test what trip data is available for dispatcher testing
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fcxunqwrbbtwxmslsqlj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeHVucXdyYmJ0d3htc2xzcWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzMDA2NjEsImV4cCI6MjA0Nzg3NjY2MX0.U3mVHtnqCWOzl6VT3zT6oP6KxkSJxBjNW0M4IXDdO6Y',
  {
    auth: {
      persistSession: false
    }
  }
);

async function testTripData() {
  try {
    console.log('🔍 Checking available trip data for dispatcher testing...\n');

    // Get all trips with basic info
    const { data: allTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id, status, pickup_time, price, user_id, managed_client_id, facility_id, pickup_address, destination_address')
      .order('pickup_time', { ascending: false })
      .limit(10);

    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return;
    }

    console.log(`📊 Found ${allTrips?.length || 0} recent trips\n`);

    if (!allTrips || allTrips.length === 0) {
      console.log('⚠️ No trips found. Creating test trip for dispatcher demo...\n');
      
      // Create a test trip for demonstration
      const testTrip = {
        user_id: null,
        managed_client_id: 'ea79223a-test-demo',
        facility_id: 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3',
        pickup_address: '123 Senior Living Center, Medical City, State 12345',
        destination_address: '456 Medical Specialist Office, City, State 12345',
        pickup_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        status: 'pending',
        price: 45.00,
        wheelchair_type: 'wheelchair',
        is_round_trip: false,
        distance: 8.5,
        additional_passengers: 0
      };

      const { data: createdTrip, error: createError } = await supabase
        .from('trips')
        .insert([testTrip])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test trip:', createError);
        return;
      }

      console.log('✅ Created test trip for dispatcher demo:');
      console.log(`   ID: ${createdTrip.id}`);
      console.log(`   Client: David Patel (Managed)`);
      console.log(`   Route: ${createdTrip.pickup_address} → ${createdTrip.destination_address}`);
      console.log(`   Status: ${createdTrip.status}`);
      console.log(`   Price: $${createdTrip.price}`);
      console.log(`   Pickup: ${new Date(createdTrip.pickup_time).toLocaleString()}\n`);

      allTrips.push(createdTrip);
    }

    // Show status breakdown
    const statusCounts = allTrips.reduce((acc, trip) => {
      acc[trip.status] = (acc[trip.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Trip Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} trips`);
    });

    console.log('\n🎯 Recent Trips for Dispatcher Testing:');
    allTrips.slice(0, 5).forEach((trip, index) => {
      const clientName = trip.managed_client_id?.startsWith('ea79223a') ? 
        'David Patel (Managed)' : 
        `Client ${trip.user_id?.slice(0, 6) || trip.managed_client_id?.slice(0, 6) || 'N/A'}`;
      
      console.log(`   ${index + 1}. ${trip.id.slice(0, 8)}... - ${clientName}`);
      console.log(`      Status: ${trip.status} | Price: $${trip.price || '0.00'}`);
      console.log(`      Route: ${trip.pickup_address?.slice(0, 30)}... → ${trip.destination_address?.slice(0, 30)}...`);
      console.log(`      Pickup: ${new Date(trip.pickup_time).toLocaleString()}\n`);
    });

    console.log('🚀 Dispatcher Dashboard URL: https://dispatcher-app-cyan.vercel.app/dashboard');
    console.log('✅ Test data ready for dispatcher workflow testing!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTripData();
