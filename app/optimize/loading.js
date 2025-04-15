'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-background">
      {/* Header */}
      <header className="bg-brand-card shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trip Optimization</h1>
          <div className="px-4 py-2 bg-brand-accent text-brand-buttonText rounded hover:opacity-90">
            Back to Dashboard
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1">
            <div className="bg-brand-card shadow rounded-lg p-6 mb-6 border border-brand-border">
              <div className="h-7 w-48 bg-brand-border/30 rounded animate-pulse mb-4"></div>
              
              <div className="mb-4">
                <div className="h-5 w-40 bg-brand-border/30 rounded animate-pulse mb-2"></div>
                <div className="h-10 w-full bg-brand-border/30 rounded animate-pulse"></div>
              </div>
              
              <div className="mb-4">
                <div className="h-5 w-36 bg-brand-border/30 rounded animate-pulse mb-2"></div>
                <div className="h-5 w-36 bg-brand-border/30 rounded animate-pulse"></div>
              </div>
              
              <div className="h-10 w-full bg-brand-border/30 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="lg:col-span-2">
            <div className="bg-brand-card shadow rounded-lg p-6 mb-6 border border-brand-border">
              <div className="h-7 w-40 bg-brand-border/30 rounded animate-pulse mb-4"></div>
              
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-brand-border/30 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}