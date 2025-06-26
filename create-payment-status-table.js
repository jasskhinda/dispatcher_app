/**
 * Create facility_payment_status table
 * Fixes the "Failed to update payment status" error
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to run this with your Supabase credentials
const supabaseUrl = 'https://zqtllwsmpuomhzqgqhtb.supabase.co'; // Replace with your URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdGxsd3NtcHVvbWh6cWdxaHRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODQ3NDgzMCwiZXhwIjoyMDQ0MDUwODMwfQ.DY_0nQgGLVHI1cKlPq5yJTJlILhUaF1D9xZOCXf4t_E'; // Replace with service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function createPaymentStatusTable() {
    console.log('🔧 Creating facility_payment_status table...');
    
    try {
        // Create the table
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: `
                -- Create facility_payment_status table
                CREATE TABLE IF NOT EXISTS facility_payment_status (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    facility_id VARCHAR(255) NOT NULL,
                    invoice_month INTEGER NOT NULL,
                    invoice_year INTEGER NOT NULL,
                    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('PAID', 'UNPAID')),
                    payment_date TIMESTAMP WITH TIME ZONE,
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(facility_id, invoice_month, invoice_year)
                );

                -- Enable RLS
                ALTER TABLE facility_payment_status ENABLE ROW LEVEL SECURITY;

                -- Create policy for all authenticated users
                DROP POLICY IF EXISTS "payment_status_policy" ON facility_payment_status;
                CREATE POLICY "payment_status_policy" 
                ON facility_payment_status 
                FOR ALL 
                TO authenticated 
                USING (true)
                WITH CHECK (true);

                -- Grant permissions
                GRANT ALL ON facility_payment_status TO authenticated;

                -- Create indexes
                CREATE INDEX IF NOT EXISTS idx_facility_payment_lookup 
                ON facility_payment_status(facility_id, invoice_year, invoice_month);
            `
        });

        if (error) {
            console.error('❌ Error creating table:', error);
        } else {
            console.log('✅ Table created successfully!');
        }

        // Test the table
        console.log('🧪 Testing table access...');
        const { data: testData, error: testError } = await supabase
            .from('facility_payment_status')
            .select('*')
            .limit(1);

        if (testError) {
            console.error('❌ Table access test failed:', testError);
        } else {
            console.log('✅ Table access test successful!');
            console.log('📊 Current records in table:', testData.length);
        }

    } catch (err) {
        console.error('💥 Unexpected error:', err);
    }
}

// Alternative: Direct SQL approach
async function createTableDirectly() {
    console.log('🔧 Creating table with direct SQL approach...');
    
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS facility_payment_status (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            facility_id VARCHAR(255) NOT NULL,
            invoice_month INTEGER NOT NULL,
            invoice_year INTEGER NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
            payment_date TIMESTAMP WITH TIME ZONE,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(facility_id, invoice_month, invoice_year)
        );
    `;
    
    try {
        const { data, error } = await supabase
            .from('_pg_stat_activity') // Use a system table to execute raw SQL
            .select('*')
            .limit(0);
            
        // Since we can't execute raw SQL easily, let's try a different approach
        console.log('📝 Please run this SQL manually in Supabase Dashboard:');
        console.log('=' * 60);
        console.log(createTableSQL);
        console.log('=' * 60);
        
    } catch (err) {
        console.error('Error:', err);
    }
}

// Run the table creation
console.log('🚀 Starting facility_payment_status table creation...');
console.log('⚠️  Note: You may need to run the SQL manually in Supabase Dashboard');
console.log('');

createTableDirectly();

module.exports = { createPaymentStatusTable };
