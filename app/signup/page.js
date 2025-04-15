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
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // If signup successful, add user profile to users table
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            { 
              id: data.user.id, 
              email,
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              role: 'dispatcher', // Default role for this app
              created_at: new Date()
            }
          ]);

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          setError('Account created but had trouble setting up your profile');
          return;
        }

        // Redirect to login page with success message
        router.push('/login?success=Account created! Please check your email to confirm your account.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
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