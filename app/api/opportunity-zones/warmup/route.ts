import { NextResponse } from 'next/server'
import { opportunityZoneService } from '@/lib/services/opportunity-zones'

export const runtime = 'nodejs'
export const preferredRegion = 'iad1'

export async function POST(request: Request) {
  try {
    // API Key validation for manual warmup
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.WEB_APP_API_KEY}`) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401 }
      )
    }

    console.log('🔥 Manual cache warmup initiated...')

    // Initialize/warmup the cache
    await opportunityZoneService.initialize()

    // Get cache metrics after warmup
    const metrics = opportunityZoneService.getCacheMetrics()

    return new NextResponse(
      JSON.stringify({
        success: true,
        warmedUp: new Date().toISOString(),
        message: 'Cache successfully warmed up from external storage',
        metrics: {
          isInitialized: metrics.isInitialized,
          featureCount: metrics.featureCount,
          version: metrics.version,
          dataHash: metrics.dataHash,
          lastUpdated: metrics.lastUpdated,
          nextRefreshDue: metrics.nextRefreshDue
        }
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error warming up cache:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: 'Cache warmup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    )
  }
}

// Also allow GET for easier testing
export async function GET(request: Request) {
  return POST(request)
}