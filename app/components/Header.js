'use client';

import Link from 'next/link';
// ThemeSwitcher removed as requested
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const [user, setUser] = useState(null);
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  useEffect(() => {
    // Check for current session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    getSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    try {
      console.log('🔄 Starting sign out process...');
      
      // Sign out from Supabase with scope 'local' to clear all local storage
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Successfully signed out from Supabase');
      }
      
      // Clear user state immediately
      setUser(null);
      
      // Clear any local storage or session storage related to auth
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        
        // Clear all items that start with 'sb-'
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      // Force a full page reload to clear all session data with logout param
      console.log('🔄 Redirecting to login with logout param...');
      window.location.href = '/login?logout=true';
      
    } catch (err) {
      console.error('❌ Sign out exception:', err);
      // Even if there's an error, redirect to login
      window.location.href = '/login?logout=true';
    }
  };

  const [activeRoute, setActiveRoute] = useState('/dashboard');
  
  useEffect(() => {
    // Set active route based on current path
    if (typeof window !== 'undefined') {
      const updateActiveRoute = () => {
        setActiveRoute(window.location.pathname);
      };
      
      // Initial update
      updateActiveRoute();
      
      // Listen for route changes
      window.addEventListener('popstate', updateActiveRoute);
      
      // Custom event for Next.js navigation
      const handleRouteChange = () => {
        setTimeout(updateActiveRoute, 0);
      };
      
      router.events?.on?.('routeChangeComplete', handleRouteChange);
      
      return () => {
        window.removeEventListener('popstate', updateActiveRoute);
        router.events?.off?.('routeChangeComplete', handleRouteChange);
      };
    }
  }, [router]);

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img 
              src="/LOGO2.png" 
              alt="Compassionate Care Transportation" 
              className="h-12 w-12 object-contain"
            />
            <span className="px-3 py-1 bg-[#7CCFD0] text-white rounded-full text-sm font-medium">
              Dispatcher
            </span>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="flex-1 flex items-center justify-center space-x-6 mx-8">
          <Link 
            href="/dashboard" 
            className={`text-sm font-bold text-black hover:text-[#7CCFD0] transition-colors pb-1 ${
              activeRoute === '/dashboard' ? 'text-[#7CCFD0] border-b-2 border-[#7CCFD0]' : ''
            }`}
          >
            DASHBOARD
          </Link>
          <Link 
            href="/trips/new" 
            className={`text-sm font-bold text-black hover:text-[#7CCFD0] transition-colors pb-1 ${
              activeRoute.includes('/trips/new') ? 'text-[#7CCFD0] border-b-2 border-[#7CCFD0]' : ''
            }`}
          >
            NEW TRIP
          </Link>
          <Link 
            href="/calendar" 
            className={`text-sm font-bold text-black hover:text-[#7CCFD0] transition-colors pb-1 ${
              activeRoute.includes('/calendar') ? 'text-[#7CCFD0] border-b-2 border-[#7CCFD0]' : ''
            }`}
          >
            CALENDAR
          </Link>
          <Link 
            href="/drivers" 
            className={`text-sm font-bold text-black hover:text-[#7CCFD0] transition-colors pb-1 ${
              activeRoute.includes('/drivers') ? 'text-[#7CCFD0] border-b-2 border-[#7CCFD0]' : ''
            }`}
          >
            DRIVERS
          </Link>
          <Link 
            href="/clients" 
            className={`text-sm font-bold text-black hover:text-[#7CCFD0] transition-colors pb-1 ${
              activeRoute.includes('/clients') ? 'text-[#7CCFD0] border-b-2 border-[#7CCFD0]' : ''
            }`}
          >
            CLIENTS
          </Link>
          <Link 
            href="/map" 
            className={`text-sm font-bold text-black hover:text-[#7CCFD0] transition-colors pb-1 ${
              activeRoute.includes('/map') ? 'text-[#7CCFD0] border-b-2 border-[#7CCFD0]' : ''
            }`}
          >
            MAP
          </Link>
        </div>
        
        {/* User Info and Sign Out */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-black font-medium hidden md:inline-block">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1 rounded text-sm bg-[#7CCFD0] text-white hover:opacity-90 transition-opacity font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}