// app/api/fingerprint/compare/route.js
// Updated to use NIST NBIS server for accurate matching

import { NextResponse } from 'next/server';

// Your NBIS server URL (Render deployment)
const NBIS_SERVER_URL = process.env.NBIS_SERVER_URL || 'https://nbis-server.onrender.com';

export async function POST(request) {
  try {
    const { image1, image2 } = await request.json();

    if (!image1 || !image2) {
      return NextResponse.json(
        { success: false, error: 'Missing image data' },
        { status: 400 }
      );
    }

    console.log('\n🔍 === NBIS FINGERPRINT COMPARISON ===');

    // Normalize Base64 (remove data URL prefix if present)
    const cleanBase64 = (input) => {
      let base64 = input;
      if (base64.includes('data:image')) {
        base64 = base64.split(',')[1];
      }
      // Remove whitespace
      base64 = base64.replace(/\s/g, '');
      // Convert Base64URL to standard Base64
      base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding
      const paddingNeeded = (4 - (base64.length % 4)) % 4;
      if (paddingNeeded > 0) base64 += '='.repeat(paddingNeeded);
      return base64;
    };

    const img1Base64 = cleanBase64(image1);
    const img2Base64 = cleanBase64(image2);

    // Quick exact match check (saves API calls)
    if (img1Base64 === img2Base64) {
      console.log('✅ EXACT MATCH (same image)');
      return NextResponse.json({
        success: true,
        matched: true,
        similarity: 100,
        confidence: 100,
        score: 999,
        method: 'exact_match'
      });
    }

    // Call NBIS server for real fingerprint matching
    console.log('🌐 Calling NBIS server...');
    
    const nbisResponse = await fetch(`${NBIS_SERVER_URL}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image1: img1Base64,
        image2: img2Base64
      }),
      // Increase timeout for processing
      signal: AbortSignal.timeout(30000) // 30 seconds
    });

    if (!nbisResponse.ok) {
      throw new Error(`NBIS server error: ${nbisResponse.status}`);
    }

    const result = await nbisResponse.json();

    console.log(`📊 NBIS Score: ${result.score}`);
    console.log(`🎯 Result: ${result.matched ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log(`📈 Confidence: ${result.confidence}%`);
    console.log('==========================================\n');

    return NextResponse.json({
      success: true,
      matched: result.matched,
      similarity: result.score,
      confidence: result.confidence,
      threshold: result.threshold,
      method: 'NIST_NBIS',
      details: result.details
    });

  } catch (error) {
    console.error('❌ Comparison error:', error);
    
    // Check if it's a timeout
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Comparison timeout - please try again' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}