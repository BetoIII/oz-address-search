import { NextResponse } from 'next/server'
import { opportunityZoneService } from '@/lib/services/opportunity-zones'
import { cors } from '@/lib/cors'

interface CacheStatus {
  cache: {
    isAvailable: boolean
    lastUpdated?: string
    nextRefreshDue?: string
    featureCount?: number
    version?: string
    dataHash?: string
  }
  externalStorage: {
    url: string
    accessible: boolean
  }
  system: {
    timestamp: string
    environment: string
  }
}

export async function GET(request: Request) {
  try {
    // API Key validation
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.WEB_APP_API_KEY}`) {
      return cors(
        NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        )
      )
    }

    // Get memory cache metrics
    const cacheMetrics = opportunityZoneService.getCacheMetrics()
    
    // Test external storage accessibility
    const externalUrl = 'https://pub-757ceba6f52a4399beb76c4667a53f08.r2.dev/oz-all.geojson'
    let storageAccessible = false
    try {
      const testResponse = await fetch(externalUrl, { method: 'HEAD' })
      storageAccessible = testResponse.ok
    } catch {
      storageAccessible = false
    }

    const status: CacheStatus = {
      cache: {
        isAvailable: cacheMetrics.isInitialized,
        lastUpdated: cacheMetrics.lastUpdated?.toISOString(),
        nextRefreshDue: cacheMetrics.nextRefreshDue?.toISOString(),
        featureCount: cacheMetrics.featureCount,
        version: cacheMetrics.version,
        dataHash: cacheMetrics.dataHash
      },
      externalStorage: {
        url: externalUrl,
        accessible: storageAccessible
      },
      system: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    }

    return cors(
      NextResponse.json(status, {
        headers: {
          'Cache-Control': 'no-store'
        }
      })
    )

  } catch (error) {
    console.error('Error getting cache status:', error)
    return cors(
      NextResponse.json(
        { error: 'Internal server error' },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store'
          }
        }
      )
    )
  }
} 