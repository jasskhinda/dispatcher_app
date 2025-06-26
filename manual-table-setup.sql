-- Manual Database Setup for Payment Status Error Fix
-- Run this SQL directly in your Supabase SQL Editor
-- Go to: Supabase Dashboard > SQL Editor > New Query

-- 1. Create the facility_payment_status table
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

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_facility_payment_status_facility_date 
ON facility_payment_status(facility_id, invoice_year, invoice_month);

CREATE INDEX IF NOT EXISTS idx_facility_payment_status_status 
ON facility_payment_status(status);

-- 3. Enable Row Level Security
ALTER TABLE facility_payment_status ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view facility payment status" ON facility_payment_status;
DROP POLICY IF EXISTS "Authenticated users can insert facility payment status" ON facility_payment_status;
DROP POLICY IF EXISTS "Authenticated users can update facility payment status" ON facility_payment_status;
DROP POLICY IF EXISTS "payment_status_policy" ON facility_payment_status;

-- 5. Create comprehensive RLS policies
CREATE POLICY "payment_status_all_access" 
ON facility_payment_status 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 6. Grant necessary permissions
GRANT ALL ON facility_payment_status TO authenticated;
GRANT ALL ON facility_payment_status TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 7. Test the table creation
SELECT 'facility_payment_status table created successfully' as status;

-- 8. Insert a test record to verify everything works
INSERT INTO facility_payment_status (
    facility_id, 
    invoice_month, 
    invoice_year, 
    total_amount, 
    status
) VALUES (
    'test-facility-id', 
    6, 
    2025, 
    100.00, 
    'UNPAID'
) ON CONFLICT (facility_id, invoice_month, invoice_year) 
DO UPDATE SET updated_at = NOW();

-- 9. Verify the test record
SELECT * FROM facility_payment_status WHERE facility_id = 'test-facility-id';

-- 10. Clean up test record
DELETE FROM facility_payment_status WHERE facility_id = 'test-facility-id';

-- Done! The table is now ready for use.
