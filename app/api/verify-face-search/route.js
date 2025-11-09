import { searchStudentByFace } from '@/lib/appwrite';

/**
 * Face++ Search API - FASTEST METHOD
 * Requires: syncStudentFacesToFacePlusPlus() run first
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
    const { capturedImageBase64 } = req.body;

    if (!capturedImageBase64) {
      return res.status(400).json({
        success: false,
        matched: false,
        error: 'Captured image is required',
      });
    }

    console.log('🔍 [Face++ Search] Starting verification...');

    // Use Face++ Search API
    const result = await searchStudentByFace(capturedImageBase64);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Verification error:', error);
    return res.status(500).json({
      success: false,
      matched: false,
      error: error.message || 'Verification failed',
    });
  }
}