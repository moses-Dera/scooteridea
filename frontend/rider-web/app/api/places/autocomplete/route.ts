import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  
  if (!query) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_MAPS_API_KEY in environment variables.");
    return NextResponse.json({ error: 'Missing Google Maps API Key' }, { status: 500 });
  }

  try {
    // Bias results globally, but prioritize the user's location if provided (50km radius)
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}`;
    if (lat && lng) {
      url += `&location=${lat},${lng}&radius=50000`;
    }
    
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}
