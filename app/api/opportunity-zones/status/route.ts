import { NextResponse } from 'next/server'
import { opportunityZoneService } from '@/lib/services/opportunity-zones'
import { redisService } from '@/lib/services/redis'
import { cors } from '@/lib/cors'

interface CacheStatus {
  memory: {
    isAvailable: boolean
    lastUpdated?: string
    nextRefreshDue?: string
    featureCount?: number
    version?: string
    dataHash?: string
  }
  redis: {
    isConnected: boolean
    isAvailable: boolean
    lastUpdated?: string
    nextRefreshDue?: string
    featureCount?: number
    version?: string
    dataHash?: string
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
    const memoryMetrics = opportunityZoneService.getCacheMetrics()
    
    // Get Redis cache status
    const redisCache = await redisService.getOpportunityZoneCache()

    const status: CacheStatus = {
      memory: {
        isAvailable: memoryMetrics.isInitialized,
        lastUpdated: memoryMetrics.lastUpdated?.toISOString(),
        nextRefreshDue: memoryMetrics.nextRefreshDue?.toISOString(),
        featureCount: memoryMetrics.featureCount,
        version: memoryMetrics.version,
        dataHash: memoryMetrics.dataHash
      },
      redis: {
        isConnected: redisService.isConnected(),
        isAvailable: !!redisCache,
        lastUpdated: redisCache?.metadata.lastUpdated.toISOString(),
        nextRefreshDue: redisCache?.metadata.nextRefreshDue.toISOString(),
        featureCount: redisCache?.metadata.featureCount,
        version: redisCache?.metadata.version,
        dataHash: redisCache?.metadata.dataHash
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