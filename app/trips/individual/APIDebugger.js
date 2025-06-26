// Debug component for testing API calls
// Add this temporarily to the individual trips page to test API functionality

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function APIDebugger() {
    const [testResults, setTestResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClientComponentClient();

    const addResult = (test, status, message, data = null) => {
        setTestResults(prev => [...prev, {
            test,
            status,
            message,
            data,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const testAuthentication = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session) {
                addResult('Auth', '✅', `Authenticated as: ${session.user.email}`);
                
                // Test profile fetch
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role, first_name, last_name')
                    .eq('id', session.user.id)
                    .single();
                    
                if (profileError) {
                    addResult('Profile', '❌', `Profile error: ${profileError.message}`);
                } else {
                    addResult('Profile', '✅', `Role: ${profile.role}, Name: ${profile.first_name} ${profile.last_name}`);
                }
            } else {
                addResult('Auth', '❌', 'No session found');
            }
        } catch (error) {
            addResult('Auth', '❌', `Auth error: ${error.message}`);
        }
    };

    const testTripsAPI = async () => {
        try {
            // Test fetching trips
            const { data: trips, error } = await supabase
                .from('trips')
                .select('id, status, user_id, facility_id')
                .is('facility_id', null)
                .not('user_id', 'is', null)
                .limit(5);
                
            if (error) {
                addResult('Trips Query', '❌', `Query error: ${error.message}`);
            } else {
                addResult('Trips Query', '✅', `Found ${trips.length} individual trips`, trips);
            }
        } catch (error) {
            addResult('Trips Query', '❌', `Trips error: ${error.message}`);
        }
    };

    const testActionAPI = async (testTripId, action) => {
        try {
            const response = await fetch('/api/trips/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tripId: testTripId,
                    action: action,
                    reason: action === 'reject' ? 'Test rejection' : undefined
                }),
            });

            const result = await response.json();
            
            if (response.ok) {
                addResult(`API ${action}`, '✅', `Success: ${result.message}`, result);
            } else {
                addResult(`API ${action}`, '❌', `Error: ${result.error}`, result);
            }
        } catch (error) {
            addResult(`API ${action}`, '❌', `Network error: ${error.message}`);
        }
    };

    const runAllTests = async () => {
        setLoading(true);
        setTestResults([]);
        
        await testAuthentication();
        await testTripsAPI();
        
        // Note: Don't test actual actions without a real trip ID
        addResult('API Test', '⚠️', 'API action tests skipped - need real trip ID');
        
        setLoading(false);
    };

    const clearResults = () => {
        setTestResults([]);
    };

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">🐛 API Debug Panel</h3>
            
            <div className="flex space-x-4 mb-4">
                <button
                    onClick={runAllTests}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Testing...' : 'Run Tests'}
                </button>
                
                <button
                    onClick={clearResults}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                    Clear Results
                </button>
            </div>

            {testResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {testResults.map((result, index) => (
                        <div key={index} className="bg-white p-3 rounded border text-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">
                                    {result.status} {result.test}
                                </span>
                                <span className="text-gray-500 text-xs">{result.timestamp}</span>
                            </div>
                            <div className="text-gray-700 mt-1">{result.message}</div>
                            {result.data && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-blue-600 text-xs">Show Data</summary>
                                    <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                                        {JSON.stringify(result.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
                <p className="text-blue-800 font-medium">Instructions:</p>
                <ol className="text-blue-700 mt-1 list-decimal list-inside">
                    <li>Click "Run Tests" to diagnose authentication and data access</li>
                    <li>Check the results for any authentication or permission issues</li>
                    <li>If tests pass, the issue might be with specific trip actions</li>
                    <li>Remove this debug panel once issues are resolved</li>
                </ol>
            </div>
        </div>
    );
}

// USAGE: Add this component temporarily to IndividualTripsPage
// Import: import APIDebugger from './path/to/APIDebugger';
// JSX: <APIDebugger /> (place it right after the header section)
