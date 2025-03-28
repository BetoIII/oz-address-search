import fetch from 'node-fetch'
import { OpportunityZoneCheck } from '@/types/api'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface ErrorResponse {
  error: string
  details?: Record<string, any>
}

async function testCORS() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  
  console.log('\n🧪 Testing CORS')
  console.log('==============')

  // Test OPTIONS request
  try {
    console.log('\n📍 Testing OPTIONS request')
    const response = await fetch(`${baseUrl}/api/opportunity-zones/check`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8000',
        'Access-Control-Request-Method': 'POST'
      }
    })

    console.log('Status:', response.status)
    console.log('CORS Headers:')
    console.log('Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'))
    console.log('Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'))
    console.log('Access-Control-Allow-Headers:', response.headers.get('Access-Control-Allow-Headers'))
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  }

  // Test POST request CORS headers
  try {
    console.log('\n📍 Testing POST request CORS headers')
    const response = await fetch(`${baseUrl}/api/opportunity-zones/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WEB_APP_API_KEY}`,
        'Origin': 'http://localhost:8000'
      },
      body: JSON.stringify({
        lat: 40.7128,
        lon: -74.0060
      })
    })

    console.log('Status:', response.status)
    console.log('CORS Headers:')
    console.log('Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'))
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error')
  }
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

async function testRateLimiting() {
  const API_URL = 'http://localhost:3000/api/opportunity-zones/check'
  const WEB_APP_KEY = process.env.WEB_APP_API_KEY || 'test_api_key_123'
  const MCP_SERVER_KEY = process.env.MCP_SERVER_API_KEY || 'mcp_test_api_key_456'

  console.log('🔒 Testing rate limiting...')

  const testPayload = {
    latitude: 40.7128,
    longitude: -74.006
  }

  // Test web app rate limit
  console.log('\n📱 Testing web app rate limit...')
  const webAppResults = await Promise.all(
    Array(70).fill(null).map(() => 
      fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WEB_APP_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      })
    )
  )

  const webAppLimited = webAppResults.some(r => r.status === 429)
  console.log(`Web App Rate Limit Test: ${webAppLimited ? '✅ Rate limited as expected' : '❌ Not rate limited'}`)

  // Test MCP server rate limit (higher limit)
  console.log('\n🖥️  Testing MCP server rate limit...')
  const mcpResults = await Promise.all(
    Array(70).fill(null).map(() => 
      fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MCP_SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      })
    )
  )

  const mcpLimited = mcpResults.some(r => r.status === 429)
  console.log(`MCP Server Rate Limit Test: ${!mcpLimited ? '✅ Not rate limited (higher limit)' : '❌ Rate limited unexpectedly'}`)

  // Test invalid API key
  console.log('\n🔑 Testing invalid API key...')
  const invalidResponse = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testPayload)
  })

  console.log(`Invalid API Key Test: ${invalidResponse.status === 401 ? '✅ Rejected as expected' : '❌ Not rejected'}`)
}

async function testOpportunityZoneCheck() {
  // Test coordinates (mix of opportunity and non-opportunity zones)
  const testPoints = [
    { lat: 40.7128, lon: -74.0060, description: 'New York City' },
    { lat: 40.6782, lon: -73.9442, description: 'Brooklyn' },
    { lat: 40.7282, lon: -73.7949, description: 'Queens' },
    // Known opportunity zones
    { lat: 40.8147, lon: -73.9171, description: 'South Bronx (Known OZ)' },
    { lat: 40.6681, lon: -73.8928, description: 'East New York (Known OZ)' },
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
  await testCORS()
  await testRateLimiting()
}

runTests().catch(console.error) 