import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { opportunityZoneService } from '@/lib/services/opportunity-zones'

let isInitialized = false
let initializationPromise: Promise<void> | null = null

async function initialize() {
  if (isInitialized) return
  if (initializationPromise) return initializationPromise

  initializationPromise = (async () => {
    try {
      console.log('🚀 Initializing server in middleware...')
      await opportunityZoneService.initialize()
      console.log('✅ Server initialization completed')
      isInitialized = true
    } catch (error) {
      console.error('❌ Server initialization failed:', error)
      throw error
    } finally {
      initializationPromise = null
    }
  })()

  return initializationPromise
}

export async function middleware(request: NextRequest) {
  // Only initialize for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    try {
      await initialize()
    } catch (error) {
      console.error('Middleware initialization error:', error)
      return NextResponse.json(
        { error: 'Service initialization failed' },
        { status: 503 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
} 