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
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-brand-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-brand-card rounded-lg shadow-md border border-brand-border">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-accent">Compassionate Care Transportation</h1>
          <h2 className="text-xl font-semibold mt-2">Dispatcher Login</h2>
        </div>

        {error && (
          <div className="bg-brand-cancelled/10 border border-brand-cancelled/30 text-brand-cancelled px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-brand-completed/10 border border-brand-completed/30 text-brand-completed px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-brand-border px-3 py-2 shadow-sm bg-brand-background focus:border-brand-accent focus:outline-none focus:ring-brand-accent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-brand-border px-3 py-2 shadow-sm bg-brand-background focus:border-brand-accent focus:outline-none focus:ring-brand-accent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md border border-transparent bg-brand-accent py-2 px-4 text-sm font-medium text-brand-buttonText shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}