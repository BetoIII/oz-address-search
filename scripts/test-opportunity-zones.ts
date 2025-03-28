import fetch from 'node-fetch'
import { OpportunityZoneCheck } from '@/types/api'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface ErrorResponse {
  error: string
  details?: Record<string, any>
}

async function testErrorCases() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  const testPoint = { lat: 40.7128, lon: -74.0060 }

  console.log('\n🧪 Testing Error Cases')
  console.log('=====================')

  // Test invalid API key
  try {
    console.log('\n📍 Testing invalid API key')
    const response = await fetch(`${baseUrl}/api/opportunity-zones/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_key'
      },
      body: JSON.stringify(testPoint)
    })

    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  }

  // Test rate limiting
  console.log('\n📍 Testing rate limiting')
  const promises = Array(60).fill(null).map(() => 
    fetch(`${baseUrl}/api/opportunity-zones/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WEB_APP_API_KEY}`
      },
      body: JSON.stringify(testPoint)
    })
  )

  try {
    const responses = await Promise.all(promises)
    const rateLimitedCount = responses.filter(r => r.status === 429).length
    console.log(`Rate limited responses: ${rateLimitedCount}`)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  }
}

async function testOpportunityZoneCheck() {
  // Test coordinates (mix of opportunity and non-opportunity zones)
  const testPoints = [
    { lat: 40.7128, lon: -74.0060, description: 'New York City' },
    { lat: 40.6782, lon: -73.9442, description: 'Brooklyn' },
    { lat: 40.7282, lon: -73.7949, description: 'Queens' },
    // Known opportunity zones
    { lat: 29.4201678, lon: -98.493801, description: '24 Dwyer Ave, San Antonio, TX 78204' },
    { lat: 34.0295879, lon: -118.2312132, description: '2432 E 8th St, Los Angeles, CA 90021' },
    // Edge cases
    { lat: 90, lon: 180, description: 'Edge case: Max coordinates' },
    { lat: -90, lon: -180, description: 'Edge case: Min coordinates' },
    { lat: 0, lon: 0, description: 'Edge case: Null Island' }
  ]

  const apiKey = process.env.WEB_APP_API_KEY || 'test_api_key_123'
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  console.log('🧪 Testing Opportunity Zone Check API')
  console.log('=====================================')

  for (const point of testPoints) {
    try {
      console.log(`\n📍 Testing point: ${point.description}`)
      console.log(`Coordinates: ${point.lat}, ${point.lon}`)

      const response = await fetch(`${baseUrl}/api/opportunity-zones/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          lat: point.lat,
          lon: point.lon
        })
      })

      const data = await response.json() as OpportunityZoneCheck | ErrorResponse

      if (!response.ok) {
        console.log('❌ Error:', 'error' in data ? data.error : 'Unknown error')
        if ('details' in data && data.details) {
          console.log('Details:', JSON.stringify(data.details, null, 2))
        }
        continue
      }

      console.log('✅ Response:', JSON.stringify(data, null, 2))

    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

// Run the tests
async function runTests() {
  await testOpportunityZoneCheck()
  await testErrorCases()
}

runTests().catch(console.error) 