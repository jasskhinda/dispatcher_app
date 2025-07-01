// This file contains auth-related utilities

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Create Supabase client for server components
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This can happen in middleware when the cookies object is readonly
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // This can happen in middleware when the cookies object is readonly
          }
        },
      },
    }
  );
}

// NOTE: This middleware is DISABLED in favor of the main middleware.js file
// This duplicate middleware was causing redirect loops
// Keeping the function for reference but it should not be used
export async function authMiddleware(request) {
  // This function is no longer used
  console.warn('authMiddleware in lib/auth.js is deprecated - using middleware.js instead');
  return NextResponse.next();
}
  
