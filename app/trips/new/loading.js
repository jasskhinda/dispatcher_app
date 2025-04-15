import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Create New Trip</h1>
        </div>
      </header>

      {/* Main content - skeleton loading UI */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-6"></div>
          
          <div className="space-y-6">
            <div>
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div>
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            <div>
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div>
              <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div>
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="flex justify-end">
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse mr-3"></div>
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}