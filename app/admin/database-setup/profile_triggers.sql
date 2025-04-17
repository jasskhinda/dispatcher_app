-- Add helpful triggers for the profiles table
-- Run this in the Supabase SQL Editor

-- Check if the profiles table has a trigger for full_name
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_full_name'
  ) INTO trigger_exists;
  
  IF NOT trigger_exists THEN
    -- Create a function to calculate full_name from first_name and last_name
    CREATE OR REPLACE FUNCTION calculate_full_name()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Set full_name to the concatenation of first_name and last_name
      NEW.full_name := TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Create the trigger
    CREATE TRIGGER set_full_name
    BEFORE INSERT OR UPDATE OF first_name, last_name
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_full_name();
    
    RAISE NOTICE 'Created full_name trigger successfully';
  ELSE
    RAISE NOTICE 'full_name trigger already exists';
  END IF;
END $$;

-- Add a comment on the full_name column to document its behavior
COMMENT ON COLUMN profiles.full_name IS 'Automatically generated from first_name and last_name. Do not set directly.';

-- Add a function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if the profiles table has a trigger for updated_at
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_updated_at'
  ) INTO trigger_exists;
  
  IF NOT trigger_exists THEN
    -- Create the trigger
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();
    
    RAISE NOTICE 'Created updated_at trigger successfully';
  ELSE
    RAISE NOTICE 'updated_at trigger already exists';
  END IF;
END $$;