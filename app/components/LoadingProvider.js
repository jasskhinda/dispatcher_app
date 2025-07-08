'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from './LoadingScreen';
import NavigationLoader from './NavigationLoader';

const LoadingContext = createContext();

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

export default function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const pathname = usePathname();
  
  // Global timeout protection - force hide loading after maximum time
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('🚨 Global loading timeout reached, forcing hide');
        setIsLoading(false);
      }
    }, 15000); // 15 seconds maximum loading time

    return () => clearTimeout(globalTimeout);
  }, [isLoading]);

  // Handle page visibility changes to prevent stuck preloader
  useEffect(() => {
    let visibilityTimeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLoading) {
        // If user comes back to tab and loader is still showing, give it 3 more seconds
        visibilityTimeout = setTimeout(() => {
          console.warn('🚨 Visibility timeout - hiding loader');
          setIsLoading(false);
        }, 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [isLoading]);
  
  // Initial page load with maximum timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Show loader for 2 seconds on initial load

    // Failsafe: Force hide loading after 5 seconds maximum
    const failsafeTimer = setTimeout(() => {
      console.warn('⚠️ Loading took too long, forcing hide');
      setIsLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(failsafeTimer);
    };
  }, []);

  // Route change loading
  useEffect(() => {
    let timeoutId;
    
    const handleStart = () => {
      setLoadingMessage('Navigating...');
      setIsLoading(true);
      
      // Auto-hide after 1 second for route changes
      timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    };

    const handleComplete = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsLoading(false);
    };

    // Listen for popstate events (back/forward navigation)
    const handlePopState = () => {
      handleStart();
    };

    // Override Next.js router push/replace to show loading
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    if (originalPush) {
      window.history.pushState = function(...args) {
        handleStart();
        return originalPush.apply(this, args);
      };
    }

    if (originalReplace) {
      window.history.replaceState = function(...args) {
        handleStart();
        return originalReplace.apply(this, args);
      };
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Restore original methods
      if (originalPush) {
        window.history.pushState = originalPush;
      }
      if (originalReplace) {
        window.history.replaceState = originalReplace;
      }
    };
  }, [pathname]);

  const showLoading = (message = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      <LoadingScreen isLoading={isLoading} message={loadingMessage} />
      <NavigationLoader />
      {children}
    </LoadingContext.Provider>
  );
}