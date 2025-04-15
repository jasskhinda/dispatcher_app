'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login immediately
    router.push('/login');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Compassionate Rides</h1>
        <h2 className="text-2xl font-semibold mb-8">Dispatcher Portal</h2>
        
        <div className="flex flex-col items-center justify-center space-y-6">
          <p className="text-lg">Welcome to the Compassionate Rides dispatcher portal.</p>
          <p>Redirecting to login...</p>
          
          <div className="flex space-x-4 mt-8">
            <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Login
            </Link>
            <Link href="/signup" className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
