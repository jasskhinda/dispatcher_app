import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'No user found',
        userError: userError?.message 
      }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: profile,
      profileError: profileError?.message,
      hasDispatcherRole: profile?.role === 'dispatcher',
      currentRole: profile?.role || 'no role set'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
}