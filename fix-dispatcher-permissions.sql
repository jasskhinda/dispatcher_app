-- DISPATCHER PERMISSIONS FIX
-- Run this in Supabase SQL Editor to ensure dispatchers can approve/reject trips

-- First, ensure the dispatcher role exists in profiles
-- You may need to manually set a user's role to 'dispatcher' in the profiles table

-- Check if dispatcher policies exist for trips table
-- If not, create them

-- Policy to allow dispatchers to view all trips
DROP POLICY IF EXISTS "Dispatchers can view all trips" ON trips;
CREATE POLICY "Dispatchers can view all trips" 
ON trips FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'dispatcher'
  )
);

-- Policy to allow dispatchers to update trip status
DROP POLICY IF EXISTS "Dispatchers can update trips" ON trips;
CREATE POLICY "Dispatchers can update trips" 
ON trips FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'dispatcher'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'dispatcher'
  )
);

-- Ensure your user has dispatcher role
-- Replace 'your-user-id' with actual dispatcher user ID
-- UPDATE profiles SET role = 'dispatcher' WHERE id = 'your-user-id';

-- Check current policies on trips table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'trips';
