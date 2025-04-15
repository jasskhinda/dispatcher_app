import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Trip Optimization</h1>
        </div>
      </header>

      {/* Main content - skeleton loading UI */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Key Section Skeleton */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="h-7 w-64 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
              
              <div className="h-10 bg-gray-200 rounded animate-pulse mb-4"></div>
              
              <div className="space-y-2 mb-4">
                <div className="h-5 w-36 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-36 bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Column Skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="h-6 w-52 bg-gray-200 rounded animate-pulse mb-4"></div>
              
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}