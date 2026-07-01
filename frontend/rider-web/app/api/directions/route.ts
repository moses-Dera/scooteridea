import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const mode = searchParams.get('mode') || 'bicycling'; // driving, walking, bicycling, transit

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_MAPS_API_KEY in environment variables.");
    return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${encodeURIComponent(mode)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.status !== 'OK') {
      console.error("Google Directions API Error:", data.status, data.error_message);
      return NextResponse.json({ error: data.error_message || 'Failed to fetch directions', status: data.status }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch directions:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
