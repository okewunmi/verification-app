// app/api/verify-face/route.js
import { NextResponse } from 'next/server';
import { databases, config } from '@/lib/appwrite';
import { Query } from 'appwrite';

const MATCH_THRESHOLD = 0.5; // Lower = stricter matching

/**
 * Calculate Euclidean distance between two descriptors
 */
function euclideanDistance(descriptor1, descriptor2) {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptor lengths must match');
  }
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Get all students with face descriptors from Appwrite
 */
async function getStudentsWithFaces() {
  try {
    console.log('📚 Loading students from database...');
    
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

    console.log(`✅ Found ${students.length} students with registered faces`);

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
 * Find best matching student
 */
function findBestMatch(queryDescriptor, students) {
  let bestMatch = null;
  let bestDistance = Infinity;

  console.log(`🔍 Comparing against ${students.length} stored faces...`);

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    try {
      // Parse stored descriptor
      const storedDescriptor = JSON.parse(student.faceDescriptor);
      
      // Calculate distance
      const distance = euclideanDistance(queryDescriptor, storedDescriptor);
      
      // Track best match
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = student;
      }

      // Log progress every 50 comparisons
      if ((i + 1) % 50 === 0) {
        console.log(`   Progress: ${i + 1}/${students.length} - Best: ${bestDistance.toFixed(3)}`);
      }
    } catch (err) {
      console.error(`⚠️ Error comparing with student ${student.matricNumber}:`, err.message);
      continue;
    }
  }

  console.log(`\n📊 Best match distance: ${bestDistance.toFixed(3)}`);
  console.log(`   Threshold: ${MATCH_THRESHOLD}`);

  return { bestMatch, bestDistance };
}

/**
 * POST endpoint for face verification
 * Accepts either:
 * 1. { descriptor: [...] } - 128-element array from client-side extraction
 * 2. { image: "data:image/jpeg;base64,..." } - fallback for server-side processing
 */
export async function POST(request) {
  try {
    console.log('\n🔍 Face verification request received');

    const body = await request.json();
    const { descriptor, image, confidence } = body;

    // Validate input
    if (!descriptor && !image) {
      return NextResponse.json({
        success: false,
        message: 'No descriptor or image provided'
      }, { status: 400 });
    }

    let queryDescriptor;

    if (descriptor) {
      // Client sent descriptor directly (preferred method)
      console.log('✅ Using client-provided descriptor');
      
      if (!Array.isArray(descriptor) || descriptor.length !== 128) {
        return NextResponse.json({
          success: false,
          message: 'Invalid descriptor format. Expected 128-element array.'
        }, { status: 400 });
      }
      
      queryDescriptor = descriptor;
      
      if (confidence) {
        console.log(`   Client detection confidence: ${confidence}%`);
      }
    } else {
      // Server-side processing not available without canvas
      return NextResponse.json({
        success: false,
        message: 'Server-side face extraction not available. Please extract descriptor on client.',
        hint: 'Use face-api.js on the client to extract the descriptor before sending.'
      }, { status: 400 });
    }

    // Get all students with face descriptors
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

    // Find best match
    console.log('🔄 Finding best match...');
    const { bestMatch, bestDistance } = findBestMatch(
      queryDescriptor,
      studentsResult.data
    );

    // Check if match exceeds threshold
    if (bestDistance <= MATCH_THRESHOLD && bestMatch) {
      console.log(`✅ MATCH FOUND: ${bestMatch.firstName} ${bestMatch.surname}`);
      console.log(`   Matric: ${bestMatch.matricNumber}`);
      console.log(`   Distance: ${bestDistance.toFixed(3)}\n`);

      return NextResponse.json({
        success: true,
        matched: true,
        student: {
          $id: bestMatch.$id,
          matricNumber: bestMatch.matricNumber,
          firstName: bestMatch.firstName,
          middleName: bestMatch.middleName,
          surname: bestMatch.surname,
          level: bestMatch.level,
          department: bestMatch.department,
          course: bestMatch.course,
          profilePictureUrl: bestMatch.profilePictureUrl
        },
        confidence: Math.round((1 - bestDistance) * 100),
        distance: bestDistance,
        message: 'Face matched successfully'
      });
    } else {
      console.log(`❌ NO MATCH: Best distance ${bestDistance.toFixed(3)} exceeds threshold\n`);
      
      return NextResponse.json({
        success: true,
        matched: false,
        message: `No matching face found. Best distance: ${bestDistance.toFixed(3)}`,
        bestDistance: bestDistance,
        threshold: MATCH_THRESHOLD
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

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Face verification API is running',
    mode: 'descriptor-comparison-only',
    threshold: MATCH_THRESHOLD,
    note: 'Send 128-element descriptor array for verification'
  });
}