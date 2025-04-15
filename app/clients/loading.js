import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen">
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-brand-card shadow rounded-lg overflow-hidden border border-brand-border">
          <div className="px-6 py-5 border-b border-brand-border flex justify-between">
            <h3 className="text-lg font-medium">All Clients</h3>
            <div className="w-16 h-4 bg-brand-border/50 rounded-full animate-pulse"></div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-brand-border">
              <thead className="bg-brand-card border-b border-brand-border">
                <tr>
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="px-3 py-3 text-left">
                      <div className="h-4 bg-brand-border/40 rounded animate-pulse w-2/3"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-3 py-4">
                        <div className="h-4 bg-brand-border/30 rounded animate-pulse w-3/4 mb-2"></div>
                        {j < 3 && <div className="h-3 bg-brand-border/20 rounded animate-pulse w-1/2"></div>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
