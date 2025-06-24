'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function SimpleDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkUser();
    }, []);

    async function checkUser() {
        try {
            console.log('Checking user session...');
            console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
            console.log('Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            console.log('Session result:', { session: !!session, error: sessionError });
            
            if (sessionError) {
                console.error('Session error:', sessionError);
                setError(`Session error: ${sessionError.message}`);
                setLoading(false);
                return;
            }

            if (!session) {
                console.log('No session found');
                setError('No authentication session found. Please log in.');
                setLoading(false);
                return;
            }

            console.log('User session found:', session.user.email);
            setUser(session.user);
            setError(null);
            setLoading(false);

        } catch (err) {
            console.error('Dashboard error:', err);
            setError(`Dashboard error: ${err.message}`);
            setLoading(false);
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
                    <p className="text-gray-700 mb-4">Something went wrong while loading the dashboard.</p>
                    <details className="mb-4">
                        <summary className="cursor-pointer text-blue-600">Error Details</summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {error}
                        </pre>
                    </details>
                    <div className="flex space-x-4">
                        <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            Go to Login
                        </a>
                        <a href="/dashboard" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                            Try Again
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">
                    Dispatcher Dashboard (Simple Debug Version)
                </h1>
                
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">User Information</h2>
                    <div className="space-y-2">
                        <p><strong>Email:</strong> {user?.email}</p>
                        <p><strong>User ID:</strong> {user?.id}</p>
                        <p><strong>Created:</strong> {user?.created_at}</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">Environment Check</h2>
                    <div className="space-y-2 text-sm">
                        <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
                        <p><strong>Supabase Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
