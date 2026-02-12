// app/api/fingerprint/verify-batch/route.js
import { NextResponse } from 'next/server';

const NBIS_SERVER_URL = process.env.NBIS_SERVER_URL || 'https://nbis-server.onrender.com';

export async function POST(request) {
  try {
    const { queryImage, database, is_duplicate_check } = await request.json();

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
    // FIX 3: Use 'imageData' (not 'image') to match Flask's db_entry['imageData']
    const cleanDatabase = database.map(entry => ({
      id: entry.id,
      studentId: entry.studentId,
      matricNumber: entry.matricNumber,
      studentName: entry.studentName,
      fingerName: entry.fingerName,
      imageData: cleanBase64(entry.imageData),  // ✅ was 'image', Flask reads 'imageData'
      student: entry.student
    }));

    // Try NBIS server with better error handling
    console.log('🌐 Calling NBIS batch-compare endpoint...');

    try {
      const nbisResponse = await fetch(`${NBIS_SERVER_URL}/batch-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryImage: cleanQueryImage,           // ✅ FIX 1: camelCase matches Flask data['queryImage']
          database: cleanDatabase,
          is_duplicate_check: is_duplicate_check ?? true
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
        console.log(`🎯 Best match: ${result.bestMatch ? result.bestMatch.score : 'None'}`);

        // Enhance result with student info if needed
        if (result.bestMatch) {
          const matchedEntry = cleanDatabase.find(e => e.id === result.bestMatch.id);
          if (matchedEntry) {
            result.bestMatch.student = matchedEntry.student;
            result.bestMatch.matricNumber = matchedEntry.matricNumber;
            result.bestMatch.studentName = matchedEntry.studentName;
            result.bestMatch.fingerName = matchedEntry.fingerName;
          }
        }

        return NextResponse.json({
          success: true,
          matched: !!result.bestMatch,
          bestMatch: result.bestMatch,
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

      // Wake up the server before retrying individual comparisons
      try {
        await fetch(`${NBIS_SERVER_URL}/health`, { signal: AbortSignal.timeout(10000) });
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ NBIS server is awake');
      } catch {
        console.warn('⚠️ Health ping failed — server may still be starting');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // FALLBACK: Compare one-by-one
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
              image2: entry.imageData,           // ✅ matches the key we set above
              is_duplicate_check: is_duplicate_check ?? true
            }),
            signal: AbortSignal.timeout(60000)   // ✅ 60s for cold-start tolerance
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