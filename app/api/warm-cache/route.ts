import { NextResponse } from 'next/server'
import { opportunityZoneService } from '@/lib/services/opportunity-zones'

export const runtime = 'nodejs'
export const preferredRegion = 'iad1'

export async function POST(request: Request) {
  try {
    console.log('🔥 Cache warmup initiated via API...')

    // Initialize/warmup the cache
    await opportunityZoneService.initialize()

    // Get cache metrics after warmup
    const metrics = opportunityZoneService.getCacheMetrics()

    return NextResponse.json({
      success: true,
      warmedUp: new Date().toISOString(),
      message: 'Cache successfully warmed up',
      metrics: {
        isInitialized: metrics.isInitialized,
        featureCount: metrics.featureCount,
        version: metrics.version,
        dataHash: metrics.dataHash,
        lastUpdated: metrics.lastUpdated,
        nextRefreshDue: metrics.nextRefreshDue
      }
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Error warming up cache:', error)
    return NextResponse.json({ 
      error: 'Cache warmup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also allow GET for easier testing
export async function GET(request: Request) {
  return POST(request)
} 