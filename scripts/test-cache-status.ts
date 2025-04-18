import fetch from 'node-fetch'

interface CacheStatus {
  memory: {
    isAvailable: boolean
    lastUpdated?: string
    nextRefreshDue?: string
    featureCount?: number
    version?: string
  }
  redis: {
    isConnected: boolean
    isAvailable: boolean
    lastUpdated?: string
    nextRefreshDue?: string
    featureCount?: number
    version?: string
  }
  system: {
    timestamp: string
    environment: string
  }
}

async function testCacheStatus() {
  const API_URL = 'http://localhost:3000/api/opportunity-zones/status'
  const API_KEY = process.env.TEST_API_KEY || process.env.WEB_APP_API_KEY
  if (!API_KEY) {
    throw new Error('TEST_API_KEY or WEB_APP_API_KEY environment variable is required')
  }

  console.log('🔍 Testing cache status endpoint...')

  try {
    // Test with valid API key
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const status = await response.json() as CacheStatus
    console.log('\n📊 Cache Status:')
    console.log('Memory Cache:', {
      isAvailable: status.memory.isAvailable,
      featureCount: status.memory.featureCount,
      lastUpdated: status.memory.lastUpdated,
      nextRefreshDue: status.memory.nextRefreshDue
    })
    console.log('Redis Cache:', {
      isConnected: status.redis.isConnected,
      isAvailable: status.redis.isAvailable,
      featureCount: status.redis.featureCount,
      lastUpdated: status.redis.lastUpdated,
      nextRefreshDue: status.redis.nextRefreshDue
    })
    console.log('System:', status.system)

    // Test with invalid API key
    console.log('\n🔒 Testing authentication...')
    const invalidResponse = await fetch(API_URL, {
      headers: {
        'Authorization': 'Bearer invalid_key'
      }
    })

    if (invalidResponse.status === 401) {
      console.log('✅ Authentication check passed')
    } else {
      console.log('❌ Authentication check failed')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testCacheStatus().catch(console.error) 