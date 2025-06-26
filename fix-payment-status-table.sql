-- Quick fix: Create facility_payment_status table for payment tracking
-- This script creates the missing table that's causing the "Failed to update payment status" error

-- Create the table
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

-- Create policies for all authenticated users
DROP POLICY IF EXISTS "payment_status_policy" ON facility_payment_status;
CREATE POLICY "payment_status_policy" 
ON facility_payment_status 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON facility_payment_status TO authenticated;

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_facility_payment_lookup 
ON facility_payment_status(facility_id, invoice_year, invoice_month);

-- Verify table creation
SELECT 'Table created successfully' as status;

-- Show existing data (if any)
SELECT COUNT(*) as existing_records FROM facility_payment_status;
