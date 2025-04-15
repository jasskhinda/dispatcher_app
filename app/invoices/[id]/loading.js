import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
          {/* Invoice header skeleton */}
          <div className="px-6 py-5 border-b border-brand-border flex justify-between items-center">
            <div>
              <div className="h-6 w-36 bg-brand-border/40 rounded animate-pulse"></div>
              <div className="h-4 w-28 mt-1 bg-brand-border/30 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-5 w-24 bg-brand-border/40 rounded-full animate-pulse"></div>
              <div className="h-5 w-24 bg-brand-border/40 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Invoice content skeleton */}
          <div className="p-6">
            {/* Trip details section */}
            <div className="mb-8">
              <div className="h-5 w-32 bg-brand-border/40 rounded animate-pulse mb-4"></div>
              <div className="bg-brand-border/10 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className={`h-4 ${i % 2 === 0 ? 'w-20' : 'w-36'} bg-brand-border/30 rounded animate-pulse`}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoice details section */}
            <div className="mb-8">
              <div className="h-5 w-40 bg-brand-border/40 rounded animate-pulse mb-4"></div>
              <div className="bg-brand-border/10 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className={`h-4 ${i % 2 === 0 ? 'w-24' : 'w-32'} bg-brand-border/30 rounded animate-pulse`}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions section skeleton */}
            <div className="mt-8 border-t border-brand-border pt-6 flex justify-between">
              <div>
                <div className="h-5 w-48 bg-brand-border/40 rounded animate-pulse mb-4"></div>
                <div className="flex space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-9 w-16 bg-brand-border/30 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <div className="h-9 w-24 bg-brand-accent/30 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
