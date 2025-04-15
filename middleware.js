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
  const isPublicRoute = req.nextUrl.pathname === '/';
  
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

  // If authenticated, check for correct role on protected routes
  if (session && !isAuthRoute && !isPublicRoute) {
    try {
      // Get user profile to check role
      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile) {
        // If error or no profile found, redirect to logout
        await supabase.auth.signOut();
        const redirectUrl = new URL('/login?error=Invalid user profile', req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Check if user has dispatcher role
      if (profile.role !== 'dispatcher') {
        // Not a dispatcher, sign out and redirect to login with error
        await supabase.auth.signOut();
        const redirectUrl = new URL('/login?error=Access denied. This application is only for dispatchers.', req.url);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Error in middleware role check:', error);
      // On error, best to sign out and redirect to login
      await supabase.auth.signOut();
      const redirectUrl = new URL('/login?error=Authentication error', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
};