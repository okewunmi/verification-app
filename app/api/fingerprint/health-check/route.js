// app/api/fingerprint/health-check/route.js
import { NextResponse } from 'next/server';

const NBIS_SERVER_URL = process.env.NBIS_SERVER_URL || 'https://nbis-server.onrender.com';

export async function GET() {
  try {
    const res = await fetch(`${NBIS_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(90_000), // up to 90s for Render cold start
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ ready: true, ...data });
    }

    return NextResponse.json({ ready: false }, { status: 503 });
  } catch (e) {
    return NextResponse.json({ ready: false, error: e.message }, { status: 503 });
  }
}