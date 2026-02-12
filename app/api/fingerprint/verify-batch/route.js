// // app/api/fingerprint/verify-batch/route.js
// import { NextResponse } from 'next/server';

// const NBIS_SERVER_URL = process.env.NBIS_SERVER_URL || 'https://nbis-server.onrender.com';

// export async function POST(request) {
//   try {
//     const { queryImage, database, is_duplicate_check } = await request.json();

//     if (!queryImage || !database || !Array.isArray(database)) {
//       return NextResponse.json(
//         { success: false, error: 'Invalid request data' },
//         { status: 400 }
//       );
//     }

//     console.log(`\n🔍 === BATCH VERIFICATION: 1 vs ${database.length} ===`);

//     // Normalize Base64
//     const cleanBase64 = (input) => {
//       let base64 = input;
//       if (base64.includes('data:image')) {
//         base64 = base64.split(',')[1];
//       }
//       base64 = base64.replace(/\s/g, '');
//       base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
//       const paddingNeeded = (4 - (base64.length % 4)) % 4;
//       if (paddingNeeded > 0) base64 += '='.repeat(paddingNeeded);
//       return base64;
//     };

//     const cleanQueryImage = cleanBase64(queryImage);

//     // Prepare database
//     // FIX 3: Use 'imageData' (not 'image') to match Flask's db_entry['imageData']
//     const cleanDatabase = database.map(entry => ({
//       id: entry.id,
//       studentId: entry.studentId,
//       matricNumber: entry.matricNumber,
//       studentName: entry.studentName,
//       fingerName: entry.fingerName,
//       imageData: cleanBase64(entry.imageData),  // ✅ was 'image', Flask reads 'imageData'
//       student: entry.student
//     }));

//     // Try NBIS server with better error handling
//     console.log('🌐 Calling NBIS batch-compare endpoint...');

//     try {
//       const nbisResponse = await fetch(`${NBIS_SERVER_URL}/batch-compare`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           queryImage: cleanQueryImage,           // ✅ FIX 1: camelCase matches Flask data['queryImage']
//           database: cleanDatabase,
//           is_duplicate_check: is_duplicate_check ?? true
//         }),
//         signal: AbortSignal.timeout(120000)
//       });

//       // Get response text first to debug
//       const responseText = await nbisResponse.text();
//       console.log('📥 NBIS Response Status:', nbisResponse.status);
//       console.log('📥 NBIS Response (first 500 chars):', responseText.substring(0, 500));

//       if (nbisResponse.ok) {
//         const result = JSON.parse(responseText);

//         console.log(`✅ Batch comparison complete`);
//         console.log(`🎯 Best match: ${result.bestMatch ? result.bestMatch.score : 'None'}`);

//         // Enhance result with student info if needed
//         if (result.bestMatch) {
//           const matchedEntry = cleanDatabase.find(e => e.id === result.bestMatch.id);
//           if (matchedEntry) {
//             result.bestMatch.student = matchedEntry.student;
//             result.bestMatch.matricNumber = matchedEntry.matricNumber;
//             result.bestMatch.studentName = matchedEntry.studentName;
//             result.bestMatch.fingerName = matchedEntry.fingerName;
//           }
//         }

//         return NextResponse.json({
//           success: true,
//           matched: !!result.bestMatch,
//           bestMatch: result.bestMatch,
//           totalCompared: result.total_compared,
//           queryMinutiae: result.query_minutiae,
//           method: 'NIST_NBIS_BATCH'
//         });
//       } else {
//         console.error('❌ NBIS returned error:', responseText);
//         throw new Error(`NBIS error: ${responseText.substring(0, 200)}`);
//       }
//     } catch (nbisError) {
//       console.error('❌ NBIS server error:', nbisError.message);
//       console.log('⚠️ Falling back to sequential comparison...');

//       // Wake up the server before retrying individual comparisons
//       try {
//         await fetch(`${NBIS_SERVER_URL}/health`, { signal: AbortSignal.timeout(10000) });
//         await new Promise(resolve => setTimeout(resolve, 3000));
//         console.log('✅ NBIS server is awake');
//       } catch {
//         console.warn('⚠️ Health ping failed — server may still be starting');
//         await new Promise(resolve => setTimeout(resolve, 5000));
//       }

//       // FALLBACK: Compare one-by-one
//       let bestMatch = null;
//       let highestScore = 0;

//       for (let i = 0; i < cleanDatabase.length; i++) {
//         const entry = cleanDatabase[i];

//         try {
//           const compareResponse = await fetch(`${NBIS_SERVER_URL}/compare`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//               image1: cleanQueryImage,
//               image2: entry.imageData,           // ✅ matches the key we set above
//               is_duplicate_check: is_duplicate_check ?? true
//             }),
//             signal: AbortSignal.timeout(60000)   // ✅ 60s for cold-start tolerance
//           });

//           if (compareResponse.ok) {
//             const compareResult = await compareResponse.json();

//             if (compareResult.success && compareResult.matched && compareResult.score > highestScore) {
//               highestScore = compareResult.score;
//               bestMatch = {
//                 id: entry.id,
//                 studentId: entry.studentId,
//                 matricNumber: entry.matricNumber,
//                 studentName: entry.studentName,
//                 fingerName: entry.fingerName,
//                 student: entry.student,
//                 score: compareResult.score,
//                 confidence: compareResult.confidence
//               };
//             }
//           }
//         } catch (compareError) {
//           console.error(`Error comparing entry ${i}:`, compareError.message);
//           continue;
//         }
//       }

//       console.log(`✅ Fallback comparison complete`);
//       console.log(`🎯 Best match score: ${highestScore}`);

//       return NextResponse.json({
//         success: true,
//         matched: !!bestMatch,
//         bestMatch: bestMatch,
//         totalCompared: cleanDatabase.length,
//         method: 'NBIS_SEQUENTIAL_FALLBACK'
//       });
//     }

//   } catch (error) {
//     console.error('❌ Batch verification error:', error);

//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }

// app/api/fingerprint/verify-batch/route.js
import { NextResponse } from 'next/server';

const NBIS_SERVER_URL = process.env.NBIS_SERVER_URL || 'https://nbis-server.onrender.com';

// ─── Module-level server warm-up state ───────────────────────────────────────
// Persists across requests within the same Next.js server process
let serverWarmUpPromise = null;
let serverLastKnownAlive = 0;
const SERVER_ALIVE_TTL = 4 * 60 * 1000; // assume alive for 4 min after last success

/**
 * Proactively wake the NBIS server.
 * Called once per cold-start period; subsequent callers await the same promise.
 */
function ensureServerWarm() {
  const now = Date.now();

  // Already known-alive recently — skip ping
  if (now - serverLastKnownAlive < SERVER_ALIVE_TTL) return Promise.resolve();

  // Deduplicate concurrent warm-up calls
  if (serverWarmUpPromise) return serverWarmUpPromise;

  serverWarmUpPromise = fetch(`${NBIS_SERVER_URL}/health`, {
    signal: AbortSignal.timeout(15000),
  })
    .then(() => {
      serverLastKnownAlive = Date.now();
      console.log('✅ NBIS server warm');
    })
    .catch((e) => {
      console.warn('⚠️ NBIS warm-up ping failed:', e.message);
    })
    .finally(() => {
      serverWarmUpPromise = null;
    });

  return serverWarmUpPromise;
}

// ─── Base64 normaliser ────────────────────────────────────────────────────────
const cleanBase64 = (input) => {
  let b = input;
  if (b.includes('data:image')) b = b.split(',')[1];
  b = b.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (b.length % 4)) % 4;
  if (pad) b += '='.repeat(pad);
  return b;
};

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { queryImage, database, is_duplicate_check } = await request.json();

    if (!queryImage || !database || !Array.isArray(database)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.log(`\n🔍 === BATCH VERIFICATION: 1 vs ${database.length} (${is_duplicate_check ? 'DUPLICATE CHECK' : 'AUTHENTICATION'}) ===`);

    // Kick off warm-up immediately (non-blocking for the rest of the prep work)
    const warmUpTask = ensureServerWarm();

    const cleanQueryImage = cleanBase64(queryImage);

    // FIX: use 'imageData' key — matches Flask db_entry['imageData']
    const cleanDatabase = database.map((entry) => ({
      id: entry.id,
      studentId: entry.studentId,
      matricNumber: entry.matricNumber,
      studentName: entry.studentName,
      fingerName: entry.fingerName,
      imageData: cleanBase64(entry.imageData),   // ✅ was 'image'
      student: entry.student,
    }));

    // Wait for warm-up to complete before hitting the server
    await warmUpTask;

    // ── ATTEMPT 1: Batch endpoint (fastest path) ─────────────────────────────
    console.log('🌐 Calling NBIS /batch-compare...');
    try {
      const nbisResponse = await fetch(`${NBIS_SERVER_URL}/batch-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryImage: cleanQueryImage,            // ✅ camelCase — matches Flask data['queryImage']
          database: cleanDatabase,
          is_duplicate_check: is_duplicate_check ?? false,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      const responseText = await nbisResponse.text();
      console.log('📥 NBIS status:', nbisResponse.status);

      if (nbisResponse.ok) {
        serverLastKnownAlive = Date.now(); // mark alive on success
        const result = JSON.parse(responseText);

        console.log(`✅ Batch done | best score: ${result.bestMatch?.score ?? 'none'}`);

        // Hydrate bestMatch with student info from our clean db
        if (result.bestMatch) {
          const entry = cleanDatabase.find((e) => e.id === result.bestMatch.id);
          if (entry) {
            result.bestMatch.student = entry.student;
            result.bestMatch.matricNumber = entry.matricNumber;
            result.bestMatch.studentName = entry.studentName;
            result.bestMatch.fingerName = entry.fingerName;
          }
        }

        return NextResponse.json({
          success: true,
          matched: !!result.bestMatch,
          bestMatch: result.bestMatch ?? null,
          totalCompared: result.total_compared ?? cleanDatabase.length,
          queryMinutiae: result.query_minutiae,
          method: 'NIST_NBIS_BATCH',
        });
      }

      console.error('❌ NBIS batch error:', responseText.substring(0, 300));
      throw new Error(`NBIS batch failed: ${nbisResponse.status}`);

    } catch (batchError) {
      console.error('❌ Batch call failed:', batchError.message);
      console.log('⚠️ Falling back to parallel sequential comparison...');
    }

    // ── ATTEMPT 2: Parallel sequential fallback ───────────────────────────────
    // Run all comparisons concurrently instead of one-by-one.
    // Each individual call gets a generous timeout for cold-start tolerance.
    console.log(`🔄 Running ${cleanDatabase.length} comparisons in parallel...`);

    const HIGH_CONFIDENCE_SCORE = 200; // early-exit threshold

    // We use a shared flag so the first excellent match can signal others to skip
    let foundExcellent = false;

    const compareOne = async (entry) => {
      if (foundExcellent) return { score: 0, entry }; // skip if already found

      try {
        const res = await fetch(`${NBIS_SERVER_URL}/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image1: cleanQueryImage,
            image2: entry.imageData,                       // ✅ correct key
            is_duplicate_check: is_duplicate_check ?? false,
          }),
          signal: AbortSignal.timeout(60_000),             // ✅ 60s for cold starts
        });

        if (!res.ok) return { score: 0, entry };

        const r = await res.json();
        const score = r.score ?? 0;

        if (score >= HIGH_CONFIDENCE_SCORE) {
          foundExcellent = true; // signal other pending promises to bail early
          console.log(`⚡ Excellent match found early! Score: ${score}`);
        }

        return { score, confidence: r.confidence ?? 0, entry };
      } catch (e) {
        console.warn(`⚠️ Compare failed for entry ${entry.id}:`, e.message);
        return { score: 0, entry };
      }
    };

    // Fire all comparisons simultaneously
    const results = await Promise.all(cleanDatabase.map(compareOne));

    // Pick best
    const best = results.reduce((a, b) => (a.score > b.score ? a : b), { score: 0 });

    console.log(`✅ Parallel fallback complete | best score: ${best.score}`);

    // Determine threshold to decide "matched"
    // Authentication uses 40, duplicate detection uses 80 (mirroring Flask)
    const threshold = (is_duplicate_check ?? false) ? 80 : 40;
    const matched = best.score >= threshold;

    const bestMatch = matched
      ? {
          id: best.entry.id,
          studentId: best.entry.studentId,
          matricNumber: best.entry.matricNumber,
          studentName: best.entry.studentName,
          fingerName: best.entry.fingerName,
          student: best.entry.student,
          score: best.score,
          confidence: best.confidence ?? 0,
        }
      : null;

    if (matched) serverLastKnownAlive = Date.now();

    return NextResponse.json({
      success: true,
      matched,
      bestMatch,
      totalCompared: cleanDatabase.length,
      method: 'NBIS_PARALLEL_FALLBACK',
    });

  } catch (error) {
    console.error('❌ verify-batch top-level error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}