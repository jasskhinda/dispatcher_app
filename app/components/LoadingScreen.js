'use client';

import { useEffect, useState } from 'react';

export default function LoadingScreen({ isLoading, message = "Loading..." }) {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      {/* Logo with pulse animation */}
      <div className="mb-8 animate-pulse">
        <img 
          src="/LOGO2.png" 
          alt="Compassionate Care Transportation" 
          className="h-24 w-24 object-contain"
        />
      </div>
      
      {/* Company name */}
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Compassionate Care Transportation
      </h1>
      
      {/* Dispatcher badge */}
      <div className="mb-6">
        <span className="px-4 py-2 bg-[#7CCFD0] text-white rounded-full text-sm font-medium">
          Dispatcher
        </span>
      </div>
      
      {/* Loading text with animated dots */}
      <div className="text-gray-600 text-lg">
        {message}{dots}
      </div>
      
      {/* Loading spinner */}
      <div className="mt-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7CCFD0]"></div>
      </div>
    </div>
  );
}