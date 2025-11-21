// /**
//  * Next.js 13+ App Router - Face Verification API
//  * File: app/api/verify-face/route.js
//  */

// import { Client, Databases, Query } from 'appwrite';
// import { NextResponse } from 'next/server';

// // Initialize Appwrite
// const client = new Client()
//   .setEndpoint("https://nyc.cloud.appwrite.io/v1")
//   .setProject("68e83bca0016577d1322");

// const databases = new Databases(client);

// // Constants
// const DATABASE_ID = "68e84359003dccd0b700";
// const STUDENT_COLLECTION_ID = "student";
// const FACESET_OUTER_ID = 'student_faces';

// const FACEPP_API_KEY = process.env.FACEPP_API_KEY;
// const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET;

// // ========================================
// // POST METHOD - Face Verification
// // ========================================

// export async function POST(request) {
//   console.log('🔔 API Route called: POST');

//   try {
//     // Check environment variables
//     if (!FACEPP_API_KEY || !FACEPP_API_SECRET) {
//       console.error('❌ Missing Face++ credentials');
//       return NextResponse.json(
//         {
//           success: false,
//           matched: false,
//           error: 'Face++ API credentials not configured',
//         },
//         { status: 500 }
//       );
//     }

//     // Parse request body
//     const body = await request.json();
//     const { capturedImageBase64, method = 'auto' } = body;

//     if (!capturedImageBase64) {
//       console.error('❌ Missing capturedImageBase64');
//       return NextResponse.json(
//         {
//           success: false,
//           matched: false,
//           error: 'capturedImageBase64 is required',
//         },
//         { status: 400 }
//       );
//     }

//     console.log('📸 Image received, length:', capturedImageBase64.length);
//     console.log('🔍 Method:', method);

//     // Extract base64 data
//     const base64Data = capturedImageBase64.includes(',') 
//       ? capturedImageBase64.split(',')[1] 
//       : capturedImageBase64;

//     let result;

//     // Try Face++ Search first
//     if (method === 'search' || method === 'auto') {
//       console.log('⚡ Trying Face++ Search API...');
//       result = await verifyWithSearch(base64Data);

//       // If search fails, try compare
//       if (method === 'auto' && (!result.success || !result.matched)) {
//         console.log('🔄 Search failed, trying Compare API...');
//         result = await verifyWithCompare(base64Data);
//       }
//     } 
//     // Use Compare directly
//     else if (method === 'compare') {
//       console.log('🔄 Using Face++ Compare API...');
//       result = await verifyWithCompare(base64Data);
//     }

//     console.log('✅ Verification complete:', result.matched ? 'MATCH' : 'NO MATCH');
    
//     return NextResponse.json({
//       ...result,
//       matchTime: result.matched ? new Date().toLocaleTimeString() : undefined
//     });

//   } catch (error) {
//     console.error('❌ Handler error:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         matched: false,
//         error: error.message || 'Verification failed',
//       },
//       { status: 500 }
//     );
//   }
// }

// // ========================================
// // FACE++ SEARCH (FAST)
// // ========================================

// async function verifyWithSearch(base64Data) {
//   try {
//     // ✅ FIXED: Use URLSearchParams
//     const params = new URLSearchParams({
//       api_key: FACEPP_API_KEY,
//       api_secret: FACEPP_API_SECRET,
//       outer_id: FACESET_OUTER_ID,
//       image_base64: base64Data,
//       return_result_count: '5'
//     });

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/search', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//       body: params.toString()
//     });

//     const result = await response.json();
//     console.log('📊 Face++ Search response:', result.error_message || 'Success');

//     if (result.error_message) {
//       if (result.error_message === 'INVALID_OUTER_ID') {
//         console.log('⚠️ Faceset not initialized');
//         return { success: false, needsSync: true };
//       }
//       return { success: false, error: result.error_message };
//     }

//     if (!result.faces || result.faces.length === 0) {
//       return { 
//         success: false, 
//         matched: false,
//         message: 'No face detected. Please ensure good lighting and face the camera directly.' 
//       };
//     }

//     if (!result.results || result.results.length === 0) {
//       return { 
//         success: true, 
//         matched: false, 
//         message: 'No matching student found in database' 
//       };
//     }

//     const bestMatch = result.results[0];
//     const confidence = bestMatch.confidence;
//     const threshold = result.thresholds ? result.thresholds['1e-3'] : 70;

//     if (confidence < threshold) {
//       return { 
//         success: true, 
//         matched: false, 
//         message: `Low confidence match (${confidence.toFixed(1)}%)`,
//         confidence: confidence.toFixed(1)
//       };
//     }

//     // Get student from database
//     const studentResponse = await databases.listDocuments(
//       DATABASE_ID,
//       STUDENT_COLLECTION_ID,
//       [
//         Query.equal('matricNumber', bestMatch.user_id),
//         Query.equal('isActive', true),
//         Query.limit(1)
//       ]
//     );

//     if (studentResponse.documents.length === 0) {
//       return { 
//         success: false, 
//         matched: false,
//         message: 'Student record not found in database' 
//       };
//     }

//     return {
//       success: true,
//       matched: true,
//       student: studentResponse.documents[0],
//       confidence: confidence.toFixed(1),
//       method: 'search'
//     };

//   } catch (error) {
//     console.error('❌ Search error:', error);
//     return { success: false, error: error.message };
//   }
// }

// // ========================================
// // FACE++ COMPARE (FALLBACK)
// // ========================================

// async function verifyWithCompare(base64Data) {
//   try {
//     console.log('📋 Fetching students...');
    
//     const studentsResponse = await databases.listDocuments(
//       DATABASE_ID,
//       STUDENT_COLLECTION_ID,
//       [
//         Query.equal('isActive', true),
//         Query.limit(1000)
//       ]
//     );

//     const studentsWithPhotos = studentsResponse.documents.filter(
//       student => student.profilePictureUrl && student.profilePictureUrl.trim() !== ''
//     );

//     console.log(`📋 Found ${studentsWithPhotos.length} students with photos`);

//     if (studentsWithPhotos.length === 0) {
//       return { 
//         success: false, 
//         matched: false,
//         message: 'No registered students found' 
//       };
//     }

//     const capturedBuffer = Buffer.from(base64Data, 'base64');

//     let bestMatch = null;
//     let highestConfidence = 0;

//     for (let i = 0; i < studentsWithPhotos.length; i++) {
//       const student = studentsWithPhotos[i];

//       try {
//         console.log(`[${i + 1}/${studentsWithPhotos.length}] Checking ${student.firstName}...`);

//         const storedImageResponse = await fetch(student.profilePictureUrl);
        
//         if (!storedImageResponse.ok) {
//           console.log(`  ⚠️ Failed to fetch image`);
//           continue;
//         }

//         const storedImageBuffer = Buffer.from(await storedImageResponse.arrayBuffer());

//         const FormData = require('form-data');
//         const formData = new FormData();
//         formData.append('api_key', FACEPP_API_KEY);
//         formData.append('api_secret', FACEPP_API_SECRET);
//         formData.append('image_file1', storedImageBuffer, {
//           filename: 'stored.jpg',
//           contentType: 'image/jpeg'
//         });
//         formData.append('image_file2', capturedBuffer, {
//           filename: 'captured.jpg',
//           contentType: 'image/jpeg'
//         });

//         const compareResponse = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
//           method: 'POST',
//           body: formData,
//           headers: formData.getHeaders(),
//         });

//         const compareResult = await compareResponse.json();

//         if (compareResult.error_message) {
//           console.log(`  ⚠️ Face++ error: ${compareResult.error_message}`);
//           continue;
//         }

//         const confidence = compareResult.confidence || 0;
//         console.log(`  📊 Confidence: ${confidence.toFixed(1)}%`);

//         if (confidence > highestConfidence && confidence >= 70) {
//           highestConfidence = confidence;
//           bestMatch = student;
//         }

//         // Early exit for excellent match
//         if (confidence >= 90) {
//           console.log(`  ✅ Excellent match found!`);
//           break;
//         }

//       } catch (error) {
//         console.log(`  ❌ Error: ${error.message}`);
//         continue;
//       }

//       // Small delay to avoid rate limiting
//       await new Promise(resolve => setTimeout(resolve, 300));
//     }

//     if (!bestMatch) {
//       return { 
//         success: true, 
//         matched: false, 
//         message: 'No matching student found' 
//       };
//     }

//     return {
//       success: true,
//       matched: true,
//       student: bestMatch,
//       confidence: highestConfidence.toFixed(1),
//       method: 'compare'
//     };

//   } catch (error) {
//     console.error('❌ Compare error:', error);
//     return { 
//       success: false, 
//       matched: false,
//       error: error.message 
//     };
//   }
// }


/**
 * Next.js API Route - Face Verification with Face++ Search
 * File: app/api/verify-face-search/route.js
 */

import { Client, Databases, Query } from 'appwrite';
import { NextResponse } from 'next/server';

// Initialize Appwrite
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "68e83bca0016577d1322");

const databases = new Databases(client);

// Constants
const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID || "68e84359003dccd0b700";
const STUDENT_COLLECTION_ID = "student";
const FACESET_OUTER_ID = 'students'; // Match your lib/appwrite.js

const FACEPP_API_KEY = process.env.FACEPP_API_KEY || 'AWhKUAQKTH1ln5knEx9nj5qbxMwJKwia';
const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET || '-TlT-r-l_YhIABwOvWqu-yxrAtMy-Ynr';

export async function POST(request) {
  console.log('🔔 === API ROUTE CALLED ===');
  
  try {
    // Validate API credentials
    if (!FACEPP_API_KEY || !FACEPP_API_SECRET) {
      console.error('❌ Missing Face++ credentials');
      return NextResponse.json({
        success: false,
        matched: false,
        error: 'Face++ API credentials not configured'
      }, { status: 500 });
    }

    // Parse request body
    const body = await request.json();
    const { capturedImageBase64 } = body;

    if (!capturedImageBase64) {
      console.error('❌ Missing capturedImageBase64');
      return NextResponse.json({
        success: false,
        matched: false,
        error: 'capturedImageBase64 is required'
      }, { status: 400 });
    }

    console.log('📸 Image received, length:', capturedImageBase64.length);

    // Extract base64 data (remove data:image/jpeg;base64, prefix if present)
    const base64Data = capturedImageBase64.includes(',') 
      ? capturedImageBase64.split(',')[1] 
      : capturedImageBase64;

    console.log('🔍 Searching Face++ faceset...');

    // ✅ Use URLSearchParams for Face++ API (works in Node.js)
    const params = new URLSearchParams({
      api_key: FACEPP_API_KEY,
      api_secret: FACEPP_API_SECRET,
      outer_id: FACESET_OUTER_ID,
      image_base64: base64Data,
      return_result_count: '5'
    });

    const faceSearchResponse = await fetch('https://api-us.faceplusplus.com/facepp/v3/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const searchResult = await faceSearchResponse.json();
    console.log('📊 Face++ Response:', JSON.stringify(searchResult, null, 2));

    // Handle Face++ errors
    if (searchResult.error_message) {
      console.error('❌ Face++ Error:', searchResult.error_message);
      
      if (searchResult.error_message === 'INVALID_OUTER_ID') {
        return NextResponse.json({
          success: false,
          matched: false,
          needsSync: true,
          error: 'Faceset not initialized',
          message: 'Face database not initialized. Please run the sync process first.'
        });
      }

      return NextResponse.json({
        success: false,
        matched: false,
        error: searchResult.error_message,
        message: `Face++ error: ${searchResult.error_message}`
      });
    }

    // No face detected in captured image
    if (!searchResult.faces || searchResult.faces.length === 0) {
      console.log('⚠️ No face detected in image');
      return NextResponse.json({
        success: false,
        matched: false,
        message: 'No face detected. Please ensure good lighting and face the camera directly.'
      });
    }

    console.log(`👤 Detected ${searchResult.faces.length} face(s)`);

    // No matches found in database
    if (!searchResult.results || searchResult.results.length === 0) {
      console.log('⚠️ No matching faces in database');
      return NextResponse.json({
        success: true,
        matched: false,
        message: 'No matching student found in database'
      });
    }

    // Get best match
    const bestMatch = searchResult.results[0];
    const confidence = bestMatch.confidence;
    const threshold = searchResult.thresholds ? searchResult.thresholds['1e-3'] : 70;

    console.log(`🎯 Best match: ${bestMatch.user_id}, Confidence: ${confidence}, Threshold: ${threshold}`);

    // Check confidence threshold
    if (confidence < threshold) {
      console.log('⚠️ Confidence below threshold');
      return NextResponse.json({
        success: true,
        matched: false,
        message: `Low confidence match (${confidence.toFixed(1)}%)`,
        confidence: confidence.toFixed(1)
      });
    }

    // Fetch student from database
    console.log(`🔍 Fetching student: ${bestMatch.user_id}`);
    
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
      console.log('⚠️ Student record not found');
      return NextResponse.json({
        success: false,
        matched: false,
        message: 'Student record not found in database'
      });
    }

    const student = studentResponse.documents[0];
    console.log(`✅ MATCH FOUND: ${student.firstName} ${student.surname}`);

    // Collect all matches (for reference)
    const allMatches = searchResult.results.map(result => ({
      matricNumber: result.user_id,
      confidence: result.confidence.toFixed(1)
    }));

    return NextResponse.json({
      success: true,
      matched: true,
      student: student,
      confidence: confidence.toFixed(1),
      matchTime: new Date().toLocaleTimeString(),
      allMatches: allMatches,
      method: 'Face++ Search API'
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error('Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      matched: false,
      error: error.message || 'Verification failed',
      message: 'An error occurred during verification. Please try again.'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
