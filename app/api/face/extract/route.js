// app/api/face/extract/route.js
// FIXED VERSION - Handles document/window issues

import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export async function POST(request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({
        success: false,
        message: 'Image is required in request body'
      }, { status: 400 });
    }

    if (!image.startsWith('data:image/')) {
      return NextResponse.json({
        success: false,
        message: 'Invalid image format. Must be base64 data URI'
      }, { status: 400 });
    }

    console.log('📸 Extracting face descriptor from mobile image...');
    const startTime = Date.now();

    // Import face-api.js and canvas for Node.js environment
    const faceapi = await import('face-api.js');
    const canvas = await import('canvas');
    const { Canvas, Image, ImageData } = canvas;

    // Patch face-api.js to work with node-canvas
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    // Load models if not already loaded
    const modelPath = './public/models'; // Adjust if your models are elsewhere
    
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
      console.log('✅ Models loaded');
    } catch (modelError) {
      console.error('❌ Model loading error:', modelError);
      // Models might already be loaded, continue
    }

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Load image using node-canvas
    const img = await canvas.loadImage(buffer);

    // Detect face and extract descriptor
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Processing time: ${processingTime}ms`);

    if (!detection) {
      console.log('❌ No face detected');
      return NextResponse.json({
        success: false,
        message: 'No face detected in image'
      }, { status: 400 });
    }

    const descriptor = Array.from(detection.descriptor);
    const confidence = Math.round(detection.detection.score * 100);

    console.log(`✅ Face extracted successfully (confidence: ${confidence}%)`);

    return NextResponse.json({
      success: true,
      descriptor: descriptor,
      confidence: confidence,
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

export async function GET(request) {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed. Use POST.'
  }, { status: 405 });
}