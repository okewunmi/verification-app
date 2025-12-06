// pages/api/verify-face-local.js
import * as faceapi from '@vladmandic/face-api';
import { Canvas, Image } from 'canvas';
import path from 'path';

// Polyfill for face-api.js in Node.js
faceapi.env.monkeyPatch({ Canvas, Image });

let modelsLoaded = false;

// Load models once on server startup
async function loadModels() {
  if (modelsLoaded) return;
  
  const modelPath = path.join(process.cwd(), 'public', 'models');
  
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
    faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
    faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
  ]);
  
  modelsLoaded = true;
  console.log('✅ Face-api.js models loaded');
}

// Extract face descriptor from base64 image
async function getFaceDescriptor(base64Image) {
  const base64Data = base64Image.includes(',') 
    ? base64Image.split(',')[1] 
    : base64Image;
  
  const buffer = Buffer.from(base64Data, 'base64');
  const img = await faceapi.bufferToImage(buffer);
  
  // Detect face with landmarks and descriptor
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  if (!detection) {
    throw new Error('No face detected in image');
  }
  
  return {
    descriptor: Array.from(detection.descriptor),
    detection: {
      box: detection.detection.box,
      score: detection.detection.score
    }
  };
}

// Calculate Euclidean distance between two descriptors
function getDistance(desc1, desc2) {
  return faceapi.euclideanDistance(desc1, desc2);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Starting local face verification...');
    
    // Load models if not already loaded
    await loadModels();

    const { capturedImageBase64, database } = req.body;

    if (!capturedImageBase64) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image provided' 
      });
    }

    // Extract descriptor from captured image
    console.log('📸 Extracting face descriptor from captured image...');
    const capturedFace = await getFaceDescriptor(capturedImageBase64);
    
    console.log(`✅ Face detected (confidence: ${(capturedFace.detection.score * 100).toFixed(1)}%)`);

    // Get all students with face descriptors from your database
    const { getStudentsWithFaceDescriptors } = await import('@/lib/appwrite');
    const studentsResult = await getStudentsWithFaceDescriptors();

    if (!studentsResult.success || studentsResult.data.length === 0) {
      return res.status(200).json({
        success: true,
        matched: false,
        message: 'No registered faces in database'
      });
    }

    console.log(`📊 Comparing against ${studentsResult.data.length} registered faces...`);

    // Find best match
    let bestMatch = null;
    let lowestDistance = Infinity;
    const MATCH_THRESHOLD = 0.6; // Lower is better (typical range: 0.4-0.6)

    for (const student of studentsResult.data) {
      try {
        const storedDescriptor = JSON.parse(student.faceDescriptor);
        const distance = getDistance(capturedFace.descriptor, storedDescriptor);
        
        console.log(`  ${student.matricNumber}: distance = ${distance.toFixed(3)}`);

        if (distance < lowestDistance && distance < MATCH_THRESHOLD) {
          lowestDistance = distance;
          bestMatch = student;
        }
      } catch (err) {
        console.error(`Error processing ${student.matricNumber}:`, err.message);
      }
    }

    // Return result
    if (bestMatch) {
      const confidence = Math.max(0, (1 - lowestDistance) * 100);
      
      console.log('\n✅ === MATCH FOUND ===');
      console.log('Student:', bestMatch.firstName, bestMatch.surname);
      console.log('Distance:', lowestDistance.toFixed(3));
      console.log('Confidence:', confidence.toFixed(1) + '%');
      console.log('=====================\n');

      return res.status(200).json({
        success: true,
        matched: true,
        student: bestMatch,
        confidence: confidence.toFixed(1),
        distance: lowestDistance.toFixed(3),
        matchTime: new Date().toLocaleTimeString(),
        method: 'FaceAPI_Local'
      });
    }

    console.log('\n❌ No match found. Best distance:', lowestDistance.toFixed(3), '\n');

    return res.status(200).json({
      success: true,
      matched: false,
      message: `No match found (best distance: ${lowestDistance.toFixed(3)})`,
      bestDistance: lowestDistance.toFixed(3)
    });

  } catch (error) {
    console.error('❌ Face verification error:', error);
    return res.status(500).json({
      success: false,
      matched: false,
      error: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};