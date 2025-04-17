-- Create an RPC function to fetch profiles by IDs without recursion issues
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_profiles_by_ids(user_ids UUID[])
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER -- Run with definer's privileges to bypass RLS
AS $$
BEGIN
  -- Check if the calling user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if the calling user is a dispatcher
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'dispatcher'
  ) THEN
    -- Not a dispatcher, return only own profile
    RETURN QUERY
    SELECT * FROM profiles
    WHERE id = auth.uid();
  ELSE
    -- Dispatcher, return requested profiles
    RETURN QUERY
    SELECT * FROM profiles
    WHERE id = ANY(user_ids);
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profiles_by_ids TO authenticated;