-- RLS Policy Fix for Dispatcher App Facility Access
-- This SQL should be run in the Supabase SQL Editor to allow dispatcher users to view facilities

-- First, let's see what RLS policies currently exist
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'facilities';

-- Check if the facilities table has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'facilities';

-- Recommended fix: Add policy to allow authenticated users to view facilities
-- This assumes the dispatcher is an authenticated user who should be able to view all facilities

CREATE POLICY "Allow authenticated users to view facilities" 
ON facilities FOR SELECT 
USING (auth.role() = 'authenticated');

-- Alternative: If you have specific roles, create a policy for dispatcher role
-- (Uncomment if you have a role-based system)
/*
CREATE POLICY "Allow dispatcher users to view facilities" 
ON facilities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('dispatcher', 'admin')
    )
);
*/

-- If you need to allow all users to view facilities (less secure but simpler):
-- CREATE POLICY "Allow all to view facilities" ON facilities FOR SELECT USING (true);

-- To check the current user's role and ID (for debugging):
SELECT 
    auth.uid() as user_id,
    auth.role() as user_role;

-- To see what facilities exist (this will work if the policies are fixed):
SELECT id, name, address, contact_email FROM facilities ORDER BY name;
