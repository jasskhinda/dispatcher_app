import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
          <div className="h-7 w-48 bg-brand-border/40 rounded animate-pulse mb-6"></div>
          
          <div className="bg-brand-border/10 p-4 rounded-md mb-6">
            <div className="h-5 w-36 bg-brand-border/40 rounded animate-pulse mb-4"></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-5 w-24 bg-brand-border/30 rounded animate-pulse mb-2"></div>
                <div className="h-10 bg-brand-border/20 rounded animate-pulse"></div>
              </div>
              <div>
                <div className="h-5 w-24 bg-brand-border/30 rounded animate-pulse mb-2"></div>
                <div className="h-10 bg-brand-border/20 rounded animate-pulse"></div>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-5 w-24 bg-brand-border/30 rounded animate-pulse mb-2"></div>
              <div className="h-10 bg-brand-border/20 rounded animate-pulse"></div>
            </div>

            <div className="mt-4">
              <div className="h-5 w-36 bg-brand-border/30 rounded animate-pulse mb-2"></div>
              <div className="h-10 bg-brand-border/20 rounded animate-pulse"></div>
            </div>
          </div>
          
          <div className="bg-brand-border/10 p-4 rounded-md mb-6">
            <div className="h-5 w-36 bg-brand-border/40 rounded animate-pulse mb-4"></div>
            
            <div>
              <div className="h-5 w-48 bg-brand-border/30 rounded animate-pulse mb-2"></div>
              <div className="h-10 bg-brand-border/20 rounded animate-pulse"></div>
            </div>
            
            <div className="mt-4">
              <div className="h-5 w-36 bg-brand-border/30 rounded animate-pulse mb-2"></div>
              <div className="h-24 bg-brand-border/20 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="h-10 w-40 bg-brand-accent/30 rounded animate-pulse"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
