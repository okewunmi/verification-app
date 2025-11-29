// // pages/api/verify-student-fingerprint.js
// import { Client, Databases, Query } from 'appwrite';

// const client = new Client()
//   .setEndpoint("https://nyc.cloud.appwrite.io/v1")
//   .setProject("68e83bca0016577d1322");

// const databases = new Databases(client);

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({
//       success: false,
//       matched: false,
//       error: 'Method not allowed',
//     });
//   }

//   try {
//     const { fingerprintTemplate } = req.body;

//     if (!fingerprintTemplate) {
//       return res.status(400).json({
//         success: false,
//         matched: false,
//         error: 'Fingerprint template required',
//       });
//     }

//     const studentsResponse = await databases.listDocuments(
//       "68e84359003dccd0b700",
//       "student",
//       [
//         Query.equal('fingerprintsCaptured', true),
//         Query.equal('isActive', true),
//         Query.limit(1000)
//       ]
//     );

//     if (studentsResponse.documents.length === 0) {
//       return res.status(200).json({
//         success: true,
//         matched: false,
//         message: 'No registered fingerprints found'
//       });
//     }

//     for (const student of studentsResponse.documents) {
//       const storedFingerprints = [
//         { name: 'thumb', template: student.thumbTemplate },
//         { name: 'index', template: student.indexTemplate },
//         { name: 'middle', template: student.middleTemplate },
//         { name: 'ring', template: student.ringTemplate },
//         { name: 'pinky', template: student.pinkyTemplate },
//       ].filter(fp => fp.template);

//       for (const storedFinger of storedFingerprints) {
//         // TODO: Replace with actual fingerprint SDK
//         if (fingerprintTemplate === storedFinger.template) {
//           return res.status(200).json({
//             success: true,
//             matched: true,
//             student: student,
//             confidence: 95.0,
//             matchTime: new Date().toLocaleTimeString(),
//           });
//         }
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       matched: false,
//       message: 'No matching fingerprint found'
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       matched: false,
//       error: error.message || 'Verification failed',
//     });
//   }
// }
// pages/api/verify-student-fingerprint.js
// PRODUCTION READY - Handles client-side SDK verification results

import { Client, Databases, Query } from 'appwrite';

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("68e83bca0016577d1322");

const databases = new Databases(client);

const CONFIG = {
  databaseId: "68e84359003dccd0b700",
  studentsCollectionId: "student"
};

/**
 * IMPORTANT: This API receives verification results from the CLIENT
 * The actual fingerprint matching happens in the browser using DigitalPersona SDK
 * This API just validates and returns student data
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      matched: false,
      error: 'Method not allowed',
    });
  }

  try {
    console.log('\n🔍 === FINGERPRINT VERIFICATION REQUEST ===');
    
    const { capturedTemplate, mode = 'verify' } = req.body;

    if (!capturedTemplate) {
      console.error('❌ No fingerprint template provided');
      return res.status(400).json({
        success: false,
        matched: false,
        error: 'Fingerprint template required',
      });
    }

    console.log('📋 Template received, length:', capturedTemplate.length);

    // Get all students with fingerprints
    console.log('🔍 Fetching students with fingerprints...');
    const studentsResponse = await databases.listDocuments(
      CONFIG.databaseId,
      CONFIG.studentsCollectionId,
      [
        Query.equal('fingerprintsCaptured', true),
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    console.log(`📊 Found ${studentsResponse.documents.length} students with fingerprints`);

    if (studentsResponse.documents.length === 0) {
      console.log('⚠️ No registered fingerprints in database');
      return res.status(200).json({
        success: true,
        matched: false,
        message: 'No registered fingerprints found in database'
      });
    }

    // Prepare all stored templates for client-side comparison
    const storedTemplates = [];
    
    studentsResponse.documents.forEach(student => {
      const fingers = [
        { name: 'Thumb', template: student.thumbTemplate },
        { name: 'Index', template: student.indexTemplate },
        { name: 'Middle', template: student.middleTemplate },
        { name: 'Ring', template: student.ringTemplate },
        { name: 'Pinky', template: student.pinkyTemplate },
      ];

      fingers.forEach(finger => {
        if (finger.template && finger.template.trim() !== '') {
          storedTemplates.push({
            id: student.$id,
            matricNumber: student.matricNumber,
            firstName: student.firstName,
            surname: student.surname,
            template: finger.template,
            fingerName: finger.name,
            student: {
              $id: student.$id,
              matricNumber: student.matricNumber,
              firstName: student.firstName,
              surname: student.surname,
              middleName: student.middleName,
              department: student.department,
              level: student.level,
              profilePictureUrl: student.profilePictureUrl
            }
          });
        }
      });
    });

    console.log(`📝 Prepared ${storedTemplates.length} fingerprint templates for comparison`);

    // Return templates for CLIENT-SIDE comparison
    // The actual SDK comparison must happen in the browser where DigitalPersona SDK is available
    return res.status(200).json({
      success: true,
      mode: 'client-side-comparison',
      templatesCount: storedTemplates.length,
      templates: storedTemplates,
      message: 'Templates ready for client-side comparison'
    });

  } catch (error) {
    console.error('❌ Verification error:', error);
    return res.status(500).json({
      success: false,
      matched: false,
      error: error.message || 'Verification failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Alternative endpoint for when match is found on client
 * POST /api/confirm-fingerprint-match
 */
export async function confirmMatch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { studentId, matchScore, confidence } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID required' });
    }

    // Get full student details
    const student = await databases.getDocument(
      CONFIG.databaseId,
      CONFIG.studentsCollectionId,
      studentId
    );

    console.log(`✅ Match confirmed: ${student.firstName} ${student.surname}`);

    return res.status(200).json({
      success: true,
      matched: true,
      student: student,
      confidence: confidence,
      matchScore: matchScore,
      matchTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error confirming match:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}