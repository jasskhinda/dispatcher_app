import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status filters skeleton */}
        <div className="bg-brand-card shadow rounded-lg p-4 mb-6 border border-brand-border">
          <div className="flex flex-wrap items-center">
            <div className="w-16 h-5 bg-brand-border rounded animate-pulse mr-4"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center mr-4 mb-2">
                <div className="h-4 w-4 bg-brand-border rounded animate-pulse"></div>
                <div className="ml-2 w-20 h-5 bg-brand-border rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Calendar skeleton */}
        <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
          <div className="mb-4 flex flex-col sm:flex-row sm:justify-between items-center">
            <div className="mb-4 sm:mb-0 flex items-center">
              {[1, 2, 3].map(i => (
                <div key={i} className="mr-2 w-20 h-8 bg-brand-border rounded animate-pulse"></div>
              ))}
              <div className="ml-2 w-32 h-8 bg-brand-border rounded animate-pulse"></div>
            </div>
            <div className="flex items-center">
              {[1, 2, 3].map(i => (
                <div key={i} className="mr-2 w-16 h-8 bg-brand-border rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Calendar grid skeleton */}
          <div className="mt-4 grid grid-cols-7 gap-1">
            {/* Calendar header */}
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="h-10 bg-brand-border/50 rounded animate-pulse"></div>
            ))}
            
            {/* Calendar cells - 5 weeks */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-brand-border/20 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}