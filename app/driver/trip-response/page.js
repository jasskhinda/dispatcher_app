'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TripResponsePage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processResponse = async () => {
      const token = searchParams.get('token');
      const action = searchParams.get('action');

      if (!token || !action) {
        setError('Invalid or missing parameters');
        setLoading(false);
        return;
      }

      if (!['accept', 'reject'].includes(action)) {
        setError('Invalid action. Must be accept or reject.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/trips/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, action }),
        });

        const data = await response.json();

        if (response.ok) {
          setResult({
            success: true,
            action,
            message: data.message,
            tripDetails: data.tripDetails
          });
        } else {
          setError(data.error || 'Failed to process trip response');
        }
      } catch (err) {
        console.error('Error processing trip response:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    processResponse();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5fbfc0] mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing your response...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a 
            href="mailto:dispatch@compassionatecaretransportation.com"
            className="inline-block w-full py-2 px-4 bg-[#5fbfc0] text-white rounded-md hover:bg-[#4aa5a6] transition-colors"
          >
            Contact Dispatch
          </a>
        </div>
      </div>
    );
  }

  if (result?.success) {
    const isAccepted = result.action === 'accept';
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isAccepted ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {isAccepted ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Trip {isAccepted ? 'Accepted' : 'Declined'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {result.message}
          </p>

          {result.tripDetails && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Trip Details</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Pickup:</strong> {result.tripDetails.pickup_location}</p>
                <p><strong>Drop-off:</strong> {result.tripDetails.dropoff_location}</p>
                <p><strong>Time:</strong> {new Date(result.tripDetails.pickup_time).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {isAccepted ? (
              <>
                <p className="text-sm text-gray-600">
                  You can now see this trip in your driver dashboard. Please arrive at the pickup location on time.
                </p>
                <a 
                  href="/driver/dashboard"
                  className="block w-full py-2 px-4 bg-[#5fbfc0] text-white rounded-md hover:bg-[#4aa5a6] transition-colors"
                >
                  Go to Driver Dashboard
                </a>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  The trip has been declined and will be reassigned to another driver.
                </p>
                <a 
                  href="mailto:dispatch@compassionatecaretransportation.com"
                  className="block w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Contact Dispatch
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}