import { NextRequest, NextResponse } from 'next/server';

// Shared comparison function
function compareTemplatesServer(template1: string, template2: string): { 
  matched: boolean; 
  similarity: number; 
  threshold: number;
  method: string;
} {
  // ... (same implementation as above)
}

// Route handlers for different methods
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  if (pathname === '/api/fingerprint/match') {
    // Handle match endpoint
    return handleMatch(request);
  } else if (pathname === '/api/fingerprint/check-duplicates') {
    // Handle check-duplicates endpoint
    return handleCheckDuplicates(request);
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  if (pathname === '/api/fingerprint/health') {
    return NextResponse.json({ 
      status: 'ok', 
      service: 'fingerprint-matching',
      method: 'server-heuristic',
      note: 'For production, integrate with DigitalPersona Server or gRPC Fingerprint Engine'
    });
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

async function handleMatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { template1, template2 } = body;
    
    if (!template1 || !template2) {
      return NextResponse.json({ 
        error: 'Both template1 and template2 are required',
        matched: false 
      }, { status: 400 });
    }

    console.log(`🔍 Server matching: ${template1.length} chars vs ${template2.length} chars`);
    
    const result = compareTemplatesServer(template1, template2);
    
    console.log(`📊 Result: matched=${result.matched}, similarity=${result.similarity.toFixed(1)}%`);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Match error:', error);
    return NextResponse.json({ 
      error: 'Matching failed',
      matched: false 
    }, { status: 500 });
  }
}

async function handleCheckDuplicates(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, existingTemplates, threshold = 65 } = body;
    
    if (!template) {
      return NextResponse.json({ error: 'Template is required' }, { status: 400 });
    }

    if (!Array.isArray(existingTemplates)) {
      return NextResponse.json({ error: 'existingTemplates must be an array' }, { status: 400 });
    }

    console.log(`🔍 Checking against ${existingTemplates.length} templates (threshold: ${threshold}%)`);

    const duplicates: Array<{
      id: string;
      studentName: string;
      fingerName: string;
      similarity: number;
    }> = [];

    for (const existing of existingTemplates) {
      if (!existing.template) continue;
      
      const result = compareTemplatesServer(template, existing.template);
      
      if (result.matched && result.similarity >= threshold) {
        duplicates.push({
          id: existing.id || existing.studentId,
          studentName: existing.studentName || 'Unknown',
          fingerName: existing.fingerName || 'Unknown',
          similarity: result.similarity
        });
      }
    }

    const hasDuplicates = duplicates.length > 0;
    
    console.log(hasDuplicates 
      ? `❌ Found ${duplicates.length} duplicate(s)` 
      : '✅ No duplicates found'
    );

    return NextResponse.json({
      hasDuplicates,
      duplicates,
      totalChecked: existingTemplates.length
    });
    
  } catch (error) {
    console.error('❌ Duplicate check error:', error);
    return NextResponse.json({ 
      error: 'Duplicate check failed',
      hasDuplicates: false,
      duplicates: []
    }, { status: 500 });
  }
}