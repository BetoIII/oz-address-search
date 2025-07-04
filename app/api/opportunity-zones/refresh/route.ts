import { NextResponse } from 'next/server'
import { opportunityZoneService } from '@/lib/services/opportunity-zones'

export const runtime = 'nodejs'
export const preferredRegion = 'iad1'

export async function GET(request: Request) {
  try {
    // Verify cron secret to ensure only Vercel can trigger this endpoint
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
    }

    // Force refresh of opportunity zones data
    await opportunityZoneService.forceRefresh()

    // Get cache metrics after refresh
    const metrics = opportunityZoneService.getCacheMetrics()

    return new NextResponse(
      JSON.stringify({
        success: true,
        refreshed: new Date().toISOString(),
        metrics: {
          featureCount: metrics.featureCount,
          version: metrics.version,
          dataHash: metrics.dataHash,
          nextRefreshDue: metrics.nextRefreshDue
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error refreshing opportunity zones data:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    )
  }
} 