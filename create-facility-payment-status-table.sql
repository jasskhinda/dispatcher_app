-- Create facility_payment_status table for tracking monthly payment status
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_facility_payment_status_facility_date 
ON facility_payment_status(facility_id, invoice_year, invoice_month);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_facility_payment_status_status 
ON facility_payment_status(status);

-- Add RLS policy (Row Level Security)
ALTER TABLE facility_payment_status ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can view facility payment status" 
ON facility_payment_status FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert facility payment status" 
ON facility_payment_status FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update facility payment status" 
ON facility_payment_status FOR UPDATE 
TO authenticated 
USING (true);

-- Grant permissions
GRANT ALL ON facility_payment_status TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
