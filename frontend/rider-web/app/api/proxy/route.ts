import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"

/**
 * BFF (Backend For Frontend) proxy
 * Forwards authenticated requests to backend services
 * All requests include the JWT token from the session
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession()
  const { pathname, search } = new URL(req.url)
  
  // Extract the path after /api/proxy
  const targetPath = pathname.replace('/api/proxy', '')
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'}${targetPath}${search}`
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  // Add JWT from session if available
  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`
  }
  
  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    })
    
    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })
  } catch (err) {
    console.error('BFF proxy error:', err)
    return NextResponse.json(
      { error: 'Backend request failed' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const { pathname, search } = new URL(req.url)
  
  const targetPath = pathname.replace('/api/proxy', '')
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'}${targetPath}${search}`
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`
  }
  
  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: await req.text(),
      credentials: 'include',
    })
    
    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })
  } catch (err) {
    console.error('BFF proxy error:', err)
    return NextResponse.json(
      { error: 'Backend request failed' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  const { pathname, search } = new URL(req.url)
  
  const targetPath = pathname.replace('/api/proxy', '')
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'}${targetPath}${search}`
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`
  }
  
  try {
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers,
      body: await req.text(),
      credentials: 'include',
    })
    
    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })
  } catch (err) {
    console.error('BFF proxy error:', err)
    return NextResponse.json(
      { error: 'Backend request failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession()
  const { pathname, search } = new URL(req.url)
  
  const targetPath = pathname.replace('/api/proxy', '')
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'}${targetPath}${search}`
  
  const headers: HeadersInit = {}
  
  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`
  }
  
  try {
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    })
    
    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })
  } catch (err) {
    console.error('BFF proxy error:', err)
    return NextResponse.json(
      { error: 'Backend request failed' },
      { status: 500 }
    )
  }
}

