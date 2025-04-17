import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  console.log("MIDDLEWARE: Path =", req.nextUrl.pathname);
  
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("MIDDLEWARE: Session exists =", !!session);

  // Check auth condition
  const isAuthRoute = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup';
  const isPublicRoute = req.nextUrl.pathname === '/' || 
                        req.nextUrl.pathname.startsWith('/_next') || 
                        req.nextUrl.pathname.match(/\.(ico|png|jpg|svg|css|js)$/);
  
  // If accessing a protected route without being authenticated
  if (!session && !isAuthRoute && !isPublicRoute) {
    console.log("MIDDLEWARE: Redirecting to login - no session on protected route");
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing auth routes while authenticated
  if (session && isAuthRoute) {
    console.log("MIDDLEWARE: Redirecting to dashboard - authenticated on auth route");
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
      
      console.log("MIDDLEWARE: Profile check result:", profile?.role, error?.message);
      
      // Log profile status but don't try to create one - profiles should be created during signup
      if (error) {
        console.log('Profile not found in middleware check - will continue anyway');
        // Don't try to create a profile here - it should already exist
        // If it doesn't exist, the page components will handle it more gracefully
      } 
      // Only modify the role if no role is set
      else if (profile && !profile.role) {
        try {
          // Just to be sure the user has the correct role
          await supabase
            .from('profiles')
            .update({ role: 'dispatcher' })
            .eq('id', session.user.id);
          console.log("MIDDLEWARE: Updated profile role to dispatcher");
        } catch (roleUpdateError) {
          console.log('Role update failed, continuing anyway');
          // Continue anyway - not critical
        }
      }
      
      // The important part - check if they are a dispatcher
      if (profile && profile.role === 'dispatcher') {
        console.log("MIDDLEWARE: User is a dispatcher, allowing access");
        return res;
      } else {
        console.log("MIDDLEWARE: Not a dispatcher, redirecting to login");
        // Only dispatchers allowed in this app
        await supabase.auth.signOut();
        const redirectUrl = new URL('/login?error=Access%20denied.%20This%20app%20is%20for%20dispatchers%20only.', req.url);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (err) {
      console.log('MIDDLEWARE ERROR:', err);
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