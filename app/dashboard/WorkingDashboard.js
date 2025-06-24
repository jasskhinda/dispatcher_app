'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function WorkingDashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [trips, setTrips] = useState([]);
    const [error, setError] = useState(null);
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        getSession();
    }, []);

    async function getSession() {
        try {
            setLoading(true);
            
            // Get session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error('Session error:', sessionError);
                setError('Session error: ' + sessionError.message);
                setLoading(false);
                return;
            }

            if (!session) {
                console.log('No session found, redirecting to login');
                router.push('/login');
                return;
            }

            console.log('✅ User authenticated:', session.user.email);
            setUser(session.user);

            // Fetch trips
            const { data: tripsData, error: tripsError } = await supabase
                .from('trips')
                .select('*')
                .order('pickup_time', { ascending: true })
                .limit(10);

            if (tripsError) {
                console.error('Trips error:', tripsError);
                setTrips([]);
            } else {
                setTrips(tripsData || []);
            }

            setLoading(false);

        } catch (err) {
            console.error('Dashboard error:', err);
            setError('Dashboard error: ' + err.message);
            setLoading(false);
        }
    }

    async function handleSignOut() {
        try {
            await supabase.auth.signOut();
            router.push('/login');
        } catch (err) {
            console.error('Sign out error:', err);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <h1 className="text-xl font-bold text-red-600 mb-4">Dashboard Error</h1>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <div className="flex space-x-4">
                        <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            Go to Login
                        </a>
                        <button onClick={getSession} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Dispatcher Dashboard
                        </h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">
                                Welcome, {user?.email}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Message */}
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                    <p className="font-semibold">🎉 Authentication Working!</p>
                    <p className="text-sm">
                        Your dispatcher app is now properly authenticated and connected to the ecosystem.
                    </p>
                </div>

                {/* User Info */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">User Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="font-medium">{user?.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">User ID</p>
                            <p className="font-medium">{user?.id}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Created</p>
                            <p className="font-medium">{new Date(user?.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Last Sign In</p>
                            <p className="font-medium">{new Date(user?.last_sign_in_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Trips Summary */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">Recent Trips</h2>
                    {trips.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Trip ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Pickup Time
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            From
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            To
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {trips.slice(0, 5).map((trip) => (
                                        <tr key={trip.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {trip.id.slice(0, 8)}...
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    trip.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {trip.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(trip.pickup_time).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {trip.pickup_location || trip.pickup_address || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {trip.dropoff_location || trip.destination_address || 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500">No trips found in the system.</p>
                    )}
                </div>

                {/* Next Steps */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">🚀 What's Next?</h3>
                    <ul className="text-blue-800 space-y-2">
                        <li>• Authentication is now working correctly</li>
                        <li>• Dashboard loads user information and trips</li>
                        <li>• Ready to restore full dashboard functionality</li>
                        <li>• Integration with facility app billing is preserved</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
