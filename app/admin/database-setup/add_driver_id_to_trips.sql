-- Add driver_id column to trips table
ALTER TABLE trips 
ADD COLUMN driver_id UUID REFERENCES auth.users(id);

-- Create an index on driver_id for better query performance
CREATE INDEX idx_trips_driver_id ON trips(driver_id);

-- Update RLS policies to include driver_id checks where needed