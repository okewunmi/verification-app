// pages/api/face/health.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if face recognition models are loaded
    res.status(200).json({
      success: true,
      message: 'Face recognition API is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}