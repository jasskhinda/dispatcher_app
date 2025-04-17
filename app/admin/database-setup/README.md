# Database Setup for Compassionate Rides Dispatcher App

This directory contains SQL scripts that need to be run on the Supabase database to ensure proper permissions and functionality.

## Scripts

1. `user_creation_policies.sql` - This script sets up the necessary policies and functions to allow dispatchers to create users (drivers and clients) from the application.
2. `simple_test_function.sql` - A simplified version of the user creation function for testing if the main function has issues.
3. `update_profiles_table.sql` - Ensures the profiles table has all the necessary columns for drivers and clients.
4. `fix_policies_recursion.sql` - Fixes infinite recursion issues in the profile policies.
5. `create_profiles_rpc.sql` - Creates an RPC function to fetch profiles safely without recursion issues.
6. `create_safe_profile_function.sql` - Creates an RPC function to safely create profiles bypassing RLS issues.
7. `fix_profiles_rpc.sql` - Provides an improved version of the profiles RPC function that's guaranteed to work.
8. `fix_profiles_rpc_for_dispatchers.sql` - Enhances the RPC functions specifically for dispatchers to view all profiles.
9. `create_client_views.sql` - Creates views and functions to help fetch client profiles more reliably.
10. `fix_dispatcher_check.sql` - Creates reliable functions to check if the current user is a dispatcher.
11. `profile_triggers.sql` - Adds helpful triggers for the profiles table, including automatic full_name generation.
12. `add_status_to_profiles.sql` - Adds a status column to the profiles table for drivers and updates existing records.

## How to Run the Scripts

1. Log in to your Supabase project
2. Go to the SQL Editor

## Environment Variables Setup

This application requires certain environment variables to function properly. Create a `.env.local` file in the project root with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The `SUPABASE_SERVICE_ROLE_KEY` is used for admin operations like creating users. You can find these values in your Supabase project settings under API.
3. Copy and paste the content of each script into a new query
4. Run the query
5. **IMPORTANT:** Check the execution result for any errors

## Important Notes

- Make sure to run the scripts in order
- These scripts assume you already have the basic tables created (profiles, trips, etc.)
- These scripts add additional permissions and functions specifically for the dispatcher functionality
- The SQL function `create_user_for_dispatcher` allows dispatchers to create new users without admin privileges

## Known Issues and Solutions

### "Error creating profile: {}" error when logging in

This error occurs when the dashboard tries to access a profile but encounters policy issues. To fix this:

1. Profiles are created during signup, so we don't need to create them during login
2. Run the `create_profiles_rpc.sql` script to create a secure RPC function for fetching profiles
3. The application now uses multiple methods to attempt to fetch the existing profile
4. If all fetch methods fail, it gracefully continues with a fallback profile object
5. The middleware no longer attempts to create profiles, which avoids duplicate creation errors

### "email column does not exist" error

This means your `profiles` table doesn't have an email column. The email is stored in the auth.users table, not in profiles. This is normal and our code handles it correctly.

### "User not allowed" error

If you receive this error when creating drivers or clients, it may be because:

1. The SQL scripts haven't been run successfully
2. The user trying to create the drivers/clients doesn't have the 'dispatcher' role
3. There's an issue with the RLS (Row Level Security) policies

Solutions:
- Make sure the SQL script executed properly without errors
- Check that your logged-in user has the 'dispatcher' role in the profiles table
- Try running this query in the SQL Editor to check and fix your user's role:

```sql
UPDATE profiles
SET role = 'dispatcher'
WHERE id = 'your-user-id-here';
```

### "User with this email already exists but could not be fetched" error

This indicates a problem with the user lookup logic. Try these solutions:

1. Make sure the latest version of the SQL script is executed
2. If the email truly doesn't exist in your system, try a completely new email
3. Check the server logs for more detailed error information

### "Could not find the 'X' column of 'profiles'" error

This error means there's a mismatch between the fields you're trying to insert and the actual columns in your profiles table. To fix it:

1. Run the `update_profiles_table.sql` script to ensure all needed columns exist
2. Check which columns actually exist in your profiles table with this SQL query:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'profiles'
   ORDER BY ordinal_position;
   ```
3. If you continue to get errors, modify the application code to only include fields that exist in your database

The `update_profiles_table.sql` script will add missing columns including:
- vehicle_model (for drivers)
- vehicle_license (for drivers)
- address (for clients)
- notes (for clients)
- metadata (for extra information)

### "infinite recursion detected in policy" error

This error occurs when a policy for the profiles table references itself in a way that creates an infinite loop. To fix this:

1. Run the `fix_policies_recursion.sql` script to update the policies
2. This will replace the problematic policies with ones that avoid recursion
3. The script removes policies that use `(SELECT role FROM profiles WHERE id = auth.uid())` patterns
4. The new policies use `EXISTS` subqueries that prevent the recursion

If you continue to have policy issues when fetching client profiles:

1. Run the `fix_profiles_rpc.sql` script which creates an improved RPC function
2. This function uses `SECURITY DEFINER` to bypass RLS policies completely
3. The function also specifies exact return columns to avoid schema issues
4. Includes a debugging function to help check your profile table structure

If you continue to have policy issues, you can check your current policies with:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

And check your profile table structure with:
```sql
SELECT * FROM get_profile_columns();
```

### "Getting logged in as a new user", "Wrong role", or "Modifies current user" issues

If you experience issues where:
- Creating a new driver/client logs you in as that user
- New users are created with the wrong role (e.g., driver with dispatcher role)
- The form modifies the current user's profile instead of creating a new one

This is fixed by:

1. Setting up the environment variables with `SUPABASE_SERVICE_ROLE_KEY`
2. Using the admin client for user creation instead of the regular auth methods
3. The application has been updated to use the admin client with a completely rewritten API

The rewritten user creation API now:
- First checks if the current user is a dispatcher
- Uses a clear step-by-step process for user creation
- Always creates a new user with the correct role
- Properly checks for existing users by email
- Creates a new profile with the correct role and user ID
- Uses proper error handling at each step
- Never affects the current user's session

### "column full_name can only be updated to DEFAULT" error

If you get this error when creating users, it means there's a trigger on the profiles table that automatically sets the full_name from first_name and last_name. To fix this:

1. Run the `profile_triggers.sql` script to ensure proper triggers are set up
2. Remove any code that directly sets the full_name field
3. The application code has been updated to only set first_name and last_name
4. The database will automatically calculate full_name for you

### "Empty client list" or "Dispatchers can't see client profiles" issues

If dispatchers are logged in but can't see any clients in the clients list:

1. Run the `fix_profiles_rpc_for_dispatchers.sql` script to enhance the RPC functions
2. Run the `create_client_views.sql` script to create helper views and functions
3. These scripts provide multiple approaches to fetch client profiles reliably
4. Run the `fix_dispatcher_check.sql` script to add reliable dispatcher checking functions
5. Check your dispatcher status with these queries:
   ```sql
   -- Simple check (returns true/false)
   SELECT is_dispatcher();
   
   -- Detailed check (returns full info)
   SELECT * FROM check_dispatcher_status();
   ```
6. If the checks show you're not a dispatcher, update your role:
   ```sql
   UPDATE profiles SET role = 'dispatcher' WHERE id = 'your-user-id';
   ```

## Testing SQL Functions Directly

You can test the user creation functions directly in the SQL Editor:

### Main Function

```sql
SELECT create_user_for_dispatcher('test@example.com', 'password123', '{}', true);
```

This should return a JSON object with a user_id if successful.

### Simple Test Function

If the main function doesn't work, try the simpler one:

```sql
SELECT create_test_user('test@example.com', 'password123');
```

### Troubleshooting SQL Functions

If you encounter syntax errors with the functions, try:

1. Make sure you copy the entire SQL script, including the final semi-colon
2. Make sure there are no hidden characters in the script
3. If using the simpler function still doesn't work, your Supabase instance may have restrictions on creating users directly

In that case, use the application's built-in fallback mechanism which uses standard Supabase auth API calls.