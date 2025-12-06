

// app/api/fingerprint/verify-batch/route.js
import { NextResponse } from 'next/server';

const NBIS_SERVER_URL = process.env.NBIS_SERVER_URL || 'https://nbis-server.onrender.com';

export async function POST(request) {
  try {
    const { queryImage, database } = await request.json();

    if (!queryImage || !database || !Array.isArray(database)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.log(`\n🔍 === BATCH VERIFICATION: 1 vs ${database.length} ===`);

    // Normalize Base64
    const cleanBase64 = (input) => {
      let base64 = input;
      if (base64.includes('data:image')) {
        base64 = base64.split(',')[1];
      }
      base64 = base64.replace(/\s/g, '');
      base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
      const paddingNeeded = (4 - (base64.length % 4)) % 4;
      if (paddingNeeded > 0) base64 += '='.repeat(paddingNeeded);
      return base64;
    };

    const cleanQueryImage = cleanBase64(queryImage);

    // Prepare database
    const cleanDatabase = database.map(entry => ({
      id: entry.id,
      studentId: entry.studentId,
      matricNumber: entry.matricNumber,
      studentName: entry.studentName,
      fingerName: entry.fingerName,
      image: cleanBase64(entry.imageData),
      student: entry.student
    }));

    // Try NBIS server with better error handling
    console.log('🌐 Calling NBIS batch-compare endpoint...');
    
    try {
      const nbisResponse = await fetch(`${NBIS_SERVER_URL}/batch-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_image: cleanQueryImage,
          database: cleanDatabase
        }),
        signal: AbortSignal.timeout(120000)
      });

      // Get response text first to debug
      const responseText = await nbisResponse.text();
      console.log('📥 NBIS Response Status:', nbisResponse.status);
      console.log('📥 NBIS Response (first 500 chars):', responseText.substring(0, 500));

      if (nbisResponse.ok) {
        const result = JSON.parse(responseText);
        
        console.log(`✅ Batch comparison complete`);
        console.log(`🎯 Best match: ${result.best_match ? result.best_match.score : 'None'}`);

        // Enhance result with student info
        if (result.best_match) {
          const matchedEntry = cleanDatabase.find(e => e.id === result.best_match.id);
          if (matchedEntry) {
            result.best_match.student = matchedEntry.student;
            result.best_match.matricNumber = matchedEntry.matricNumber;
            result.best_match.studentName = matchedEntry.studentName;
            result.best_match.fingerName = matchedEntry.fingerName;
          }
        }

        return NextResponse.json({
          success: true,
          matched: !!result.best_match,
          bestMatch: result.best_match,
          totalCompared: result.total_compared,
          queryMinutiae: result.query_minutiae,
          method: 'NIST_NBIS_BATCH'
        });
      } else {
        console.error('❌ NBIS returned error:', responseText);
        throw new Error(`NBIS error: ${responseText.substring(0, 200)}`);
      }
    } catch (nbisError) {
      console.error('❌ NBIS server error:', nbisError.message);
      console.log('⚠️ Falling back to sequential comparison...');
      
      // FALLBACK: Compare one-by-one using your /compare endpoint
      let bestMatch = null;
      let highestScore = 0;

      for (let i = 0; i < cleanDatabase.length; i++) {
        const entry = cleanDatabase[i];
        
        try {
          const compareResponse = await fetch(`${NBIS_SERVER_URL}/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image1: cleanQueryImage,
              image2: entry.image
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (compareResponse.ok) {
            const compareResult = await compareResponse.json();
            
            if (compareResult.success && compareResult.matched && compareResult.score > highestScore) {
              highestScore = compareResult.score;
              bestMatch = {
                id: entry.id,
                studentId: entry.studentId,
                matricNumber: entry.matricNumber,
                studentName: entry.studentName,
                fingerName: entry.fingerName,
                student: entry.student,
                score: compareResult.score,
                confidence: compareResult.confidence
              };
            }
          }
        } catch (compareError) {
          console.error(`Error comparing entry ${i}:`, compareError.message);
          continue;
        }
      }

      console.log(`✅ Fallback comparison complete`);
      console.log(`🎯 Best match score: ${highestScore}`);

      return NextResponse.json({
        success: true,
        matched: !!bestMatch,
        bestMatch: bestMatch,
        totalCompared: cleanDatabase.length,
        method: 'NBIS_SEQUENTIAL_FALLBACK'
      });
    }

  } catch (error) {
    console.error('❌ Batch verification error:', error);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}