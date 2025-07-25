import { createClient } from '@supabase/supabase-js';

// This client should only be used in server-side code
// It has admin privileges and can bypass email verification

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error('Missing Supabase URL environment variable');
}

if (!supabaseServiceKey && !supabaseAnonKey) {
    throw new Error('Missing Supabase key environment variables');
}

// Create an admin client that has elevated privileges
// Preferring the service role key but falling back to anon key for development
export const adminSupabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});