import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('🧪 Test actions API called');
  
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test API is working correctly',
      requestBody: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test API error:', error);
    return NextResponse.json({
      error: 'Test API failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test API GET endpoint is working',
    timestamp: new Date().toISOString()
  });
}