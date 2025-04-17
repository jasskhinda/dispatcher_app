-- A simpler function for testing purposes
-- Run this in the SQL editor if you're having trouble with the main function

CREATE OR REPLACE FUNCTION public.create_test_user(
  test_email text,
  test_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_user_id uuid;
  new_user_id uuid;
  result json;
BEGIN
  -- Check if user exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = test_email;
  
  -- If exists, return existing ID
  IF existing_user_id IS NOT NULL THEN
    result := json_build_object('user_id', existing_user_id, 'status', 'existing');
    RETURN result;
  END IF;
  
  -- Create new user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data
  )
  VALUES (
    test_email,
    auth.crypt(test_password, auth.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb
  )
  RETURNING id INTO new_user_id;
  
  result := json_build_object('user_id', new_user_id, 'status', 'created');
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_test_user TO authenticated;