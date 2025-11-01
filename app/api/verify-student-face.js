// pages/api/verify-student-face.js
import { Client, Databases, Query } from 'appwrite';

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("68e83bca0016577d1322");

const databases = new Databases(client);

export default async function handler(req, res) {
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

    console.log('🔍 Starting face verification...');

    const studentsResponse = await databases.listDocuments(
      "68e84359003dccd0b700",
      "student",
      [
        Query.equal('faceCaptured', true),
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    console.log(`📋 Found ${studentsResponse.documents.length} students`);

    if (studentsResponse.documents.length === 0) {
      return res.status(200).json({
        success: true,
        matched: false,
        message: 'No registered face images found'
      });
    }

    const base64Data = capturedImageBase64.split(',')[1] || capturedImageBase64;
    const capturedBuffer = Buffer.from(base64Data, 'base64');

    for (const student of studentsResponse.documents) {
      if (!student.profilePictureUrl) continue;

      console.log(`🔄 Checking: ${student.firstName} ${student.surname}`);

      try {
        const storedImageResponse = await fetch(student.profilePictureUrl);
        const storedImageBuffer = Buffer.from(await storedImageResponse.arrayBuffer());

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
        console.log(`📊 Confidence: ${confidence}`);

        if (confidence >= 70) {
          console.log(`✅ MATCH FOUND!`);
          
          return res.status(200).json({
            success: true,
            matched: true,
            student: student,
            confidence: confidence.toFixed(1),
            matchTime: new Date().toLocaleTimeString(),
          });
        }

      } catch (matchError) {
        console.error(`❌ Error:`, matchError);
        continue;
      }
    }

    console.log('❌ No match found');
    return res.status(200).json({
      success: true,
      matched: false,
      message: 'No matching student found'
    });

  } catch (error) {
    console.error('❌ Verification error:', error);
    return res.status(500).json({
      success: false,
      matched: false,
      error: error.message || 'Verification failed',
    });
  }
}