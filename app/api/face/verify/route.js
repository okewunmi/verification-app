// app/api/face/verify/route.js
// FIXED VERSION - Works in Node.js environment

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
    const { inputDescriptor, students } = await request.json();

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

    // Import face-api.js for Node.js environment
    const faceapi = await import('face-api.js');
    const canvas = await import('canvas');
    const { Canvas, Image, ImageData } = canvas;

    // Patch face-api.js to work with node-canvas
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    // Create labeled descriptors
    const labeledDescriptors = students.map(student => 
      new faceapi.LabeledFaceDescriptors(
        student.matricNumber,
        [new Float32Array(student.descriptor)]
      )
    );

    // Match face with threshold 0.6
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    const bestMatch = faceMatcher.findBestMatch(new Float32Array(inputDescriptor));

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Verification time: ${processingTime}ms`);

    if (bestMatch.label === 'unknown') {
      console.log('❌ No match found (best distance:', bestMatch.distance, ')');
      return NextResponse.json({
        success: true,
        matched: false,
        message: 'No matching student found',
        bestDistance: bestMatch.distance,
        processingTime: processingTime
      }, { status: 200 });
    }

    const matchedStudent = students.find(s => s.matricNumber === bestMatch.label);
    const confidence = Math.round((1 - bestMatch.distance) * 100);

    console.log(`✅ Match found: ${matchedStudent.matricNumber} (confidence: ${confidence}%)`);

    return NextResponse.json({
      success: true,
      matched: true,
      student: matchedStudent,
      confidence: confidence,
      distance: bestMatch.distance,
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

export async function GET(request) {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed. Use POST.'
  }, { status: 405 });
}