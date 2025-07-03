import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        getAll() {
          return cookieStore.getAll();
        },
        set(name, value, options) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // The `set` method was called from a Route Handler.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {
            // The `remove` method was called from a Route Handler.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}