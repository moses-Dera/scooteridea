import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"

/**
 * BFF Proxy for dynamic routes
 * /api/proxy/docks/list → http://backend:3001/docks/list
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession()
  const targetPath = '/' + (params.path || []).join('/')
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${targetPath}`
  
  const headers: HeadersInit = {}
  
  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`
  }
  
  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession()
  const targetPath = '/' + (params.path || []).join('/')
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${targetPath}`
  
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  
  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`
  }
  
  try {
    const body = await req.json().catch(() => ({}))
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession()
  const targetPath = '/' + (params.path || []).join('/')
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${targetPath}`
  
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  
  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`
  }
  
  try {
    const body = await req.json().catch(() => ({}))
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession()
  const targetPath = '/' + (params.path || []).join('/')
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${targetPath}`
  
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
    
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
