export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-background">
      {/* Header */}
      <header className="bg-brand-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-8 w-40 bg-brand-border/30 rounded animate-pulse"></div>
        </div>
      </header>

      {/* Main content - simple loading state */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div>
        </div>
      </main>
    </div>
  );
}