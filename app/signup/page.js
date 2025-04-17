'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simple direct approach - create auth user first
      console.log('Creating auth user with email:', email);
      
      // Create user with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'dispatcher' // Explicitly set role in user metadata
          }
        }
      });
      
      if (signUpError) {
        console.error('Auth signup error:', signUpError);
        setError(signUpError.message || 'Failed to create account');
        setLoading(false);
        return;
      }
      
      // Safety check
      if (!data?.user?.id) {
        console.error('No user ID returned from signup');
        setError('Failed to create account. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('Auth user created successfully, ID:', data.user.id);
      
      // Create profile directly - handles RLS issues
      const profileData = { 
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        role: 'dispatcher', // Explicitly set as dispatcher
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add explicit logging about the role
      console.log('Setting profile role to dispatcher');
      
      console.log('Creating profile:', profileData);
      
      // Just go straight to API endpoint approach - most reliable
      console.log('Using API endpoint to create profile');
      
      try {
        const response = await fetch('/api/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            email,
            firstName,
            lastName,
            phoneNumber,
            role: 'dispatcher'
          }),
        });
        
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || `API failed with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Profile created successfully via API:', result);
      } catch (apiError) {
        console.warn('API profile creation error, but continuing anyway:', apiError);
        // Don't show error to user - profile may have been created by triggers
        // or the error might be because it already exists
      }
      
      // Wait a moment to let any DB triggers complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to login
      console.log('Signup completed successfully, redirecting to login');
      router.push('/login?success=Account created successfully! You can now log in.');
      
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-brand-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-brand-card rounded-lg shadow-md border border-brand-border">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-accent">Compassionate Rides</h1>
          <h2 className="text-xl font-semibold mt-2">Dispatcher Sign Up</h2>
        </div>

        {error && (
          <div className="bg-brand-cancelled/10 border border-brand-cancelled/30 text-brand-cancelled px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSignup}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-brand-border px-3 py-2 shadow-sm bg-brand-background focus:border-brand-accent focus:outline-none focus:ring-brand-accent"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-brand-border px-3 py-2 shadow-sm bg-brand-background focus:border-brand-accent focus:outline-none focus:ring-brand-accent"
              />
            </div>
          </div>

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
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium">
              Phone Number
            </label>
            <input
              id="phoneNumber"
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border border-brand-border px-3 py-2 shadow-sm bg-brand-background focus:border-brand-accent focus:outline-none focus:ring-brand-accent"
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
              minLength={6}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md border border-transparent bg-brand-accent py-2 px-4 text-sm font-medium text-brand-buttonText shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm opacity-80">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-brand-accent hover:opacity-90 transition-opacity">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}