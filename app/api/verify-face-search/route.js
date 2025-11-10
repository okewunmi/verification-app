/**
 * Next.js 13+ App Router - Face Verification API
 * File: app/api/verify-face/route.js
 */

import { Client, Databases, Query } from 'appwrite';
import { NextResponse } from 'next/server';

// Initialize Appwrite
const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("68e83bca0016577d1322");

const databases = new Databases(client);

// Constants
const DATABASE_ID = "68e84359003dccd0b700";
const STUDENT_COLLECTION_ID = "student";
const FACESET_OUTER_ID = 'student_faces';

const FACEPP_API_KEY = process.env.FACEPP_API_KEY;
const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET;

// ========================================
// POST METHOD - Face Verification
// ========================================

export async function POST(request) {
  console.log('🔔 API Route called: POST');

  try {
    // Check environment variables
    if (!FACEPP_API_KEY || !FACEPP_API_SECRET) {
      console.error('❌ Missing Face++ credentials');
      return NextResponse.json(
        {
          success: false,
          matched: false,
          error: 'Face++ API credentials not configured',
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { capturedImageBase64, method = 'auto' } = body;

    if (!capturedImageBase64) {
      console.error('❌ Missing capturedImageBase64');
      return NextResponse.json(
        {
          success: false,
          matched: false,
          error: 'capturedImageBase64 is required',
        },
        { status: 400 }
      );
    }

    console.log('📸 Image received, length:', capturedImageBase64.length);
    console.log('🔍 Method:', method);

    // Extract base64 data
    const base64Data = capturedImageBase64.includes(',') 
      ? capturedImageBase64.split(',')[1] 
      : capturedImageBase64;

    let result;

    // Try Face++ Search first
    if (method === 'search' || method === 'auto') {
      console.log('⚡ Trying Face++ Search API...');
      result = await verifyWithSearch(base64Data);

      // If search fails, try compare
      if (method === 'auto' && (!result.success || !result.matched)) {
        console.log('🔄 Search failed, trying Compare API...');
        result = await verifyWithCompare(base64Data);
      }
    } 
    // Use Compare directly
    else if (method === 'compare') {
      console.log('🔄 Using Face++ Compare API...');
      result = await verifyWithCompare(base64Data);
    }

    console.log('✅ Verification complete:', result.matched ? 'MATCH' : 'NO MATCH');
    
    return NextResponse.json({
      ...result,
      matchTime: result.matched ? new Date().toLocaleTimeString() : undefined
    });

  } catch (error) {
    console.error('❌ Handler error:', error);
    return NextResponse.json(
      {
        success: false,
        matched: false,
        error: error.message || 'Verification failed',
      },
      { status: 500 }
    );
  }
}

// ========================================
// FACE++ SEARCH (FAST)
// ========================================

async function verifyWithSearch(base64Data) {
  try {
    // ✅ FIXED: Use URLSearchParams
    const params = new URLSearchParams({
      api_key: FACEPP_API_KEY,
      api_secret: FACEPP_API_SECRET,
      outer_id: FACESET_OUTER_ID,
      image_base64: base64Data,
      return_result_count: '5'
    });

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const result = await response.json();
    console.log('📊 Face++ Search response:', result.error_message || 'Success');

    if (result.error_message) {
      if (result.error_message === 'INVALID_OUTER_ID') {
        console.log('⚠️ Faceset not initialized');
        return { success: false, needsSync: true };
      }
      return { success: false, error: result.error_message };
    }

    if (!result.faces || result.faces.length === 0) {
      return { 
        success: false, 
        matched: false,
        message: 'No face detected. Please ensure good lighting and face the camera directly.' 
      };
    }

    if (!result.results || result.results.length === 0) {
      return { 
        success: true, 
        matched: false, 
        message: 'No matching student found in database' 
      };
    }

    const bestMatch = result.results[0];
    const confidence = bestMatch.confidence;
    const threshold = result.thresholds ? result.thresholds['1e-3'] : 70;

    if (confidence < threshold) {
      return { 
        success: true, 
        matched: false, 
        message: `Low confidence match (${confidence.toFixed(1)}%)`,
        confidence: confidence.toFixed(1)
      };
    }

    // Get student from database
    const studentResponse = await databases.listDocuments(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      [
        Query.equal('matricNumber', bestMatch.user_id),
        Query.equal('isActive', true),
        Query.limit(1)
      ]
    );

    if (studentResponse.documents.length === 0) {
      return { 
        success: false, 
        matched: false,
        message: 'Student record not found in database' 
      };
    }

    return {
      success: true,
      matched: true,
      student: studentResponse.documents[0],
      confidence: confidence.toFixed(1),
      method: 'search'
    };

  } catch (error) {
    console.error('❌ Search error:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// FACE++ COMPARE (FALLBACK)
// ========================================

async function verifyWithCompare(base64Data) {
  try {
    console.log('📋 Fetching students...');
    
    const studentsResponse = await databases.listDocuments(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      [
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    const studentsWithPhotos = studentsResponse.documents.filter(
      student => student.profilePictureUrl && student.profilePictureUrl.trim() !== ''
    );

    console.log(`📋 Found ${studentsWithPhotos.length} students with photos`);

    if (studentsWithPhotos.length === 0) {
      return { 
        success: false, 
        matched: false,
        message: 'No registered students found' 
      };
    }

    const capturedBuffer = Buffer.from(base64Data, 'base64');

    let bestMatch = null;
    let highestConfidence = 0;

    for (let i = 0; i < studentsWithPhotos.length; i++) {
      const student = studentsWithPhotos[i];

      try {
        console.log(`[${i + 1}/${studentsWithPhotos.length}] Checking ${student.firstName}...`);

        const storedImageResponse = await fetch(student.profilePictureUrl);
        
        if (!storedImageResponse.ok) {
          console.log(`  ⚠️ Failed to fetch image`);
          continue;
        }

        const storedImageBuffer = Buffer.from(await storedImageResponse.arrayBuffer());

        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('api_key', FACEPP_API_KEY);
        formData.append('api_secret', FACEPP_API_SECRET);
        formData.append('image_file1', storedImageBuffer, {
          filename: 'stored.jpg',
          contentType: 'image/jpeg'
        });
        formData.append('image_file2', capturedBuffer, {
          filename: 'captured.jpg',
          contentType: 'image/jpeg'
        });

        const compareResponse = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders(),
        });

        const compareResult = await compareResponse.json();

        if (compareResult.error_message) {
          console.log(`  ⚠️ Face++ error: ${compareResult.error_message}`);
          continue;
        }

        const confidence = compareResult.confidence || 0;
        console.log(`  📊 Confidence: ${confidence.toFixed(1)}%`);

        if (confidence > highestConfidence && confidence >= 70) {
          highestConfidence = confidence;
          bestMatch = student;
        }

        // Early exit for excellent match
        if (confidence >= 90) {
          console.log(`  ✅ Excellent match found!`);
          break;
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        continue;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!bestMatch) {
      return { 
        success: true, 
        matched: false, 
        message: 'No matching student found' 
      };
    }

    return {
      success: true,
      matched: true,
      student: bestMatch,
      confidence: highestConfidence.toFixed(1),
      method: 'compare'
    };

  } catch (error) {
    console.error('❌ Compare error:', error);
    return { 
      success: false, 
      matched: false,
      error: error.message 
    };
  }
}

// // app/api/verify-face-search/route.js
// import { NextResponse } from 'next/server';
// import { Client, Databases, Query } from 'node-appwrite';

// // Appwrite Configuration
// const config = {
//   endpoint: "https://nyc.cloud.appwrite.io/v1",
//   projectId: "68e83bca0016577d1322",
//   databaseId: "68e84359003dccd0b700",
//   studentsCollectionId: "student",
//   courseRegistrationCollectionId: "courseregistration",
// };

// // Initialize Appwrite Client for API route
// const client = new Client()
//   .setEndpoint(config.endpoint)
//   .setProject(config.projectId);

// const databases = new Databases(client);

// const HUGGINGFACE_SPACE_URL = "https://bairi56-face-verification.hf.space";

// export async function POST(request) {
//   try {
//     console.log('🔍 Starting face verification search...');

//     const body = await request.json();
//     const { capturedImageBase64 } = body;

//     if (!capturedImageBase64) {
//       return NextResponse.json(
//         { success: false, error: 'No image provided' },
//         { status: 400 }
//       );
//     }

//     // Get all students with face images
//     console.log('📋 Fetching students with face images...');
//     const studentsResponse = await databases.listDocuments(
//       config.databaseId,
//       config.studentsCollectionId,
//       [
//         Query.equal('isActive', true),
//         Query.limit(1000)
//       ]
//     );

//     // Filter students with profilePictureUrl
//     const studentsWithPhotos = studentsResponse.documents.filter(
//       student => student.profilePictureUrl && student.profilePictureUrl.trim() !== ''
//     );

//     console.log(`📊 Found ${studentsWithPhotos.length} students with photos`);

//     if (studentsWithPhotos.length === 0) {
//       return NextResponse.json({
//         success: true,
//         matched: false,
//         message: 'No students with profile pictures found in database'
//       });
//     }

//     // Convert base64 to Blob
//     const base64Data = capturedImageBase64.includes(',') 
//       ? capturedImageBase64.split(',')[1] 
//       : capturedImageBase64;
    
//     const capturedImageBuffer = Buffer.from(base64Data, 'base64');
//     const capturedBlob = new Blob([capturedImageBuffer], { type: 'image/jpeg' });

//     let bestMatch = null;
//     let highestConfidence = 0;
//     const allMatches = [];
//     const CONFIDENCE_THRESHOLD = 0.70; // 70% similarity threshold

//     // Compare captured image with each student's photo
//     for (let i = 0; i < studentsWithPhotos.length; i++) {
//       const student = studentsWithPhotos[i];
      
//       try {
//         console.log(`[${i + 1}/${studentsWithPhotos.length}] Comparing with ${student.firstName} ${student.surname}...`);

//         // Fetch stored image
//         const storedImageResponse = await fetch(student.profilePictureUrl);
        
//         if (!storedImageResponse.ok) {
//           console.warn(`  ⚠️ Failed to fetch image for ${student.matricNumber}`);
//           continue;
//         }

//         const storedImageBlob = await storedImageResponse.blob();

//         // Call Hugging Face Space API
//         const formData = new FormData();
//         formData.append('img1', storedImageBlob, 'reference.jpg');
//         formData.append('img2', capturedBlob, 'target.jpg');

//         const verifyResponse = await fetch(`${HUGGINGFACE_SPACE_URL}/api/predict`, {
//           method: 'POST',
//           body: formData,
//         });

//         if (!verifyResponse.ok) {
//           console.warn(`  ⚠️ API error for ${student.matricNumber}`);
//           continue;
//         }

//         const verifyResult = await verifyResponse.json();
//         console.log(`  📊 Result:`, verifyResult);

//         // Parse the response text to extract similarity score
//         if (verifyResult.data && typeof verifyResult.data === 'string') {
//           const responseText = verifyResult.data;
          
//           // Extract similarity score from text like "Similarity Score: 0.8523"
//           const scoreMatch = responseText.match(/Similarity Score:\s*([\d.]+)/);
//           const matchStatus = responseText.includes('Yes ✅');
          
//           if (scoreMatch) {
//             const similarityScore = parseFloat(scoreMatch[1]);
//             console.log(`  📈 Similarity: ${(similarityScore * 100).toFixed(1)}%`);

//             allMatches.push({
//               matricNumber: student.matricNumber,
//               name: `${student.firstName} ${student.surname}`,
//               confidence: (similarityScore * 100).toFixed(1)
//             });

//             if (matchStatus && similarityScore > highestConfidence && similarityScore >= CONFIDENCE_THRESHOLD) {
//               highestConfidence = similarityScore;
//               bestMatch = student;
//               console.log(`  ✅ NEW BEST MATCH!`);
//             }
//           }
//         }

//       } catch (error) {
//         console.error(`  ❌ Error comparing with ${student.matricNumber}:`, error.message);
//         continue;
//       }

//       // Small delay to avoid rate limiting
//       if (i < studentsWithPhotos.length - 1) {
//         await new Promise(resolve => setTimeout(resolve, 500));
//       }
//     }

//     // Return results
//     if (bestMatch && highestConfidence >= CONFIDENCE_THRESHOLD) {
//       console.log(`\n✅ MATCH FOUND: ${bestMatch.firstName} ${bestMatch.surname}`);
      
//       // Get registered courses
//       let registeredCourses = [];
//       try {
//         const coursesResponse = await databases.listDocuments(
//           config.databaseId,
//           config.courseRegistrationCollectionId,
//           [
//             Query.equal('matricNumber', bestMatch.matricNumber),
//             Query.equal('status', 'Approved'),
//             Query.equal('isActive', true)
//           ]
//         );
//         registeredCourses = coursesResponse.documents;
//       } catch (error) {
//         console.error('Error fetching courses:', error);
//       }

//       return NextResponse.json({
//         success: true,
//         matched: true,
//         student: {
//           $id: bestMatch.$id,
//           firstName: bestMatch.firstName,
//           middleName: bestMatch.middleName,
//           surname: bestMatch.surname,
//           matricNumber: bestMatch.matricNumber,
//           email: bestMatch.email,
//           department: bestMatch.department,
//           course: bestMatch.course,
//           level: bestMatch.level,
//           profilePictureUrl: bestMatch.profilePictureUrl,
//           phoneNumber: bestMatch.phoneNumber,
//           registeredCourses: registeredCourses.map(c => ({
//             courseCode: c.courseCode,
//             courseTitle: c.courseTitle,
//             courseUnit: c.courseUnit,
//             semester: c.semester
//           }))
//         },
//         confidence: (highestConfidence * 100).toFixed(1),
//         matchTime: new Date().toLocaleTimeString(),
//         allMatches: allMatches.slice(0, 5) // Top 5 matches
//       });
//     }

//     console.log('❌ No match found above threshold');
//     return NextResponse.json({
//       success: true,
//       matched: false,
//       message: 'No matching student found. Please ensure good lighting and face the camera directly.',
//       confidence: (highestConfidence * 100).toFixed(1),
//       allMatches: allMatches.slice(0, 5)
//     });

//   } catch (error) {
//     console.error('❌ Face verification error:', error);
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: error.message || 'Face verification failed',
//         matched: false
//       },
//       { status: 500 }
//     );
//   }
// }