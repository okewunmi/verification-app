// // pages/api/verify-faces.ts
// import type { NextApiRequest, NextApiResponse } from 'next';
// import formidable from 'formidable';
// import fs from 'fs';
// import path from 'path';

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// interface FaceValidationResult {
//   error?: string;
//   valid?: boolean;
// }

// interface VerificationResponse {
//   success: boolean;
//   message?: string;
//   data?: {
//     model: string;
//     similarityScore: number;
//     match: boolean;
//     distance: number;
//   };
//   error?: string;
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<VerificationResponse>
// ) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({
//       success: false,
//       error: 'Method not allowed',
//     });
//   }

//   try {
//     const form = formidable({
//       maxFiles: 2,
//       maxFileSize: 10 * 1024 * 1024, // 10MB
//     });

//     const [fields, files] = await form.parse(req);

//     const referenceImage = Array.isArray(files.referenceImage)
//       ? files.referenceImage[0]
//       : files.referenceImage;
//     const targetImage = Array.isArray(files.targetImage)
//       ? files.targetImage[0]
//       : files.targetImage;

//     if (!referenceImage || !targetImage) {
//       return res.status(400).json({
//         success: false,
//         error: 'Both reference and target images are required',
//       });
//     }

//     // Call Python microservice for face verification
//     const FormData = require('form-data');
//     const formData = new FormData();
    
//     formData.append('referenceImage', fs.createReadStream(referenceImage.filepath));
//     formData.append('targetImage', fs.createReadStream(targetImage.filepath));

//     const response = await fetch('http://localhost:8000/verify', {
//       method: 'POST',
//       body: formData,
//       headers: formData.getHeaders(),
//     });

//     const result = await response.json();

//     // Clean up temporary files
//     fs.unlinkSync(referenceImage.filepath);
//     fs.unlinkSync(targetImage.filepath);

//     if (!response.ok) {
//       return res.status(400).json({
//         success: false,
//         error: result.error || 'Verification failed',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     console.error('Error in face verification:', error);
//     return res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Internal server error',
//     });
//   }
// }
// pages/api/facial-recognition.ts
// import type { NextApiRequest, NextApiResponse } from 'next';
// import formidable from 'formidable';
// import FormData from 'form-data';
// import fs from 'fs';

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// interface VerificationResponse {
//   success: boolean;
//   message?: string;
//   data?: {
//     match: boolean;
//     similarityScore: number;
//     confidence: number;
//     thresholds: {
//       '1e-3': number;
//       '1e-4': number;
//       '1e-5': number;
//     };
//   };
//   error?: string;
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<VerificationResponse>
// ) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({
//       success: false,
//       error: 'Method not allowed',
//     });
//   }

//   try {
//     // Parse form data
//     const form = formidable({
//       maxFiles: 2,
//       maxFileSize: 10 * 1024 * 1024, // 10MB
//     });

//     const [fields, files] = await form.parse(req);

//     const referenceImage = Array.isArray(files.referenceImage)
//       ? files.referenceImage[0]
//       : files.referenceImage;
//     const targetImage = Array.isArray(files.targetImage)
//       ? files.targetImage[0]
//       : files.targetImage;

//     if (!referenceImage || !targetImage) {
//       return res.status(400).json({
//         success: false,
//         error: 'Both reference and target images are required',
//       });
//     }

//     // OPTION 1: Using Face++ API (Recommended - Free tier available)
//     // Sign up at: https://console.faceplusplus.com/
//     const FACEPP_API_KEY = process.env.FACEPP_API_KEY || 'YOUR_API_KEY';
//     const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET || 'YOUR_API_SECRET';

//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('image_file1', fs.createReadStream(referenceImage.filepath));
//     formData.append('image_file2', fs.createReadStream(targetImage.filepath));

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
//       method: 'POST',
//       body: formData,
//       headers: formData.getHeaders(),
//     });

//     const result = await response.json();

//     // Clean up temporary files
//     fs.unlinkSync(referenceImage.filepath);
//     fs.unlinkSync(targetImage.filepath);

//     if (!response.ok || result.error_message) {
//       return res.status(400).json({
//         success: false,
//         error: result.error_message || 'Face verification failed',
//       });
//     }

//     // Face++ returns confidence score (0-100)
//     // Typical threshold: 70-75 for same person
//     const confidence = result.confidence || 0;
//     const isMatch = confidence >= 70; // Adjust threshold as needed

//     return res.status(200).json({
//       success: true,
//       data: {
//         match: isMatch,
//         similarityScore: confidence / 100, // Normalize to 0-1
//         confidence: confidence,
//         thresholds: result.thresholds || {
//           '1e-3': 62.327,
//           '1e-4': 69.101,
//           '1e-5': 74.399,
//         },
//       },
//     });

//   } catch (error) {
//     console.error('Error in face verification:', error);
//     return res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Internal server error',
//     });
//   }
// }

// // ALTERNATIVE: Using DeepFace (Self-hosted Python service)
// // Keep your Python service but update the endpoint call:
// /*
// const response = await fetch('http://localhost:8000/verify', {
//   method: 'POST',
//   body: formData,
//   headers: formData.getHeaders(),
// });
// */

// // ALTERNATIVE: Using AWS Rekognition
// /*
// import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";

// const client = new RekognitionClient({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });

// const sourceBuffer = fs.readFileSync(referenceImage.filepath);
// const targetBuffer = fs.readFileSync(targetImage.filepath);

// const command = new CompareFacesCommand({
//   SourceImage: { Bytes: sourceBuffer },
//   TargetImage: { Bytes: targetBuffer },
//   SimilarityThreshold: 70,
// });

// const result = await client.send(command);
// const match = result.FaceMatches && result.FaceMatches.length > 0;
// const similarity = match ? result.FaceMatches[0].Similarity : 0;
// */
// pages/api/facial-recognition.ts
// This is a STANDALONE utility route for Face++ testing
// The actual verification logic is in verify-student-face.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface VerificationResponse {
  success: boolean;
  message?: string;
  data?: {
    match: boolean;
    similarityScore: number;
    confidence: number;
    thresholds?: any;
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
    const { image1Base64, image2Base64 } = req.body;

    if (!image1Base64 || !image2Base64) {
      return res.status(400).json({
        success: false,
        error: 'Both images are required',
      });
    }

    // Convert base64 to buffer
    const image1Buffer = Buffer.from(image1Base64.split(',')[1] || image1Base64, 'base64');
    const image2Buffer = Buffer.from(image2Base64.split(',')[1] || image2Base64, 'base64');

    // Prepare form data for Face++ API
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('api_key', process.env.FACEPP_API_KEY);
    formData.append('api_secret', process.env.FACEPP_API_SECRET);
    formData.append('image_file1', image1Buffer, {
      filename: 'image1.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('image_file2', image2Buffer, {
      filename: 'image2.jpg',
      contentType: 'image/jpeg'
    });

    // Call Face++ Compare API
    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();

    if (!response.ok || result.error_message) {
      return res.status(400).json({
        success: false,
        error: result.error_message || 'Face verification failed',
      });
    }

    // Face++ returns confidence score (0-100)
    const confidence = result.confidence || 0;
    const isMatch = confidence >= 70;

    return res.status(200).json({
      success: true,
      data: {
        match: isMatch,
        similarityScore: confidence / 100,
        confidence: confidence,
        thresholds: result.thresholds,
      },
    });

  } catch (error) {
    console.error('Error in face verification:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}