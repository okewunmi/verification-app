// app/api/face/extract/route.js
// Extract face descriptor from base64 image

import { NextResponse } from 'next/server';
import faceRecognition from '@/lib/face-recognition-browser';

export async function POST(request) {
  try {
    const body = await request.json();
    const { image } = body;

    // Validate request
    if (!image) {
      return NextResponse.json({
        success: false,
        message: 'Image is required in request body'
      }, { status: 400 });
    }

    // Validate image format
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({
        success: false,
        message: 'Invalid image format. Must be base64 data URI'
      }, { status: 400 });
    }

    console.log('📸 Extracting face descriptor from mobile image...');
    const startTime = Date.now();

    // Use your existing face-recognition-browser.js
    const result = await faceRecognition.extractDescriptor(image);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Processing time: ${processingTime}ms`);

    if (!result.success) {
      console.log('❌ Face extraction failed:', result.message);
      return NextResponse.json({
        success: false,
        message: result.message || 'Failed to extract face descriptor'
      }, { status: 400 });
    }

    console.log(`✅ Face extracted successfully (confidence: ${result.confidence}%)`);

    return NextResponse.json({
      success: true,
      descriptor: result.descriptor,
      confidence: result.confidence,
      processingTime: processingTime
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Extract API error:', error);
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

// Increase body size limit for images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};