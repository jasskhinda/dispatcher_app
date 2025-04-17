export default function Loading() {
  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-40 bg-brand-border/30 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-brand-border/30 rounded animate-pulse"></div>
        </div>
        
        <div className="bg-brand-card shadow rounded-lg p-6 border border-brand-border">
          <div className="h-6 w-36 bg-brand-border/30 rounded animate-pulse mb-6"></div>
          
          <div className="space-y-6">
            <div className="bg-brand-border/5 p-4 rounded-md">
              <div className="h-6 w-32 bg-brand-border/30 rounded animate-pulse mb-4"></div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="h-5 w-20 bg-brand-border/30 rounded animate-pulse mb-1"></div>
                  <div className="h-10 w-full bg-brand-border/30 rounded animate-pulse"></div>
                </div>
                
                <div>
                  <div className="h-5 w-20 bg-brand-border/30 rounded animate-pulse mb-1"></div>
                  <div className="h-10 w-full bg-brand-border/30 rounded animate-pulse"></div>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-5 w-20 bg-brand-border/30 rounded animate-pulse mb-1"></div>
                <div className="h-10 w-full bg-brand-border/30 rounded animate-pulse"></div>
              </div>

              <div className="mt-4">
                <div className="h-5 w-20 bg-brand-border/30 rounded animate-pulse mb-1"></div>
                <div className="h-10 w-full bg-brand-border/30 rounded animate-pulse"></div>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="h-10 w-24 bg-brand-border/30 rounded animate-pulse mr-3"></div>
              <div className="h-10 w-32 bg-brand-border/30 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}