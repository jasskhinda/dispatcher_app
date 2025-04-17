-- Create helper views and functions to make client fetching more reliable
-- Run this in the Supabase SQL Editor

-- Create a function to create the client_ids_view if it doesn't exist
CREATE OR REPLACE FUNCTION create_client_ids_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop the view if it exists
  DROP VIEW IF EXISTS client_ids_view;
  
  -- Create the view
  EXECUTE '
    CREATE VIEW client_ids_view AS 
    SELECT id 
    FROM profiles 
    WHERE role = ''client''
    ORDER BY created_at DESC
  ';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_client_ids_view TO authenticated;

-- Create the view immediately
SELECT create_client_ids_view();

-- Create a function to get client IDs directly without a view
CREATE OR REPLACE FUNCTION get_client_ids()
RETURNS TABLE (id UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id
  FROM profiles p
  WHERE p.role = 'client'
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_client_ids TO authenticated;

-- Create a function to get all clients with full details
CREATE OR REPLACE FUNCTION get_all_clients()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_dispatcher BOOLEAN;
BEGIN
  -- Check if user is a dispatcher
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'dispatcher'
  ) INTO is_dispatcher;
  
  -- Only dispatchers can get all clients
  IF is_dispatcher THEN
    RETURN QUERY
    SELECT *
    FROM profiles
    WHERE role = 'client'
    ORDER BY created_at DESC;
  ELSE
    -- Non-dispatchers get an empty result
    RETURN QUERY
    SELECT *
    FROM profiles
    WHERE 1=0; -- Empty set
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_clients TO authenticated;