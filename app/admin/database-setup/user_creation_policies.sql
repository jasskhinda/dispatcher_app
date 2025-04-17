-- Add policies to allow dispatchers to create users through server-side functions
-- Run this in the Supabase SQL editor

-- Create and enable a function for dispatcher user creation
CREATE OR REPLACE FUNCTION public.create_user_for_dispatcher(
  email text,
  password text,
  metadata jsonb DEFAULT '{}'::jsonb,
  confirm_email boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_user_id uuid;
  caller_role text;
  new_user_id uuid;
  existing_user_id uuid;
  result json;
BEGIN
  -- Check if the calling user is authenticated
  caller_user_id := auth.uid();
  
  -- Check if the calling user is a dispatcher
  SELECT role INTO caller_role FROM profiles WHERE id = caller_user_id;
  
  IF caller_role IS NULL OR caller_role != 'dispatcher' THEN
    RAISE EXCEPTION 'Only dispatchers can create users';
  END IF;
  
  -- First check if user already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE auth.users.email = create_user_for_dispatcher.email;
  
  -- If user exists, return the existing ID
  IF existing_user_id IS NOT NULL THEN
    result := json_build_object('user_id', existing_user_id, 'is_new', false);
    RETURN result;
  END IF;
  
  -- User doesn't exist, create a new one
  INSERT INTO auth.users (
    email, 
    encrypted_password, 
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data
  )
  VALUES (
    create_user_for_dispatcher.email,
    auth.crypt(create_user_for_dispatcher.password, auth.gen_salt('bf')),
    CASE WHEN confirm_email THEN now() ELSE NULL END,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    create_user_for_dispatcher.metadata
  )
  RETURNING id INTO new_user_id;
  
  -- Return the new user ID
  result := json_build_object('user_id', new_user_id, 'is_new', true);
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_for_dispatcher TO authenticated;

-- Add RLS policies to allow dispatchers to create profiles for drivers and clients
DROP POLICY IF EXISTS "Dispatchers can create profiles for users" ON profiles;
CREATE POLICY "Dispatchers can create profiles for users" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher'
);

-- Allow dispatchers to delete profiles
DROP POLICY IF EXISTS "Dispatchers can delete profiles" ON profiles;
CREATE POLICY "Dispatchers can delete profiles" 
ON profiles FOR DELETE 
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher'
);