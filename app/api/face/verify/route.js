// pages/api/face/verify.js
import faceRecognition from '@/lib/face-recognition-browser';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { inputDescriptor, students } = req.body;

    if (!inputDescriptor || !students || !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: inputDescriptor and students array required'
      });
    }

    console.log(`🔍 Verifying face against ${students.length} students...`);

    // Use your existing face-recognition-browser.js
    const result = await faceRecognition.verifyFaceWithMatcher(
      inputDescriptor,
      students
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Verification failed'
      });
    }

    if (!result.matched) {
      console.log('❌ No match found');
      return res.status(200).json({
        success: true,
        matched: false,
        message: result.message || 'No matching student found',
        bestDistance: result.bestDistance
      });
    }

    console.log(`✅ Match found: ${result.student.matricNumber}`);

    res.status(200).json({
      success: true,
      matched: true,
      student: result.student,
      confidence: result.confidence,
      distance: result.distance
    });

  } catch (error) {
    console.error('❌ Verify API error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}