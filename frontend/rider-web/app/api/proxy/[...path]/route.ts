import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

/**
 * BFF Proxy for dynamic routes
 * /api/proxy/docks/list → http://backend:3001/docks/list
 */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);
  console.log('[Proxy GET] Session:', session);
  const targetPath = '/' + (params.path || []).join('/');
  const queryString = req.nextUrl.search || '';
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80').replace(/\/+$/, '');
  const backendUrl = `${baseUrl}${targetPath}${queryString}`;

  const headers: HeadersInit = {};

  if ((session as any)?.error === 'RefreshAccessTokenError') {
    return NextResponse.json({ error: 'Session Expired' }, { status: 401 });
  }

  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
  }

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    if (!response.ok) {
      console.error(`[Proxy GET] Backend returned ${response.status}:`, text);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error('[Proxy GET] Fetch failed:', err);
    return NextResponse.json(
      { error: 'Proxy Request failed', details: err.message, backendUrl },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);
  const targetPath = '/' + (params.path || []).join('/');
  const queryString = req.nextUrl.search || '';
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80').replace(/\/+$/, '');
  const backendUrl = `${baseUrl}${targetPath}${queryString}`;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if ((session as any)?.error === 'RefreshAccessTokenError') {
    return NextResponse.json({ error: 'Session Expired' }, { status: 401 });
  }

  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
  }

  try {
    const csrfRes = await fetch(`${baseUrl}/auth/csrf-token`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const cookies = csrfRes.headers.get('set-cookie');
    
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
    if (cookies) {
      headers['cookie'] = cookies;
    }

    const body = await req.json().catch(() => ({}));
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    if (!response.ok) {
      console.error(`[Proxy POST] Backend returned ${response.status}:`, text);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error('[Proxy POST] Fetch failed:', err);
    return NextResponse.json(
      { error: 'Proxy Request failed', details: err.message, backendUrl },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);
  const targetPath = '/' + (params.path || []).join('/');
  const queryString = req.nextUrl.search || '';
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80').replace(/\/+$/, '');
  const backendUrl = `${baseUrl}${targetPath}${queryString}`;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if ((session as any)?.error === 'RefreshAccessTokenError') {
    return NextResponse.json({ error: 'Session Expired' }, { status: 401 });
  }

  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
  }

  try {
    const csrfRes = await fetch(`${baseUrl}/auth/csrf-token`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const cookies = csrfRes.headers.get('set-cookie');
    
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
    if (cookies) {
      headers['cookie'] = cookies;
    }

    const body = await req.json().catch(() => ({}));
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    if (!response.ok) {
      console.error(`[Proxy PUT] Backend returned ${response.status}:`, text);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error('[Proxy PUT] Fetch failed:', err);
    return NextResponse.json(
      { error: 'Proxy Request failed', details: err.message, backendUrl },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);
  const targetPath = '/' + (params.path || []).join('/');
  const queryString = req.nextUrl.search || '';
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80').replace(/\/+$/, '');
  const backendUrl = `${baseUrl}${targetPath}${queryString}`;

  const headers: HeadersInit = {};

  if ((session as any)?.error === 'RefreshAccessTokenError') {
    return NextResponse.json({ error: 'Session Expired' }, { status: 401 });
  }

  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
  }

  try {
    const csrfRes = await fetch(`${baseUrl}/auth/csrf-token`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const cookies = csrfRes.headers.get('set-cookie');
    
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
    if (cookies) {
      headers['cookie'] = cookies;
    }

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    if (!response.ok) {
      console.error(`[Proxy DELETE] Backend returned ${response.status}:`, text);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error('[Proxy DELETE] Fetch failed:', err);
    return NextResponse.json(
      { error: 'Proxy Request failed', details: err.message, backendUrl },
      { status: 500 },
    );
  }
}
