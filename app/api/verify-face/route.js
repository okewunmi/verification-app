// app/api/verify-face/route.js
// API endpoint for React Native app to verify faces

import { NextResponse } from 'next/server';
import * as faceapi from 'face-api.js';
import { Canvas, Image as CanvasImage } from 'canvas';
import { databases, config } from '@/lib/appwrite';
import { Query } from 'appwrite';

// Polyfill for face-api.js to work in Node.js
// This is needed because face-api.js expects browser APIs
const { Canvas: NodeCanvas, Image: NodeImage, ImageData: NodeImageData } = require('canvas');
faceapi.env.monkeyPatch({ Canvas: NodeCanvas, Image: NodeImage, ImageData: NodeImageData });

// Track if models are loaded
let modelsLoaded = false;
const MATCH_THRESHOLD = 0.5;

/**
 * Load face-api.js models from public/models folder
 */
async function loadModels() {
  if (modelsLoaded) return;

  try {
    console.log('📦 Loading face-api.js models from public/models...');
    
    // Models are in public/models folder
    const modelPath = './public/models';

    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
    ]);

    modelsLoaded = true;
    console.log('✅ Face models loaded successfully');
  } catch (error) {
    console.error('❌ Error loading models:', error);
    throw new Error('Failed to load face recognition models');
  }
}

/**
 * Extract face descriptor from base64 image
 */
async function extractDescriptor(base64Image) {
  try {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Create canvas image from buffer
    const img = new CanvasImage();
    img.src = buffer;

    // Detect face with landmarks and descriptor
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        success: false,
        error: 'NO_FACE_DETECTED',
        message: 'No face detected in image. Please ensure good lighting and face the camera directly.'
      };
    }

    const confidence = Math.round(detection.detection.score * 100);
    console.log(`✅ Face detected with ${confidence}% confidence`);

    return {
      success: true,
      descriptor: Array.from(detection.descriptor),
      confidence: confidence
    };
  } catch (error) {
    console.error('❌ Error extracting descriptor:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to extract face descriptor'
    };
  }
}

/**
 * Get all students with face descriptors from Appwrite
 */
async function getStudentsWithFaces() {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('isActive', true),
        Query.equal('faceCaptured', true),
        Query.isNotNull('faceDescriptor'),
        Query.limit(1000)
      ]
    );

    const students = response.documents.filter(
      s => s.faceDescriptor && s.faceDescriptor.trim() !== ''
    );

    return {
      success: true,
      data: students
    };
  } catch (error) {
    console.error('❌ Database error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Verify face using FaceMatcher
 */
async function verifyFaceWithMatcher(queryDescriptor, storedDescriptors) {
  try {
    console.log(`🔍 Comparing against ${storedDescriptors.length} stored faces...`);

    // Create labeled descriptors for FaceMatcher
    const labeledDescriptors = storedDescriptors.map(stored => {
      const label = `${stored.matricNumber}|${stored.firstName}|${stored.surname}|${stored.$id}`;
      const descriptor = new Float32Array(stored.descriptor);
      return new faceapi.LabeledFaceDescriptors(label, [descriptor]);
    });

    // Create FaceMatcher with threshold
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, MATCH_THRESHOLD);

    // Convert query descriptor to Float32Array
    const queryFloat32 = new Float32Array(queryDescriptor);

    // Find best match
    const bestMatch = faceMatcher.findBestMatch(queryFloat32);

    console.log(`📊 Best match: ${bestMatch.label}`);
    console.log(`   Distance: ${bestMatch.distance.toFixed(3)}`);
    console.log(`   Threshold: ${MATCH_THRESHOLD}`);

    // Check if it's a genuine match
    if (bestMatch.label !== 'unknown' && bestMatch.distance <= MATCH_THRESHOLD) {
      // Parse the label to get student info
      const [matricNumber, firstName, surname, studentId] = bestMatch.label.split('|');
      
      // Find the full student object
      const studentData = storedDescriptors.find(s => s.$id === studentId);

      console.log(`✅ MATCH FOUND: ${firstName} ${surname}`);

      return {
        success: true,
        matched: true,
        student: studentData || { 
          matricNumber, 
          firstName, 
          surname, 
          studentId,
          $id: studentId 
        },
        confidence: Math.round((1 - bestMatch.distance) * 100),
        distance: bestMatch.distance,
        message: 'Face matched successfully'
      };
    } else {
      console.log(`❌ NO MATCH: Distance ${bestMatch.distance.toFixed(3)} exceeds threshold`);
      
      return {
        success: true,
        matched: false,
        bestDistance: bestMatch.distance,
        message: `No matching face found. Distance: ${bestMatch.distance.toFixed(3)}`
      };
    }
  } catch (error) {
    console.error('❌ Error during verification:', error);
    return {
      success: false,
      matched: false,
      error: error.message,
      message: 'Verification failed'
    };
  }
}

/**
 * POST endpoint for face verification from React Native app
 */
export async function POST(request) {
  try {
    console.log('\n🔍 Face verification request received');

    // Load models if not already loaded
    await loadModels();

    // Parse request body (expecting JSON with base64 image)
    const body = await request.json();
    const { image: base64Image } = body;

    if (!base64Image) {
      return NextResponse.json({
        success: false,
        message: 'No image provided'
      }, { status: 400 });
    }

    console.log('📸 Image received, extracting face descriptor...');

    // Step 1: Extract face descriptor from captured image
    const extractResult = await extractDescriptor(base64Image);
    
    if (!extractResult.success) {
      return NextResponse.json({
        success: false,
        message: extractResult.message,
        error: extractResult.error
      }, { status: 400 });
    }

    console.log(`✅ Face extracted (confidence: ${extractResult.confidence}%)`);

    // Step 2: Get all students with face descriptors from database
    console.log('📚 Loading students from database...');
    const studentsResult = await getStudentsWithFaces();

    if (!studentsResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to load student database'
      }, { status: 500 });
    }

    if (studentsResult.data.length === 0) {
      return NextResponse.json({
        success: true,
        matched: false,
        message: 'No registered faces in database'
      });
    }

    console.log(`📋 Found ${studentsResult.data.length} students with registered faces`);

    // Step 3: Prepare stored descriptors
    const storedDescriptors = studentsResult.data.map(student => ({
      ...student,
      descriptor: JSON.parse(student.faceDescriptor)
    }));

    // Step 4: Verify face
    console.log('🔄 Matching face...');
    const verifyResult = await verifyFaceWithMatcher(
      extractResult.descriptor,
      storedDescriptors
    );

    // Step 5: Return result
    if (verifyResult.matched) {
      console.log('✅ Verification successful!\n');
      return NextResponse.json({
        success: true,
        matched: true,
        student: {
          $id: verifyResult.student.$id,
          matricNumber: verifyResult.student.matricNumber,
          firstName: verifyResult.student.firstName,
          middleName: verifyResult.student.middleName,
          surname: verifyResult.student.surname,
          level: verifyResult.student.level,
          department: verifyResult.student.department,
          course: verifyResult.student.course,
          profilePictureUrl: verifyResult.student.profilePictureUrl
        },
        confidence: verifyResult.confidence,
        distance: verifyResult.distance,
        message: 'Face matched successfully'
      });
    } else {
      console.log('❌ No match found\n');
      return NextResponse.json({
        success: true,
        matched: false,
        message: verifyResult.message,
        bestDistance: verifyResult.bestDistance
      });
    }

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error during verification',
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Face verification API is running',
    modelsLoaded: modelsLoaded
  });
}