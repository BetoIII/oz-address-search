import { NextResponse } from 'next/server'
import { z } from 'zod'
import { OpportunityZoneCheck } from '@/types/api'
import { opportunityZoneService } from '@/lib/services/opportunity-zones'
import { cors } from '@/lib/cors'
import { applyRateLimit } from '@/lib/rate-limit'

export const runtime = 'edge'
export const preferredRegion = 'iad1'

// Input validation schema
const checkRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

// Rate limit configuration
const rateLimitConfig = {
  windowSizeInSeconds: 60, // 1 minute window
  maxRequests: 60, // 60 requests per minute
  keyPrefix: 'oz-check'
}

// Cache configuration
const CACHE_CONTROL_HEADER = process.env.NODE_ENV === 'production'
  ? 'public, max-age=3600, stale-while-revalidate=86400' // 1 hour fresh, 24 hours stale
  : 'no-store' // No caching in development

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

export async function POST(request: Request) {
  try {
    // API Key validation
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return cors(
        NextResponse.json(
          { error: 'Missing API key' },
          { status: 401 }
        )
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')
    if (apiKey !== process.env.WEB_APP_API_KEY && apiKey !== process.env.MCP_SERVER_API_KEY) {
      return cors(
        NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        )
      )
    }

    // Rate limiting based on API key
    const rateLimitInfo = await applyRateLimit(apiKey)
    
    if (!rateLimitInfo.isAllowed) {
      return cors(
        NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            reset: new Date(rateLimitInfo.reset * 1000).toISOString()
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
              'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
              'X-RateLimit-Reset': rateLimitInfo.reset.toString(),
              'Retry-After': Math.ceil(rateLimitInfo.reset - Date.now() / 1000).toString()
            }
          }
        )
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const parseResult = checkRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return cors(
        NextResponse.json(
          { 
            error: 'Invalid request parameters',
            details: parseResult.error.format()
          },
          { 
            status: 400,
            headers: {
              'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
              'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
              'X-RateLimit-Reset': rateLimitInfo.reset.toString()
            }
          }
        )
      )
    }

    const { latitude, longitude } = parseResult.data

    // Check if point is in an opportunity zone
    const result = await opportunityZoneService.checkPoint(latitude, longitude)

    // Generate ETag based on coordinates and data version
    const etag = `"${latitude},${longitude}-${result.metadata.version}"`
    const ifNoneMatch = request.headers.get('if-none-match')

    // If ETag matches, return 304 Not Modified
    if (ifNoneMatch === etag) {
      return cors(
        new NextResponse(null, {
          status: 304,
          headers: {
            'Cache-Control': CACHE_CONTROL_HEADER,
            'ETag': etag
          }
        })
      )
    }

    const responseData: OpportunityZoneCheck = {
      lat: latitude,
      lon: longitude,
      timestamp: new Date().toISOString(),
      isInOpportunityZone: result.isInZone,
      opportunityZoneId: result.zoneId,
      metadata: {
        version: result.metadata.version,
        lastUpdated: result.metadata.lastUpdated.toISOString(),
        featureCount: result.metadata.featureCount
      }
    }

    // Return response with cache headers
    return cors(
      NextResponse.json(responseData, {
        headers: {
          'Cache-Control': CACHE_CONTROL_HEADER,
          'ETag': etag,
          'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
          'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
          'X-RateLimit-Reset': rateLimitInfo.reset.toString()
        }
      })
    )

  } catch (error) {
    console.error('Error processing request:', error)
    return cors(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    )
  }
} 