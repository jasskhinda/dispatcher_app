-- Fix the get_profiles_by_ids RPC function to ensure it works reliably for dispatchers
-- Run this in the Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_profiles_by_ids(UUID[]);

-- Create an improved version that works better for dispatchers
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
LANGUAGE plpgsql
SECURITY DEFINER -- Run with definer's privileges to bypass RLS
AS $$
DECLARE
  is_dispatcher BOOLEAN;
BEGIN
  -- Check if the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if the caller is a dispatcher
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'dispatcher'
  ) INTO is_dispatcher;
  
  -- If the user is a dispatcher, return all requested profiles
  IF is_dispatcher THEN
    RETURN QUERY
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
  ELSE
    -- If not a dispatcher, only return the user's own profile
    RETURN QUERY
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
      p.id = auth.uid() AND p.id = ANY(user_ids);
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profiles_by_ids TO authenticated;

-- Function to help debug dispatcher status - this helps troubleshoot permission issues
CREATE OR REPLACE FUNCTION check_dispatcher_status()
RETURNS TABLE (
  user_id UUID,
  is_authenticated BOOLEAN,
  profile_exists BOOLEAN,
  is_dispatcher BOOLEAN,
  user_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  has_profile BOOLEAN;
  is_disp BOOLEAN;
  role TEXT;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      FALSE, 
      FALSE,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = current_user_id
  ) INTO has_profile;
  
  -- Default values
  is_disp := FALSE;
  role := NULL;
  
  -- If profile exists, check dispatcher status
  IF has_profile THEN
    SELECT 
      p.role = 'dispatcher',
      p.role
    INTO 
      is_disp,
      role
    FROM 
      profiles p 
    WHERE 
      p.id = current_user_id;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT 
    current_user_id,
    TRUE,
    has_profile,
    is_disp,
    role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_dispatcher_status TO authenticated;