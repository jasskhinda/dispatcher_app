import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('🔍 Debug endpoint called');
  
  try {
    // Test 1: Basic response
    const basicTest = {
      timestamp: new Date().toISOString(),
      message: 'Debug endpoint working'
    };
    
    // Test 2: Supabase client creation
    let supabaseTest = 'failed';
    try {
      const supabase = createRouteHandlerClient({ cookies });
      supabaseTest = 'success';
    } catch (supabaseError) {
      supabaseTest = `error: ${supabaseError.message}`;
    }
    
    // Test 3: Session check
    let sessionTest = 'failed';
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        sessionTest = `error: ${error.message}`;
      } else if (session) {
        sessionTest = `success: ${session.user.email}`;
      } else {
        sessionTest = 'no session';
      }
    } catch (sessionError) {
      sessionTest = `error: ${sessionError.message}`;
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        basicResponse: basicTest,
        supabaseClient: supabaseTest,
        session: sessionTest
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request) {
  console.log('🔍 Debug POST endpoint called');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'POST debug endpoint working',
      receivedBody: body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}