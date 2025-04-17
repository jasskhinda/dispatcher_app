-- Create a function to safely create profiles without RLS interference
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION safely_create_profile(
  user_id UUID,
  user_role TEXT DEFAULT 'dispatcher',
  first_name TEXT DEFAULT 'User',
  last_name TEXT DEFAULT 'Name',
  full_name TEXT DEFAULT NULL
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER -- Run with definer's privileges to bypass RLS
AS $$
DECLARE
  existing_profile_id UUID;
  profile_full_name TEXT;
BEGIN
  -- Check if the calling user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if profile already exists
  SELECT id INTO existing_profile_id FROM profiles WHERE id = user_id;
  
  -- Calculate full_name if not provided
  IF full_name IS NULL THEN
    profile_full_name := TRIM(CONCAT(first_name, ' ', last_name));
  ELSE
    profile_full_name := full_name;
  END IF;
  
  IF existing_profile_id IS NULL THEN
    -- Insert new profile
    INSERT INTO profiles (
      id, 
      role, 
      first_name, 
      last_name, 
      full_name, 
      created_at
    ) 
    VALUES (
      user_id,
      user_role,
      first_name,
      last_name,
      profile_full_name,
      now()
    );
  ELSE
    -- Profile exists, update only if called by dispatcher or the profile owner
    IF auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dispatcher'
    ) THEN
      UPDATE profiles
      SET 
        role = user_role,
        first_name = COALESCE(first_name, profiles.first_name),
        last_name = COALESCE(last_name, profiles.last_name),
        full_name = profile_full_name,
        updated_at = now()
      WHERE id = user_id;
    END IF;
  END IF;

  -- Return the profile
  RETURN QUERY SELECT * FROM profiles WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION safely_create_profile TO authenticated;