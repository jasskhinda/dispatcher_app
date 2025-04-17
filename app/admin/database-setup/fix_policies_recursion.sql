-- This script fixes the infinite recursion in profiles policies
-- Run this in the Supabase SQL Editor

-- First, find existing policies (uncomment to check)
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Drop problematic policies that may cause recursion
DROP POLICY IF EXISTS "Dispatchers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Dispatchers can update any profile" ON profiles;
DROP POLICY IF EXISTS "Dispatchers can create profiles for users" ON profiles;
DROP POLICY IF EXISTS "Dispatchers can delete profiles" ON profiles;

-- Create new policies that avoid recursion by using a direct check
-- Policy for dispatchers to view all profiles
CREATE POLICY "Dispatchers can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'dispatcher'
  )
);

-- Policy for dispatchers to insert profiles
CREATE POLICY "Dispatchers can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'dispatcher'
  )
);

-- Policy for dispatchers to update profiles
CREATE POLICY "Dispatchers can update profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'dispatcher'
  )
);

-- Policy for dispatchers to delete profiles
CREATE POLICY "Dispatchers can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'dispatcher'
  )
);

-- Policy for users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
);

-- Grant public access to profiles table
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;