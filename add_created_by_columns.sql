-- Add created_by and created_by_role columns to trips table
-- This will track who created the trip and their role

-- Add created_by column (references the user who created the trip)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by_role column (tracks the role of the creator)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS created_by_role TEXT CHECK (created_by_role IN ('client', 'dispatcher', 'admin', 'facility'));

-- Create index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_trips_created_by ON trips(created_by);
CREATE INDEX IF NOT EXISTS idx_trips_created_by_role ON trips(created_by_role);

-- Add comment to document the columns
COMMENT ON COLUMN trips.created_by IS 'UUID of the user who created this trip';
COMMENT ON COLUMN trips.created_by_role IS 'Role of the user who created this trip (client, dispatcher, admin, facility)';