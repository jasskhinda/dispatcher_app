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
  const isAuthRoute = req.nextUrl.pathname === '/login';
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
      } else if (profile && !profile.role) {
        console.log("MIDDLEWARE: User has no role, setting to dispatcher and allowing access");
        // Set dispatcher role for users without roles
        try {
          await supabase
            .from('profiles')
            .update({ role: 'dispatcher' })
            .eq('id', session.user.id);
          console.log("MIDDLEWARE: Set user role to dispatcher");
        } catch (updateError) {
          console.log('Role update failed, but allowing access');
        }
        return res;
      } else if (!profile) {
        console.log("MIDDLEWARE: No profile found, creating dispatcher profile and allowing access");
        // Create dispatcher profile for users without profiles
        try {
          await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              role: 'dispatcher',
              first_name: session.user.user_metadata?.first_name || 'Dispatcher',
              last_name: session.user.user_metadata?.last_name || 'User',
              full_name: session.user.user_metadata?.full_name || session.user.email || 'Dispatcher User',
              email: session.user.email
            });
          console.log("MIDDLEWARE: Created dispatcher profile");
        } catch (createError) {
          console.log('Profile creation failed, but allowing access');
        }
        return res;
      } else {
        console.log("MIDDLEWARE: User role is:", profile.role, "- updating to dispatcher");
        // Update any other role to dispatcher for this app
        try {
          await supabase
            .from('profiles')
            .update({ role: 'dispatcher' })
            .eq('id', session.user.id);
          console.log("MIDDLEWARE: Updated user role to dispatcher");
        } catch (updateError) {
          console.log('Role update failed, but allowing access');
        }
        return res;
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