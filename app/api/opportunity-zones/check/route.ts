import { NextResponse } from 'next/server'
import { z } from 'zod'
import { OpportunityZoneCheck } from '@/types/api'
import { opportunityZoneService } from '@/lib/services/opportunity-zones'
import { rateLimit } from '@/lib/rate-limit'
import { cors } from '@/lib/cors'

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500
})

// Input validation schema
const checkSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180)
})

// Cache configuration
const CACHE_CONTROL_HEADER = process.env.NODE_ENV === 'production'
  ? 'public, max-age=3600, stale-while-revalidate=86400' // 1 hour fresh, 24 hours stale
  : 'no-store' // No caching in development

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

export async function POST(request: Request) {
  try {
    // Create base response with CORS and cache headers
    const response = cors(new NextResponse())
    response.headers.set('Cache-Control', CACHE_CONTROL_HEADER)

    // API Key validation
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.WEB_APP_API_KEY}`) {
      return cors(
        NextResponse.json(
          { error: 'Invalid API key' },
          { 
            status: 401,
            headers: {
              'Cache-Control': 'no-store'
            }
          }
        )
      )
    }

    // Rate limiting
    try {
      await limiter.check(50, 'CACHE_TOKEN')
    } catch {
      return cors(
        NextResponse.json(
          { error: 'Rate limit exceeded' },
          { 
            status: 429,
            headers: {
              'Cache-Control': 'no-store'
            }
          }
        )
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const result = checkSchema.safeParse(body)

    if (!result.success) {
      return cors(
        NextResponse.json(
          { 
            error: 'Invalid request parameters',
            details: result.error.format()
          },
          { 
            status: 400,
            headers: {
              'Cache-Control': 'no-store'
            }
          }
        )
      )
    }

    // Process the request using OpportunityZoneService
    const { lat, lon } = result.data
    const checkResult = await opportunityZoneService.checkPoint(lat, lon)

    // Generate ETag based on coordinates and data version
    const etag = `"${lat},${lon}-${checkResult.metadata.version}"`
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
      lat,
      lon,
      timestamp: new Date().toISOString(),
      isInOpportunityZone: checkResult.isInZone,
      opportunityZoneId: checkResult.zoneId,
      metadata: {
        version: checkResult.metadata.version,
        lastUpdated: checkResult.metadata.lastUpdated.toISOString(),
        featureCount: checkResult.metadata.featureCount
      }
    }

    // Return response with cache headers
    return cors(
      NextResponse.json(responseData, {
        headers: {
          'Cache-Control': CACHE_CONTROL_HEADER,
          'ETag': etag
        }
      })
    )

  } catch (error) {
    console.error('Error processing request:', error)
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