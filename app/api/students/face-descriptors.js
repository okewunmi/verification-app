// pages/api/students/face-descriptors.js
import { getStudentsWithFaceDescriptors } from '@/lib/appwrite';
// Or wherever your database logic is

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('📥 Fetching students with face descriptors...');

    // Use your existing Appwrite/database function
    const result = await getStudentsWithFaceDescriptors();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to fetch students'
      });
    }

    console.log(`✅ Found ${result.data.length} students with face descriptors`);

    res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('❌ Students API error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}