// pages/api/verify-student-face.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Client, Databases, Query } from 'appwrite';

// Initialize Appwrite client directly in this file
const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("68e83bca0016577d1322");

const databases = new Databases(client);

const config = {
  databaseId: "68e84359003dccd0b700",
  studentsCollectionId: "student",
};

interface VerificationResponse {
  success: boolean;
  matched: boolean;
  student?: any;
  confidence?: number;
  matchTime?: string;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      matched: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { capturedImageBase64 } = req.body;

    if (!capturedImageBase64) {
      return res.status(400).json({
        success: false,
        matched: false,
        error: 'Captured image is required',
      });
    }

    console.log('🔍 Starting face verification against all students...');

    // Get ALL students with face images captured
    const studentsResponse = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('faceCaptured', true),
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    console.log(`📋 Found ${studentsResponse.documents.length} students with face images`);

    if (studentsResponse.documents.length === 0) {
      return res.status(200).json({
        success: true,
        matched: false,
        message: 'No registered face images found in database'
      });
    }

    // Convert base64 to blob for comparison
    const base64Data = capturedImageBase64.split(',')[1] || capturedImageBase64;
    const capturedBuffer = Buffer.from(base64Data, 'base64');

    // Iterate through each student and compare faces
    for (const student of studentsResponse.documents) {
      if (!student.faceImageUrl) continue;

      console.log(`🔄 Checking: ${student.firstName} ${student.surname} (${student.matricNumber})`);

      try {
        // Fetch stored face image
        const storedImageResponse = await fetch(student.faceImageUrl);
        const storedImageBuffer = Buffer.from(await storedImageResponse.arrayBuffer());

        // Prepare form data for Face++ API
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('api_key', process.env.FACEPP_API_KEY);
        formData.append('api_secret', process.env.FACEPP_API_SECRET);
        formData.append('image_file1', storedImageBuffer, {
          filename: 'stored.jpg',
          contentType: 'image/jpeg'
        });
        formData.append('image_file2', capturedBuffer, {
          filename: 'captured.jpg',
          contentType: 'image/jpeg'
        });

        // Call Face++ Compare API
        const compareResponse = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders(),
        });

        const compareResult = await compareResponse.json();

        if (compareResult.error_message) {
          console.error(`❌ Face++ error: ${compareResult.error_message}`);
          continue;
        }

        const confidence = compareResult.confidence || 0;
        console.log(`📊 Confidence score: ${confidence}`);

        // Match threshold: 70+ is typically same person
        if (confidence >= 70) {
          console.log(`✅ MATCH FOUND! ${student.firstName} ${student.surname}`);
          
          return res.status(200).json({
            success: true,
            matched: true,
            student: student,
            confidence: confidence.toFixed(1),
            matchTime: new Date().toLocaleTimeString(),
          });
        }

      } catch (matchError) {
        console.error(`❌ Error comparing with ${student.matricNumber}:`, matchError);
        continue;
      }
    }

    // No match found
    console.log('❌ No matching student found');
    return res.status(200).json({
      success: true,
      matched: false,
      message: 'No matching student found in database'
    });

  } catch (error) {
    console.error('❌ Face verification error:', error);
    return res.status(500).json({
      success: false,
      matched: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    });
  }
}