// app/api/face/verify/route.js
// Verify face descriptor against database of students

import { NextResponse } from 'next/server';
import faceRecognition from '@/lib/face-recognition-browser';

export async function POST(request) {
  try {
    const body = await request.json();
    const { inputDescriptor, students } = body;

    // Validate request
    if (!inputDescriptor) {
      return NextResponse.json({
        success: false,
        message: 'inputDescriptor is required'
      }, { status: 400 });
    }

    if (!students || !Array.isArray(students)) {
      return NextResponse.json({
        success: false,
        message: 'students array is required'
      }, { status: 400 });
    }

    if (students.length === 0) {
      return NextResponse.json({
        success: true,
        matched: false,
        message: 'No students in database to compare against'
      }, { status: 200 });
    }

    console.log(`🔍 Verifying face against ${students.length} students...`);
    const startTime = Date.now();

    // Use your existing face-recognition-browser.js
    const result = await faceRecognition.verifyFaceWithMatcher(
      inputDescriptor,
      students
    );

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Verification time: ${processingTime}ms`);

    if (!result.success) {
      console.log('❌ Verification failed:', result.message);
      return NextResponse.json({
        success: false,
        message: result.message || 'Verification failed'
      }, { status: 400 });
    }

    if (!result.matched) {
      console.log('❌ No match found (best distance:', result.bestDistance, ')');
      return NextResponse.json({
        success: true,
        matched: false,
        message: result.message || 'No matching student found',
        bestDistance: result.bestDistance,
        processingTime: processingTime
      }, { status: 200 });
    }

    console.log(`✅ Match found: ${result.student.matricNumber} (confidence: ${result.confidence}%)`);

    return NextResponse.json({
      success: true,
      matched: true,
      student: result.student,
      confidence: result.confidence,
      distance: result.distance,
      processingTime: processingTime
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Verify API error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Handle other methods
export async function GET(request) {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed. Use POST.'
  }, { status: 405 });
}

// Increase body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};