// Simple test page to verify routing works
export default function DriversTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Drivers Test Page</h1>
      <p>If you can see this page, routing to /drivers-test works!</p>
      <p className="mt-4">
        <a href="/drivers" className="text-blue-600 underline">
          Try going to /drivers
        </a>
      </p>
      <p className="mt-2">
        <a href="/dashboard" className="text-blue-600 underline">
          Go to dashboard
        </a>
      </p>
    </div>
  );
}