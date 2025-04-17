-- Fix the get_profiles_by_ids RPC function to ensure it works reliably
-- Run this in the Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_profiles_by_ids(UUID[]);

-- Create an improved version that avoids recursion and other issues
CREATE OR REPLACE FUNCTION get_profiles_by_ids(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  role TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  phone_number TEXT,
  vehicle_model TEXT,
  vehicle_license TEXT,
  address TEXT,
  notes TEXT,
  metadata JSONB
)
LANGUAGE sql
SECURITY DEFINER -- Run with definer's privileges to bypass RLS
AS $$
  -- This SQL function bypasses RLS policies completely
  SELECT 
    p.id,
    p.role,
    p.first_name,
    p.last_name,
    p.full_name,
    p.created_at,
    p.updated_at,
    p.phone_number,
    p.vehicle_model,
    p.vehicle_license,
    p.address,
    p.notes,
    p.metadata::jsonb
  FROM 
    profiles p
  WHERE 
    p.id = ANY(user_ids)
  ORDER BY
    p.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profiles_by_ids TO authenticated;

-- Add a function to help check profile table structure (for debugging)
CREATE OR REPLACE FUNCTION get_profile_columns()
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text, 
    data_type::text
  FROM 
    information_schema.columns
  WHERE 
    table_name = 'profiles'
  ORDER BY 
    ordinal_position;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profile_columns TO authenticated;