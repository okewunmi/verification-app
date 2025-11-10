// import { NextResponse } from 'next/server';
// import { Client, Databases, Query, ID } from 'appwrite';

// const client = new Client()
//   .setEndpoint("https://nyc.cloud.appwrite.io/v1")
//   .setProject("68e83bca0016577d1322");

// const databases = new Databases(client);

// const DATABASE_ID = "68e84359003dccd0b700";
// const STUDENT_COLLECTION_ID = "student";
// const FACESET_OUTER_ID = 'students';
// const FACEPP_API_KEY =process.env.FACEPP_API_KEY || 'AWhKUAQKTH1ln5knEx9nj5qbxMwJKwia';
// const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET || '-TlT-r-l_YhIABwOvWqu-yxrAtMy-Ynr';

// // Helper functions (server-side only)
// async function checkFacesetExists(outerId) {
//   try {
//     const FormData = require('form-data');
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('outer_id', outerId);

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/getdetail', {
//       method: 'POST',
//       body: formData,
//       headers: formData.getHeaders(),
//     });

//     const result = await response.json();
    
//     if (!result.error_message) {
//       console.log(`✅ Faceset "${outerId}" exists with ${result.face_count} faces`);
//       return { exists: true, faceCount: result.face_count };
//     }
    
//     if (result.error_message === 'INVALID_OUTER_ID') {
//       console.log(`ℹ️ Faceset "${outerId}" does not exist yet`);
//       return { exists: false };
//     }
    
//     return { exists: false, error: result.error_message };
//   } catch (error) {
//     console.error('Error checking faceset:', error);
//     return { exists: false, error: error.message };
//   }
// }

// async function createFaceset(outerId, displayName) {
//   try {
//     const FormData = require('form-data');
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('outer_id', outerId);
//     formData.append('display_name', displayName);

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/create', {
//       method: 'POST',
//       body: formData,
//       headers: formData.getHeaders(),
//     });

//     const result = await response.json();
    
//     if (result.error_message) {
//       throw new Error(`Failed to create faceset: ${result.error_message}`);
//     }

//     console.log('✅ Faceset created');
//     return { success: true, faceset: result };
//   } catch (error) {
//     console.error('Error creating faceset:', error);
//     return { success: false, error: error.message };
//   }
// }

// async function detectAndGetFaceToken(imageUrl) {
//   try {
//     const FormData = require('form-data');
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('image_url', imageUrl);

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
//       method: 'POST',
//       body: formData,
//       headers: formData.getHeaders(),
//     });

//     const result = await response.json();

//     if (result.error_message) {
//       return { success: false, error: result.error_message };
//     }

//     if (result.faces && result.faces.length > 0) {
//       return { success: true, faceToken: result.faces[0].face_token };
//     }

//     return { success: false, error: 'No face detected' };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

// async function addFaceToFaceset(outerId, faceToken, userId) {
//   try {
//     const FormData = require('form-data');
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('outer_id', outerId);
//     formData.append('face_tokens', faceToken);
//     formData.append('user_id', userId);

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/addface', {
//       method: 'POST',
//       body: formData,
//       headers: formData.getHeaders(),
//     });

//     const result = await response.json();

//     if (result.error_message) {
//       throw new Error(`Failed to add face: ${result.error_message}`);
//     }

//     return { success: true };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

// // Main POST handler
// export async function POST(request) {
//   try {
//     console.log('🔄 Starting face sync...');

//     // Check/Create faceset
//     const facesetCheck = await checkFacesetExists(FACESET_OUTER_ID);
    
//     if (!facesetCheck.exists) {
//       console.log('📝 Creating faceset...');
//       const createResult = await createFaceset(FACESET_OUTER_ID, 'Student Faces');
//       if (!createResult.success) {
//         return NextResponse.json({
//           success: false,
//           error: createResult.error,
//           message: 'Failed to create faceset'
//         }, { status: 500 });
//       }
//     }

//     // Get students with photos
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
//       return NextResponse.json({
//         success: false,
//         addedFaces: 0,
//         message: 'No students with photos found'
//       });
//     }

//     // Process students
//     const addedFaces = [];
//     const errors = [];

//     for (let i = 0; i < studentsWithPhotos.length; i++) {
//       const student = studentsWithPhotos[i];
      
//       try {
//         console.log(`[${i + 1}/${studentsWithPhotos.length}] ${student.firstName} ${student.surname}...`);

//         const detectResult = await detectAndGetFaceToken(student.profilePictureUrl);
        
//         if (!detectResult.success) {
//           errors.push({
//             matricNumber: student.matricNumber,
//             name: `${student.firstName} ${student.surname}`,
//             error: detectResult.error
//           });
//           continue;
//         }

//         const addResult = await addFaceToFaceset(
//           FACESET_OUTER_ID,
//           detectResult.faceToken,
//           student.matricNumber
//         );

//         if (!addResult.success) {
//           errors.push({
//             matricNumber: student.matricNumber,
//             name: `${student.firstName} ${student.surname}`,
//             error: addResult.error
//           });
//           continue;
//         }

//         await databases.updateDocument(
//           DATABASE_ID,
//           STUDENT_COLLECTION_ID,
//           student.$id,
//           {
//             faceTemplate: detectResult.faceToken,
//             faceCaptured: true,
//             faceCapturedAt: new Date().toISOString()
//           }
//         );
        
//         addedFaces.push(student.matricNumber);
//         console.log(`  ✅ Added`);

//       } catch (error) {
//         errors.push({
//           matricNumber: student.matricNumber,
//           name: `${student.firstName} ${student.surname}`,
//           error: error.message
//         });
//       }

//       await new Promise(resolve => setTimeout(resolve, 500));
//     }

//     console.log(`✅ Added: ${addedFaces.length}, ❌ Errors: ${errors.length}`);

//     return NextResponse.json({
//       success: true,
//       addedFaces: addedFaces.length,
//       totalProcessed: studentsWithPhotos.length,
//       errors: errors,
//       message: `Synced ${addedFaces.length}/${studentsWithPhotos.length} students`
//     });

//   } catch (error) {
//     console.error('Fatal sync error:', error);
//     return NextResponse.json({
//       success: false,
//       error: error.message,
//       addedFaces: 0
//     }, { status: 500 });
//   }
// }
import { NextResponse } from 'next/server';
import { Client, Databases, Query } from 'appwrite';

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("68e83bca0016577d1322");

const databases = new Databases(client);

const DATABASE_ID = "68e84359003dccd0b700";
const STUDENT_COLLECTION_ID = "student";
const FACESET_OUTER_ID = 'students';
const FACEPP_API_KEY = process.env.FACEPP_API_KEY || 'AWhKUAQKTH1ln5knEx9nj5qbxMwJKwia';
const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET || '-TlT-r-l_YhIABwOvWqu-yxrAtMy-Ynr';

// ✅ FIXED: Use URLSearchParams instead of FormData
async function checkFacesetExists(outerId) {
  try {
    const params = new URLSearchParams({
      api_key: FACEPP_API_KEY,
      api_secret: FACEPP_API_SECRET,
      outer_id: outerId
    });

    console.log('🔍 Checking faceset with params:', params.toString());

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/getdetail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const result = await response.json();
    console.log('📊 Faceset check result:', result);
    
    if (!result.error_message) {
      console.log(`✅ Faceset "${outerId}" exists with ${result.face_count} faces`);
      return { exists: true, faceCount: result.face_count };
    }
    
    if (result.error_message === 'INVALID_OUTER_ID') {
      console.log(`ℹ️ Faceset "${outerId}" does not exist yet`);
      return { exists: false };
    }
    
    console.error('Faceset error:', result.error_message);
    return { exists: false, error: result.error_message };
  } catch (error) {
    console.error('Error checking faceset:', error);
    return { exists: false, error: error.message };
  }
}

async function createFaceset(outerId, displayName) {
  try {
    const params = new URLSearchParams({
      api_key: FACEPP_API_KEY,
      api_secret: FACEPP_API_SECRET,
      outer_id: outerId,
      display_name: displayName
    });

    console.log('📝 Creating faceset...');

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const result = await response.json();
    console.log('📊 Create result:', result);
    
    if (result.error_message) {
      throw new Error(`Failed to create faceset: ${result.error_message}`);
    }

    console.log('✅ Faceset created successfully');
    return { success: true, faceset: result };
  } catch (error) {
    console.error('Error creating faceset:', error);
    return { success: false, error: error.message };
  }
}

async function detectAndGetFaceToken(imageUrl) {
  try {
    const params = new URLSearchParams({
      api_key: FACEPP_API_KEY,
      api_secret: FACEPP_API_SECRET,
      image_url: imageUrl
    });

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const result = await response.json();

    if (result.error_message) {
      console.error('Face detection error:', result.error_message);
      return { success: false, error: result.error_message };
    }

    if (result.faces && result.faces.length > 0) {
      const faceToken = result.faces[0].face_token;
      console.log(`✅ Face detected`);
      return { success: true, faceToken: faceToken };
    }

    console.log('⚠️ No face detected');
    return { success: false, error: 'No face detected' };
  } catch (error) {
    console.error('Error detecting face:', error);
    return { success: false, error: error.message };
  }
}

async function addFaceToFaceset(outerId, faceToken, userId) {
  try {
    const params = new URLSearchParams({
      api_key: FACEPP_API_KEY,
      api_secret: FACEPP_API_SECRET,
      outer_id: outerId,
      face_tokens: faceToken,
      user_id: userId
    });

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/addface', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const result = await response.json();

    if (result.error_message) {
      throw new Error(`Failed to add face: ${result.error_message}`);
    }

    return { success: true, result };
  } catch (error) {
    console.error('Error adding face:', error);
    return { success: false, error: error.message };
  }
}

// Main POST handler
export async function POST(request) {
  try {
    console.log('\n🔄 === STARTING FACE SYNC ===');
    console.log('API Key present:', !!FACEPP_API_KEY);
    console.log('API Secret present:', !!FACEPP_API_SECRET);

    // Check/Create faceset
    console.log('\n📋 Step 1: Checking faceset...');
    const facesetCheck = await checkFacesetExists(FACESET_OUTER_ID);
    
    if (!facesetCheck.exists) {
      console.log('📝 Faceset does not exist, creating...');
      const createResult = await createFaceset(FACESET_OUTER_ID, 'Student Faces');
      if (!createResult.success) {
        return NextResponse.json({
          success: false,
          error: createResult.error,
          message: 'Failed to create faceset'
        }, { status: 500 });
      }
      console.log('✅ Faceset created');
    } else {
      console.log(`✅ Faceset exists with ${facesetCheck.faceCount} faces`);
    }

    // Get students with photos
    console.log('\n📋 Step 2: Fetching students...');
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

    console.log(`📋 Total students: ${studentsResponse.total}`);
    console.log(`📸 Students with photos: ${studentsWithPhotos.length}`);

    if (studentsWithPhotos.length === 0) {
      return NextResponse.json({
        success: false,
        addedFaces: 0,
        message: 'No students with photos found'
      });
    }

    // Process students
    console.log('\n📋 Step 3: Processing students...');
    const addedFaces = [];
    const errors = [];

    for (let i = 0; i < studentsWithPhotos.length; i++) {
      const student = studentsWithPhotos[i];
      
      try {
        console.log(`\n[${i + 1}/${studentsWithPhotos.length}] ${student.firstName} ${student.surname} (${student.matricNumber})`);

        // Detect face
        const detectResult = await detectAndGetFaceToken(student.profilePictureUrl);
        
        if (!detectResult.success) {
          console.log(`  ❌ ${detectResult.error}`);
          errors.push({
            matricNumber: student.matricNumber,
            name: `${student.firstName} ${student.surname}`,
            error: detectResult.error
          });
          continue;
        }

        console.log(`  ✓ Face detected`);

        // Add to faceset
        const addResult = await addFaceToFaceset(
          FACESET_OUTER_ID,
          detectResult.faceToken,
          student.matricNumber
        );

        if (!addResult.success) {
          console.log(`  ❌ ${addResult.error}`);
          errors.push({
            matricNumber: student.matricNumber,
            name: `${student.firstName} ${student.surname}`,
            error: addResult.error
          });
          continue;
        }

        console.log(`  ✓ Added to faceset`);

        // Update student record
        await databases.updateDocument(
          DATABASE_ID,
          STUDENT_COLLECTION_ID,
          student.$id,
          {
            faceTemplate: detectResult.faceToken,
            faceCaptured: true,
            faceCapturedAt: new Date().toISOString()
          }
        );
        
        addedFaces.push(student.matricNumber);
        console.log(`  ✅ COMPLETE`);

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors.push({
          matricNumber: student.matricNumber,
          name: `${student.firstName} ${student.surname}`,
          error: error.message
        });
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n📊 === SYNC COMPLETE ===');
    console.log(`✅ Successfully added: ${addedFaces.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log('=========================\n');

    return NextResponse.json({
      success: true,
      addedFaces: addedFaces.length,
      totalProcessed: studentsWithPhotos.length,
      errors: errors,
      message: `Synced ${addedFaces.length}/${studentsWithPhotos.length} students`
    });

  } catch (error) {
    console.error('❌ Fatal sync error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      addedFaces: 0
    }, { status: 500 });
  }
}