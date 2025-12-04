// app/api/fingerprint/compare/route.js
// Next.js API Route for Server-Side Fingerprint Matching (Canvas-based)

import { NextResponse } from 'next/server';
import { createCanvas, loadImage } from 'canvas';
// Install with: npm install canvas

/**
 * POST /api/fingerprint/compare
 * 
 * Compares two fingerprint images server-side using Canvas
 */
export async function POST(request) {
  try {
    const { image1, image2 } = await request.json();

    if (!image1 || !image2) {
      return NextResponse.json(
        { success: false, error: 'Missing image data' },
        { status: 400 }
      );
    }

    console.log('🔍 Server-side fingerprint comparison...');

    // Convert base64 to data URLs
    const dataURL1 = `data:image/png;base64,${image1}`;
    const dataURL2 = `data:image/png;base64,${image2}`;

    // Compare fingerprints
    const similarity = await compareFingerprints(dataURL1, dataURL2);

    const MATCH_THRESHOLD = 85;
    const isMatch = similarity >= MATCH_THRESHOLD;

    console.log(`✅ Similarity: ${similarity.toFixed(1)}% - ${isMatch ? 'MATCH ✓' : 'NO MATCH ✗'}`);

    return NextResponse.json({
      success: true,
      matched: isMatch,
      similarity: Math.round(similarity),
      confidence: Math.round(similarity),
      threshold: MATCH_THRESHOLD,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Comparison error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Compare two fingerprint images using Canvas
 */
async function compareFingerprints(dataURL1, dataURL2) {
  try {
    const size = 200;

    // Load both images
    const [img1, img2] = await Promise.all([
      loadImage(dataURL1),
      loadImage(dataURL2)
    ]);

    // Create canvases and resize images
    const canvas1 = createCanvas(size, size);
    const ctx1 = canvas1.getContext('2d');
    ctx1.drawImage(img1, 0, 0, size, size);
    const data1 = ctx1.getImageData(0, 0, size, size).data;

    const canvas2 = createCanvas(size, size);
    const ctx2 = canvas2.getContext('2d');
    ctx2.drawImage(img2, 0, 0, size, size);
    const data2 = ctx2.getImageData(0, 0, size, size).data;

    // Calculate similarity (comparing grayscale values)
    let totalDiff = 0;
    let pixelCount = 0;

    for (let i = 0; i < data1.length; i += 4) {
      // Convert to grayscale
      const gray1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3;
      const gray2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3;
      
      const diff = Math.abs(gray1 - gray2);
      totalDiff += diff;
      pixelCount++;
    }

    const avgDiff = totalDiff / pixelCount;
    const similarity = Math.max(0, 100 - (avgDiff / 255 * 100));

    return similarity;

  } catch (error) {
    console.error('❌ Image comparison error:', error);
    throw error;
  }
}