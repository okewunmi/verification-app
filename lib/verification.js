// lib/verification.js
import { databases, Query } from './appwrite';

const config = {
  databaseId: "68e84359003dccd0b700",
  studentsCollectionId: "student",
};

/**
 * Verify student using facial recognition
 * @param {string} capturedImageBase64 - Base64 encoded captured image
 * @returns {Promise<Object>} Verification result
 */
export const verifyStudentFace = async (capturedImageBase64) => {
  try {
    console.log('🔍 Starting face verification...');

    // Get all students with face images
    const studentsResponse = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('faceCaptured', true),
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    console.log(`📋 Found ${studentsResponse.documents.length} students with faces`);

    if (studentsResponse.documents.length === 0) {
      return {
        success: true,
        matched: false,
        message: 'No registered face images found in database'
      };
    }

    // Extract base64 data
    const base64Data = capturedImageBase64.split(',')[1] || capturedImageBase64;

    // Check each student
    for (const student of studentsResponse.documents) {
      if (!student.profilePictureUrl) continue;

      console.log(`🔄 Checking: ${student.firstName} ${student.surname}`);

      try {
        // Compare using Face++ API
        const faceMatchResult = await compareFacesWithFacePlusPlus(
          student.profilePictureUrl,
          base64Data
        );

        if (faceMatchResult.matched) {
          console.log(`✅ MATCH FOUND! Confidence: ${faceMatchResult.confidence}%`);
          
          return {
            success: true,
            matched: true,
            student: student,
            confidence: faceMatchResult.confidence,
            matchTime: new Date().toLocaleTimeString(),
          };
        }

      } catch (matchError) {
        console.error(`❌ Error comparing with ${student.matricNumber}:`, matchError);
        continue;
      }
    }

    // No match found
    console.log('❌ No matching student found');
    return {
      success: true,
      matched: false,
      message: 'No matching student found in database'
    };

  } catch (error) {
    console.error('❌ Face verification error:', error);
    return {
      success: false,
      matched: false,
      error: error.message || 'Verification failed'
    };
  }
};

/**
 * Compare two faces using Face++ API
 * @param {string} storedImageUrl - URL of stored student image
 * @param {string} capturedImageBase64 - Base64 of captured image (without data:image prefix)
 * @returns {Promise<Object>} Match result with confidence
 */
const compareFacesWithFacePlusPlus = async (storedImageUrl, capturedImageBase64) => {
  try {
    // Fetch stored image
    const storedImageResponse = await fetch(storedImageUrl);
    const storedImageBlob = await storedImageResponse.blob();

    // Convert base64 to blob
    const capturedImageBlob = base64ToBlob(capturedImageBase64, 'image/jpeg');

    // Create FormData for Face++ API
    const formData = new FormData();
    formData.append('api_key', process.env.NEXT_PUBLIC_FACEPP_API_KEY);
    formData.append('api_secret', process.env.NEXT_PUBLIC_FACEPP_API_SECRET);
    formData.append('image_file1', storedImageBlob, 'stored.jpg');
    formData.append('image_file2', capturedImageBlob, 'captured.jpg');

    // Call Face++ Compare API
    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.error_message) {
      throw new Error(result.error_message);
    }

    const confidence = result.confidence || 0;

    return {
      matched: confidence >= 70, // Threshold for same person
      confidence: confidence.toFixed(1)
    };

  } catch (error) {
    console.error('Face++ comparison error:', error);
    throw error;
  }
};

/**
 * Convert base64 to Blob
 * @param {string} base64 - Base64 string (without data:image prefix)
 * @param {string} contentType - MIME type
 * @returns {Blob}
 */
const base64ToBlob = (base64, contentType = 'image/jpeg') => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

/**
 * Verify student using fingerprint
 * @param {string} capturedTemplate - Captured fingerprint template
 * @returns {Promise<Object>} Verification result
 */
export const verifyStudentFingerprint = async (capturedTemplate) => {
  try {
    console.log('🔍 Starting fingerprint verification...');

    // Get all students with fingerprints
    const studentsResponse = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('fingerprintsCaptured', true),
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    console.log(`📋 Found ${studentsResponse.documents.length} students with fingerprints`);

    if (studentsResponse.documents.length === 0) {
      return {
        success: true,
        matched: false,
        message: 'No registered fingerprints found in database'
      };
    }

    // Check each student's fingerprints
    for (const student of studentsResponse.documents) {
      console.log(`🔄 Checking: ${student.firstName} ${student.surname}`);

      // Get all captured fingerprints
      const storedFingerprints = [
        { name: 'thumb', template: student.thumbTemplate },
        { name: 'index', template: student.indexTemplate },
        { name: 'middle', template: student.middleTemplate },
        { name: 'ring', template: student.ringTemplate },
        { name: 'pinky', template: student.pinkyTemplate },
      ].filter(fp => fp.template);

      // Compare with each stored fingerprint
      for (const storedFinger of storedFingerprints) {
        try {
          // TODO: Replace with actual fingerprint SDK comparison
          // const matchScore = await fingerprintSDK.compare(capturedTemplate, storedFinger.template);
          
          // TEMPORARY: Simple string comparison (REPLACE WITH ACTUAL SDK)
          if (capturedTemplate === storedFinger.template) {
            console.log(`✅ MATCH FOUND! ${storedFinger.name} finger`);
            
            return {
              success: true,
              matched: true,
              student: student,
              confidence: 95.0,
              matchTime: new Date().toLocaleTimeString(),
            };
          }

        } catch (matchError) {
          console.error(`❌ Error comparing fingerprint:`, matchError);
          continue;
        }
      }
    }

    // No match found
    console.log('❌ No matching fingerprint found');
    return {
      success: true,
      matched: false,
      message: 'No matching fingerprint found in database'
    };

  } catch (error) {
    console.error('❌ Fingerprint verification error:', error);
    return {
      success: false,
      matched: false,
      error: error.message || 'Verification failed'
    };
  }
};

/**
 * Save verification log (optional - for attendance tracking)
 * @param {Object} verificationData - Data to log
 */
export const saveVerificationLog = async (verificationData) => {
  try {
    // TODO: Implement if you want to track verification logs
    console.log('Verification logged:', verificationData);
    
    // Example: Save to a verificationLogs collection
    // await databases.createDocument(
    //   config.databaseId,
    //   'verificationLogs',
    //   ID.unique(),
    //   verificationData
    // );
    
    return { success: true };
  } catch (error) {
    console.error('Error saving verification log:', error);
    return { success: false, error: error.message };
  }
};