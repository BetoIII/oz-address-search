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

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

export async function POST(request: Request) {
  try {
    // Apply CORS headers
    const response = cors(new NextResponse())

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

    // Rate limiting
    try {
      await limiter.check(50, 'CACHE_TOKEN')
    } catch {
      return cors(
        NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
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
          { status: 400 }
        )
      )
    }

    // Process the request using OpportunityZoneService
    const { lat, lon } = result.data
    const checkResult = await opportunityZoneService.checkPoint(lat, lon)

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

    return cors(NextResponse.json(responseData))

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