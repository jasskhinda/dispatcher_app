'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  // Check URL parameters for error or success messages
  useEffect(() => {
    // Check for error parameter
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
    
    // Check for success parameter
    const successParam = searchParams.get('success');
    if (successParam) {
      setSuccessMessage(decodeURIComponent(successParam));
    }
  }, [searchParams]);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      console.log('Attempting login with:', { email });
      
      // Sign in with Supabase directly
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Login successful, session:', data.session ? 'exists' : 'none');
      
      // Let the middleware handle the redirect
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <img 
              src="/LOGO2.png" 
              alt="Compassionate Care Transportation Logo" 
              width={120} 
              height={120}
              className="rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dispatcher Portal</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to access your dispatcher dashboard</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg relative" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm bg-white focus:border-[#5fbfc0] focus:outline-none focus:ring-2 focus:ring-[#5fbfc0] focus:ring-opacity-20 transition-colors"
              placeholder="dispatcher@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm bg-white focus:border-[#5fbfc0] focus:outline-none focus:ring-2 focus:ring-[#5fbfc0] focus:ring-opacity-20 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-[#5fbfc0] py-3 px-4 text-base font-semibold text-white shadow-sm hover:bg-[#4aa5a6] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#5fbfc0] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in to Dashboard'}
            </button>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact your administrator
              </p>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}