// app/api/face/health/route.js
// Health check endpoint to verify API is working

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Face recognition API is healthy',
      timestamp: new Date().toISOString(),
      status: 'operational'
    }, { status: 200 });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

// Optionally handle other methods
export async function POST(request) {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed. Use GET.'
  }, { status: 405 });
}