// Simple test to find valid trip IDs
const { createClient } = require('@supabase/supabase-js');

async function findValidTrips() {
    const supabase = createClient(
        'https://btzfgasugkycbavcwvnx.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU'
    );

    try {
        console.log('Fetching trips...');
        const { data, error } = await supabase
            .from('trips')
            .select('id, passenger_name, status')
            .limit(3);

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Available trips:');
            data.forEach(trip => {
                console.log(`- ${trip.id} | ${trip.passenger_name} | ${trip.status}`);
            });
            
            if (data.length > 0) {
                console.log(`\nTest invoice URL: http://localhost:3015/invoice/${data[0].id}`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

findValidTrips();
