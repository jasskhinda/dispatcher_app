-- Fix RLS Policies for Trips Table Access
-- Run this SQL in the Supabase SQL Editor to allow trip creation

-- Step 1: Check current RLS policies for trips
SELECT 'Current RLS policies for trips table:' as info;
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'trips';

-- Step 2: Drop any existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to insert trips" ON trips;
DROP POLICY IF EXISTS "Allow dispatchers to insert trips" ON trips;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON trips;

-- Step 3: Create comprehensive policy for trip creation
CREATE POLICY "Enable trip creation for authenticated users" 
ON trips FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated'
);

-- Step 4: Ensure read access for trips
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON trips;
CREATE POLICY "Enable read access for authenticated users" 
ON trips FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- Step 5: Ensure update access for trips (for status changes)
DROP POLICY IF EXISTS "Enable update for authenticated users" ON trips;
CREATE POLICY "Enable update for authenticated users" 
ON trips FOR UPDATE 
USING (
  auth.role() = 'authenticated'
) 
WITH CHECK (
  auth.role() = 'authenticated'
);

-- Step 6: Test current user access
SELECT 'Current user info:' as info;
SELECT 
  auth.uid() as user_id,
  auth.role() as user_role;

-- Step 7: Check if user has dispatcher profile
SELECT 'User profile check:' as info;
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  facility_id
FROM profiles 
WHERE id = auth.uid();

-- Step 8: Final verification - show all trip policies
SELECT 'Final RLS policies for trips:' as info;
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'trips'
ORDER BY cmd, policyname;