-- Fix dispatcher role for your user
-- Replace 'your-email@example.com' with your actual email

-- First, let's see what your current profile looks like
SELECT id, email, role, first_name, last_name, full_name 
FROM profiles 
WHERE email = 'your-email@example.com';

-- Update your profile to have dispatcher role
UPDATE profiles 
SET role = 'dispatcher' 
WHERE email = 'your-email@example.com';

-- Verify the update worked
SELECT id, email, role, first_name, last_name, full_name 
FROM profiles 
WHERE email = 'your-email@example.com';