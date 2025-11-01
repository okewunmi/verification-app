// pages/api/verify-student-fingerprint.js
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
    const { fingerprintTemplate } = req.body;

    if (!fingerprintTemplate) {
      return res.status(400).json({
        success: false,
        matched: false,
        error: 'Fingerprint template required',
      });
    }

    const studentsResponse = await databases.listDocuments(
      "68e84359003dccd0b700",
      "student",
      [
        Query.equal('fingerprintsCaptured', true),
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    if (studentsResponse.documents.length === 0) {
      return res.status(200).json({
        success: true,
        matched: false,
        message: 'No registered fingerprints found'
      });
    }

    for (const student of studentsResponse.documents) {
      const storedFingerprints = [
        { name: 'thumb', template: student.thumbTemplate },
        { name: 'index', template: student.indexTemplate },
        { name: 'middle', template: student.middleTemplate },
        { name: 'ring', template: student.ringTemplate },
        { name: 'pinky', template: student.pinkyTemplate },
      ].filter(fp => fp.template);

      for (const storedFinger of storedFingerprints) {
        // TODO: Replace with actual fingerprint SDK
        if (fingerprintTemplate === storedFinger.template) {
          return res.status(200).json({
            success: true,
            matched: true,
            student: student,
            confidence: 95.0,
            matchTime: new Date().toLocaleTimeString(),
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      matched: false,
      message: 'No matching fingerprint found'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      matched: false,
      error: error.message || 'Verification failed',
    });
  }
}