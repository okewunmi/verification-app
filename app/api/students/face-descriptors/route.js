// app/api/students/face-descriptors/route.js
// Get all students with face descriptors from database

import { NextResponse } from 'next/server';
import { getStudentsWithFaceDescriptors } from '@/lib/appwrite';

export async function GET(request) {
  try {
    console.log('📥 Fetching students with face descriptors...');
    const startTime = Date.now();

    // Use your existing Appwrite/database function
    const result = await getStudentsWithFaceDescriptors();

    const fetchTime = Date.now() - startTime;
    console.log(`⏱️ Fetch time: ${fetchTime}ms`);

    if (!result.success) {
      console.log('❌ Failed to fetch students:', result.message);
      return NextResponse.json({
        success: false,
        message: result.message || 'Failed to fetch students'
      }, { status: 400 });
    }

    console.log(`✅ Found ${result.data.length} students with face descriptors`);

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length,
      fetchTime: fetchTime
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Students API error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Handle other methods
export async function POST(request) {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed. Use GET.'
  }, { status: 405 });
}