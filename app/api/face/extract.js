// pages/api/face/extract.js
import faceRecognition from '@/lib/face-recognition-browser';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow larger images
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }

    console.log('📸 Extracting face descriptor from mobile image...');

    // Use your existing face-recognition-browser.js
    const result = await faceRecognition.extractDescriptor(image);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to extract face descriptor'
      });
    }

    console.log(`✅ Face extracted (confidence: ${result.confidence}%)`);

    res.status(200).json({
      success: true,
      descriptor: result.descriptor,
      confidence: result.confidence
    });

  } catch (error) {
    console.error('❌ Extract API error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}