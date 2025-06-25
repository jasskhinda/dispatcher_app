// Test facility payment status table creation
const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs');

async function testPaymentStatusTable() {
    try {
        console.log('🔍 Testing facility payment status table...');
        
        // Create supabase client
        const supabase = createClientComponentClient();
        
        // Test if table exists by trying to select from it
        const { data, error } = await supabase
            .from('facility_payment_status')
            .select('*')
            .limit(1);
        
        if (error) {
            if (error.message.includes('relation "facility_payment_status" does not exist')) {
                console.log('❌ Table does not exist yet');
                console.log('📝 Please run this SQL in your Supabase SQL Editor:');
                console.log('');
                console.log(require('fs').readFileSync('create-facility-payment-status-table.sql', 'utf8'));
            } else {
                console.log('⚠️ Table exists but error accessing:', error.message);
            }
        } else {
            console.log('✅ facility_payment_status table is ready');
            console.log('📊 Current records:', data?.length || 0);
        }
        
    } catch (err) {
        console.error('Error testing table:', err.message);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testPaymentStatusTable();
}

module.exports = { testPaymentStatusTable };
