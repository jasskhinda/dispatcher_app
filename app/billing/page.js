import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import BillingOverview from './BillingOverview';

export default async function BillingPage() {
  const supabase = createRouteHandlerClient();
  
  try {
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      redirect('/login');
    }
    
    if (!session) {
      redirect('/login');
    }
    
    // Check if user is dispatcher
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      console.error('Profile error:', profileError);
      redirect('/login');
    }
    
    if (profile.role !== 'dispatcher') {
      redirect('/dashboard');
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Billing Overview</h1>
                <p className="mt-2 text-gray-600">
                  Comprehensive billing management for individual clients and facilities
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Welcome, {profile.first_name} {profile.last_name}
                </span>
                <div className="flex space-x-2">
                  <a 
                    href="/invoices" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Manage Invoices
                  </a>
                  <a 
                    href="/dashboard" 
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    ← Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Overview Component */}
          <BillingOverview user={session.user} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Billing page error:', error);
    redirect('/login');
  }
}
