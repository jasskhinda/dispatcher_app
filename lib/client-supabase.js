// Client-side Supabase client
'use client';

import { createBrowserClient } from '@supabase/ssr';

export const createClientSupabase = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Export with the expected name for consistency  
export { createClientSupabase as createBrowserClient };

// Create a Supabase client with a custom creation function for use in components
// This ensures email confirmation is bypassed for signup
export const createCustomSupabaseClient = () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Enhance the auth.signUp method to automatically sign in the user
  const enhancedSignUp = async ({ email, password, options }) => {
    // First, sign up the user
    const signUpResult = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...options,
        // This makes sign-up instantly log in the user without email verification
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    });
    
    // If signup was successful and there's no error, immediately sign in the user
    if (signUpResult.data?.user && !signUpResult.error) {
      await supabase.auth.signInWithPassword({
        email,
        password
      });
    }
    
    return signUpResult;
  };
  
  // Return a modified client with the enhanced signUp method
  return {
    ...supabase,
    auth: {
      ...supabase.auth,
      signUp: enhancedSignUp
    }
  };
};