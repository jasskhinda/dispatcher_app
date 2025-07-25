import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'No user found' 
      }, { status: 401 });
    }

    // Update user role to dispatcher
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'dispatcher' })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update role',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated to dispatcher',
      profile: profile
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
}