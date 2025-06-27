-- Fix RLS Policies for Facilities Table Access
-- Run this SQL in the Supabase SQL Editor to allow dispatchers to access facilities

-- Step 1: Check current state
SELECT 'Current RLS policies for facilities table:' as info;
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'facilities';

-- Step 2: Check if RLS is enabled
SELECT 'RLS status for facilities table:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'facilities';

-- Step 3: Drop any existing problematic policies
DROP POLICY IF EXISTS "Allow dispatcher users to view facilities" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to view facilities" ON facilities;
DROP POLICY IF EXISTS "Allow all to view facilities" ON facilities;

-- Step 4: Create comprehensive policy for facility access
CREATE POLICY "Enable read access for authenticated users" 
ON facilities FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- Alternative: If the above doesn't work, try this more specific policy
-- Uncomment the following and comment out the above if needed:
/*
CREATE POLICY "Enable facility read for dispatchers and admins" 
ON facilities FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('dispatcher', 'admin', 'facility')
  )
);
*/

-- Step 5: Test the access
SELECT 'Testing facility access - should show our created facilities:' as info;
SELECT 
  id, 
  name, 
  address, 
  contact_email, 
  phone_number, 
  facility_type,
  created_at
FROM facilities 
ORDER BY created_at DESC;

-- Step 6: Show current user info for debugging
SELECT 'Current user info:' as info;
SELECT 
  auth.uid() as user_id,
  auth.role() as user_role;

-- Step 7: Check profiles to ensure dispatcher role exists
SELECT 'Dispatcher profiles:' as info;
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  facility_id
FROM profiles 
WHERE role IN ('dispatcher', 'admin') 
ORDER BY role, email;

-- Final verification: Show all policies now in effect
SELECT 'Final RLS policies for facilities:' as info;
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'facilities';