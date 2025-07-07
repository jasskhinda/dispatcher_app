-- Add missing 'notes' column to facility_managed_clients table
ALTER TABLE facility_managed_clients ADD COLUMN IF NOT EXISTS notes TEXT;