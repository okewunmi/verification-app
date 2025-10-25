// pages/api/verify-faces.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface FaceValidationResult {
  error?: string;
  valid?: boolean;
}

interface VerificationResponse {
  success: boolean;
  message?: string;
  data?: {
    model: string;
    similarityScore: number;
    match: boolean;
    distance: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const form = formidable({
      maxFiles: 2,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);

    const referenceImage = Array.isArray(files.referenceImage)
      ? files.referenceImage[0]
      : files.referenceImage;
    const targetImage = Array.isArray(files.targetImage)
      ? files.targetImage[0]
      : files.targetImage;

    if (!referenceImage || !targetImage) {
      return res.status(400).json({
        success: false,
        error: 'Both reference and target images are required',
      });
    }

    // Call Python microservice for face verification
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('referenceImage', fs.createReadStream(referenceImage.filepath));
    formData.append('targetImage', fs.createReadStream(targetImage.filepath));

    const response = await fetch('http://localhost:8000/verify', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();

    // Clean up temporary files
    fs.unlinkSync(referenceImage.filepath);
    fs.unlinkSync(targetImage.filepath);

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Verification failed',
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in face verification:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}