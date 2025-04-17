-- Create a more reliable dispatcher check function
-- Run this in the Supabase SQL Editor

-- Function to help debug dispatcher status - this helps troubleshoot permission issues
DROP FUNCTION IF EXISTS check_dispatcher_status();

CREATE OR REPLACE FUNCTION check_dispatcher_status()
RETURNS TABLE (
  user_id UUID,
  is_authenticated BOOLEAN,
  profile_exists BOOLEAN,
  is_dispatcher BOOLEAN,
  user_role TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH user_check AS (
    SELECT 
      auth.uid() AS current_user_id,
      auth.uid() IS NOT NULL AS is_auth
  ),
  profile_check AS (
    SELECT 
      uc.current_user_id,
      uc.is_auth,
      p.id IS NOT NULL AS has_profile,
      p.role = 'dispatcher' AS is_disp,
      p.role
    FROM 
      user_check uc
    LEFT JOIN 
      profiles p ON uc.current_user_id = p.id
  )
  SELECT 
    pc.current_user_id,
    pc.is_auth,
    pc.has_profile,
    pc.is_disp,
    pc.role
  FROM 
    profile_check pc;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_dispatcher_status TO authenticated;

-- Also create a simpler check function that's just a boolean result
CREATE OR REPLACE FUNCTION is_dispatcher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'dispatcher'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_dispatcher TO authenticated;