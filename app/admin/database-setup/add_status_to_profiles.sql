-- SQL script to add the status field to the profiles table
-- Run this in the Supabase SQL Editor

DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'status'
    ) THEN
        -- Add the status column to the profiles table
        ALTER TABLE profiles ADD COLUMN status TEXT;
        RAISE NOTICE 'Added status column to profiles table';
        
        -- Update existing driver profiles to set a default status
        UPDATE profiles 
        SET status = 'available' 
        WHERE role = 'driver' AND status IS NULL;
        
        -- Migrate any status values from metadata if they exist
        UPDATE profiles 
        SET status = (metadata::json->>'status')
        WHERE role = 'driver' 
        AND metadata::jsonb ? 'status' 
        AND status IS NULL;
        
        RAISE NOTICE 'Updated existing driver profiles with default and metadata-based status';
    ELSE
        RAISE NOTICE 'Status column already exists in profiles table';
    END IF;
END
$$;