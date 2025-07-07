'use client';

import { useEffect } from 'react';
import { useLoading } from './LoadingProvider';

export default function NavigationLoader() {
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    // Handle Next.js Link clicks
    const handleLinkClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.href && target.href !== window.location.href) {
        // Only show loading for internal navigation
        if (target.href.startsWith(window.location.origin)) {
          showLoading('Navigating...');
          
          // Auto-hide after 1.5 seconds as fallback
          setTimeout(() => {
            hideLoading();
          }, 1500);
        }
      }
    };

    // Handle form submissions
    const handleFormSubmit = (e) => {
      const form = e.target;
      if (form.tagName === 'FORM') {
        showLoading('Processing...');
        
        // Auto-hide after 2 seconds as fallback
        setTimeout(() => {
          hideLoading();
        }, 2000);
      }
    };

    // Handle button clicks that might trigger navigation
    const handleButtonClick = (e) => {
      const button = e.target.closest('button');
      if (button && (
        button.textContent.includes('Sign') ||
        button.textContent.includes('Login') ||
        button.textContent.includes('Submit') ||
        button.type === 'submit'
      )) {
        showLoading('Processing...');
        
        // Auto-hide after 2 seconds as fallback
        setTimeout(() => {
          hideLoading();
        }, 2000);
      }
    };

    document.addEventListener('click', handleLinkClick);
    document.addEventListener('submit', handleFormSubmit);
    document.addEventListener('click', handleButtonClick);

    return () => {
      document.removeEventListener('click', handleLinkClick);
      document.removeEventListener('submit', handleFormSubmit);
      document.removeEventListener('click', handleButtonClick);
    };
  }, [showLoading, hideLoading]);

  return null; // This component doesn't render anything
}