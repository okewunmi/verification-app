import { NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'face-detection-api.up.railway.app';

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_API_URL}/`);
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'API is healthy',
      pythonApi: data
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Python API unavailable'
    }, { status: 503 });
  }
}
