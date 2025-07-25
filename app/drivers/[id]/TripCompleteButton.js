'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TripCompleteButton({ tripId }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleComplete = async () => {
        if (loading) return;
        
        setLoading(true);
        
        try {
            const response = await fetch('/api/dispatcher/complete-trip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tripId: tripId
                }),
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to complete trip');
            }

            // Refresh the page to show updated data
            router.refresh();
            
        } catch (error) {
            console.error('Error completing trip:', error);
            alert('Error completing trip: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleComplete}
            disabled={loading}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
        >
            {loading ? 'Completing...' : 'Mark Complete'}
        </button>
    );
}