import fetch from 'node-fetch'

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
      isAvailable: status.cache.isAvailable,
      featureCount: status.cache.featureCount,
      lastUpdated: status.cache.lastUpdated,
      nextRefreshDue: status.cache.nextRefreshDue,
      dataHash: status.cache.dataHash?.substring(0, 8) + '...' // Show first 8 chars
    })
    console.log('External Storage:', {
      url: status.externalStorage.url,
      accessible: status.externalStorage.accessible
    })
    console.log('System:', status.system)

    // Validate expected structure
    if (!status.cache || !status.externalStorage || !status.system) {
      throw new Error('Invalid status response structure')
    }

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

    console.log('\n✅ Cache status test completed successfully')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the test
testCacheStatus().catch(console.error) 