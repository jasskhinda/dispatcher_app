import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  console.log("MIDDLEWARE: Path =", req.nextUrl.pathname);
  
  let supabaseResponse = NextResponse.next({
    request: req,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("MIDDLEWARE: User exists =", !!user);

  // Check auth condition
  const isAuthRoute = req.nextUrl.pathname === '/login';
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');
  const isPublicRoute = req.nextUrl.pathname === '/' || 
                        req.nextUrl.pathname.startsWith('/_next') || 
                        req.nextUrl.pathname.match(/\.(ico|png|jpg|svg|css|js)$/);
  
  // If accessing a protected API route without being authenticated
  if (!user && isApiRoute && !isPublicRoute) {
    // Allow GET requests to debug endpoint
    if (req.method === 'GET' && req.nextUrl.pathname === '/api/facility/check-payment/verify') {
      console.log("MIDDLEWARE: Allowing debug endpoint access");
      return supabaseResponse;
    }
    
    console.log("MIDDLEWARE: API route accessed without user - returning 401");
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // If accessing a protected page route without being authenticated
  if (!user && !isAuthRoute && !isPublicRoute && !isApiRoute) {
    console.log("MIDDLEWARE: Redirecting to login - no user on protected route");
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing auth routes while authenticated
  if (user && isAuthRoute) {
    console.log("MIDDLEWARE: Redirecting to dashboard - authenticated on auth route");
    const redirectUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow all authenticated users to access the dispatcher app
  if (user && !isAuthRoute && !isPublicRoute) {
    console.log("MIDDLEWARE: User is authenticated, allowing access");
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.png|.*\\.svg).*)',
  ],
};