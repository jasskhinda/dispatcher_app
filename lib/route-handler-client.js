import { createRouteHandlerClient as createRouteHandlerClientAuth } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  return createRouteHandlerClientAuth({ cookies: () => cookieStore });
}