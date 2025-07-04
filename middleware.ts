import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Simple middleware that just passes through
  // Let individual endpoints handle their own initialization
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
} 