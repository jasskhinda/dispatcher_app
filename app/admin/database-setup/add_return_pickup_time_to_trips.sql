-- Add return_pickup_time column to trips table for round trips
-- This column will store the time when the client should be picked up for the return journey

-- Check if the column already exists before attempting to add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trips'
        AND column_name = 'return_pickup_time'
    ) THEN
        -- Add the return_pickup_time column to trips table
        ALTER TABLE trips
        ADD COLUMN return_pickup_time TIMESTAMP WITH TIME ZONE;
        
        -- Add a comment for documentation
        COMMENT ON COLUMN trips.return_pickup_time IS 'Pickup time for the return journey when is_round_trip is true';
    END IF;
END $$;

-- Update existing round trips to set a default return_pickup_time (4 hours after pickup)
-- Only for demonstration - actual times should be set by the dispatcher
UPDATE trips
SET return_pickup_time = pickup_time + interval '4 hours'
WHERE is_round_trip = true
AND return_pickup_time IS NULL;

-- Optional: Create an index for faster queries on this column
CREATE INDEX IF NOT EXISTS idx_trips_return_pickup_time ON trips(return_pickup_time);