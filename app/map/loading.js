import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Map Container Skeleton */}
          <div className="lg:flex-1">
            <div className="bg-brand-card border border-brand-border rounded-lg shadow-md overflow-hidden">
              <div className="flex p-4 justify-between items-center border-b border-brand-border">
                <div className="h-6 w-32 bg-brand-border/40 rounded animate-pulse"></div>
                <div className="flex space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 w-16 bg-brand-border/30 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
              <div className="h-[500px] w-full bg-brand-border/10 flex justify-center items-center">
                <div className="w-16 h-16 border-t-4 border-b-4 border-brand-accent rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
          
          {/* Sidebar Skeleton */}
          <div className="lg:w-80">
            <div className="bg-brand-card border border-brand-border rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-brand-border">
                <div className="h-5 w-28 bg-brand-border/40 rounded animate-pulse"></div>
              </div>
              <div className="divide-y divide-brand-border">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4">
                    <div className="h-5 w-3/4 bg-brand-border/30 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-1/2 bg-brand-border/20 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-brand-card border border-brand-border rounded-lg shadow-md overflow-hidden mt-4">
              <div className="p-4 border-b border-brand-border">
                <div className="h-5 w-28 bg-brand-border/40 rounded animate-pulse"></div>
              </div>
              <div className="divide-y divide-brand-border">
                {[1, 2].map(i => (
                  <div key={i} className="p-4">
                    <div className="h-5 w-3/4 bg-brand-border/30 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-1/2 bg-brand-border/20 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-1/3 bg-brand-border/20 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
