-- SQL script to update the profiles table with all required fields
-- Run this in the Supabase SQL Editor

-- First check if the profiles table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Create the profiles table if it doesn't exist
        CREATE TABLE profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id),
            role TEXT NOT NULL CHECK (role IN ('client', 'driver', 'dispatcher')),
            first_name TEXT,
            last_name TEXT,
            full_name TEXT,
            phone_number TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Enable Row Level Security
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Add columns if they don't exist
DO $$
DECLARE
    column_to_add TEXT;
    columns_to_add TEXT[] := ARRAY[
        'vehicle_model',
        'vehicle_license',
        'address',
        'notes',
        'metadata'
    ];
BEGIN
    FOREACH column_to_add IN ARRAY columns_to_add
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'profiles' AND column_name = column_to_add
        ) THEN
            EXECUTE format('ALTER TABLE profiles ADD COLUMN %I TEXT', column_to_add);
            RAISE NOTICE 'Added column %', column_to_add;
        END IF;
    END LOOP;
END
$$;

-- Update the profiles table policies
-- Policy for users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Policy for dispatchers to view all profiles
DROP POLICY IF EXISTS "Dispatchers can view all profiles" ON profiles;
CREATE POLICY "Dispatchers can view all profiles"
ON profiles FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher');

-- Policy for dispatchers to update any profile
DROP POLICY IF EXISTS "Dispatchers can update any profile" ON profiles;
CREATE POLICY "Dispatchers can update any profile"
ON profiles FOR UPDATE
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher');

-- Sample query to check the current structure of the profiles table
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;

-- Sample query to check existing RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';