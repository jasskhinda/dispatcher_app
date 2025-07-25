'use client';

import { useState } from 'react';

export default function DebugInfo({ trips, facility }) {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setShowDebug(true)}
          className="px-3 py-1 bg-yellow-500 text-white text-xs rounded"
        >
          Show Debug Info
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-yellow-800">Debug Information</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="px-3 py-1 bg-yellow-500 text-white text-xs rounded"
        >
          Hide Debug
        </button>
      </div>
      
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-medium text-yellow-800 mb-2">Complete Trip Data (first trip - ALL fields):</h4>
          <div className="bg-white p-3 rounded border max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(trips[0] || {}, null, 2)}
            </pre>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-yellow-800 mb-2">Available Field Names:</h4>
          <div className="bg-white p-3 rounded border">
            <div className="text-xs grid grid-cols-3 gap-2">
              {trips[0] ? Object.keys(trips[0]).sort().map(key => (
                <div key={key} className="font-mono">
                  {key}: {typeof trips[0][key]}
                </div>
              )) : 'No trips available'}
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-yellow-800 mb-2">Total Trips: {trips.length}</h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div><strong>With facility_id:</strong> {trips.filter(t => t.facility_id).length}</div>
            <div><strong>With profiles:</strong> {trips.filter(t => t.profiles).length}</div>
            <div><strong>With user_id:</strong> {trips.filter(t => t.user_id).length}</div>
            
            {/* Check for common client field variations */}
            {['client_name', 'client_email', 'passenger_name', 'passenger_email', 
              'name', 'email', 'customer_name', 'customer_email', 'patient_name', 
              'patient_email', 'booking_name', 'booking_email'].map(field => (
              <div key={field}>
                <strong>{field}:</strong> {trips.filter(t => t[field]).length}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}