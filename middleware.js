import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check auth condition
  const isAuthRoute = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup';
  const isPublicRoute = req.nextUrl.pathname === '/' || 
                        req.nextUrl.pathname.startsWith('/_next') || 
                        req.nextUrl.pathname.match(/\.(ico|png|jpg|svg|css|js)$/);
  
  // If accessing a protected route without being authenticated
  if (!session && !isAuthRoute && !isPublicRoute) {
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing auth routes while authenticated
  if (session && isAuthRoute) {
    const redirectUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated, check if user has dispatcher role
  if (session && !isAuthRoute && !isPublicRoute) {
    try {
      // Check if the profile exists and has dispatcher role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      // If profile not found, attempt to create a profile with dispatcher role
      if (error) {
        // If profile doesn't exist, try to create one
        await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            first_name: 'Dispatcher',
            last_name: 'User',
            role: 'dispatcher',
            email: session.user.email
          });
      } 
      // If profile exists but doesn't have dispatcher role, update it
      else if (profile && profile.role !== 'dispatcher') {
        await supabase
          .from('profiles')
          .update({ role: 'dispatcher' })
          .eq('id', session.user.id);
      }
    } catch (err) {
      // Continue anyway - the dispatcher app requires dispatcher role
      console.log('Note: could not verify or set dispatcher role');
    }
    
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.png|.*\\.svg).*)',
  ],
};