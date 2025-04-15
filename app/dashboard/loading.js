import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard header skeleton */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="h-8 w-64 bg-brand-border/40 rounded animate-pulse"></div>
            <div className="flex space-x-2">
              <div className="h-10 w-28 bg-brand-border/30 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className="bg-brand-card border border-brand-border rounded-lg p-4 shadow-sm"
              >
                <div className="h-5 w-24 bg-brand-border/40 rounded animate-pulse mb-2"></div>
                <div className="h-8 w-16 bg-brand-border/30 rounded animate-pulse mb-3"></div>
                <div className="h-4 w-32 bg-brand-border/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
          
          {/* Filter tabs skeleton */}
          <div className="border-b border-brand-border mb-4">
            <div className="flex overflow-x-auto py-2 space-x-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 w-24 bg-brand-border/30 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Trips table skeleton */}
        <div className="bg-brand-card border border-brand-border rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-brand-border">
            <div className="h-6 w-40 bg-brand-border/40 rounded animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-border">
              <thead className="bg-brand-card/50">
                <tr>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <th key={i} className="px-6 py-3 text-left">
                      <div className="h-4 w-24 bg-brand-border/30 rounded animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-brand-card divide-y divide-brand-border">
                {Array.from({length: 5}).map((_, index) => (
                  <tr key={index}>
                    {Array.from({length: 6}).map((_, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-20 bg-brand-border/20 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}