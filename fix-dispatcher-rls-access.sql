-- Fix RLS policies to allow dispatcher app to access facility data
-- Run this in Supabase SQL Editor

-- First, check current policies
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('facilities', 'trips', 'profiles');

-- Add policy to allow authenticated users to view facilities
-- This will allow the dispatcher app to see facility data
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view facilities" 
ON facilities FOR SELECT 
USING (true);

-- Ensure the dispatcher can also view trips from all facilities
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view all trips" 
ON trips FOR SELECT 
USING (true);

-- If you want more restrictive access, you can create role-based policies instead:
-- First check if the dispatcher user has a specific role
SELECT id, email, role FROM profiles WHERE email LIKE '%dispatch%' OR role = 'dispatcher';

-- Alternative: Role-based policy (uncomment if you have role system)
/*
DROP POLICY IF EXISTS "Allow authenticated users to view facilities" ON facilities;
CREATE POLICY "Allow dispatcher and admin to view facilities" 
ON facilities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('dispatcher', 'admin', 'facility')
    )
);
*/

-- Test the fix by checking if we can see facilities
SELECT id, name, address, contact_email FROM facilities ORDER BY name;

-- Check trips with facility_id
SELECT COUNT(*) as total_trips, 
       COUNT(CASE WHEN facility_id IS NOT NULL THEN 1 END) as facility_trips
FROM trips;
