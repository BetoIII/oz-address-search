import { opportunityZoneService } from './services/opportunity-zones'

interface InitOptions {
  skipCacheWarm?: boolean
  maxRetries?: number
  retryDelay?: number
}

const DEFAULT_OPTIONS: Required<InitOptions> = {
  skipCacheWarm: false,
  maxRetries: 3,
  retryDelay: 5000 // 5 seconds
}

async function warmCache(retries = 0, maxRetries: number, retryDelay: number): Promise<void> {
  try {
    console.log('🔥 Warming up cache from external storage...')
    
    // Initialize the opportunity zone service (loads from external storage)
    await opportunityZoneService.initialize()

    // Verify cache state after warming
    const metrics = opportunityZoneService.getCacheMetrics()
    if (!metrics.isInitialized) {
      throw new Error('Cache warming failed: Cache not initialized')
    }

    console.log(`✅ Cache warming complete. Loaded ${metrics.featureCount} features`)
    console.log(`📊 Cache version: ${metrics.version}`)
    console.log(`⏰ Next refresh due: ${metrics.nextRefreshDue?.toISOString()}`)

  } catch (error) {
    console.error('❌ Cache warming failed:', error)
    
    if (retries < maxRetries) {
      console.log(`🔄 Retrying in ${retryDelay/1000} seconds... (${retries + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      await warmCache(retries + 1, maxRetries, retryDelay)
    } else {
      throw new Error(`Cache warming failed after ${maxRetries} attempts`)
    }
  }
}

export async function initializeServer(options: InitOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  console.log('🚀 Starting server initialization (non-blocking)...')

  // Start cache warming in background without blocking server startup
  if (!opts.skipCacheWarm) {
    console.log('🔥 Starting cache warm-up in background...')
    warmCache(0, opts.maxRetries, opts.retryDelay)
      .then(() => {
        console.log('✅ Background cache warm-up completed')
      })
      .catch((error) => {
        console.error('❌ Background cache warm-up failed:', error)
      })
  } else {
    console.log('⏩ Skipping cache warm-up')
  }

  console.log('✅ Server initialization completed (cache warming in background)')
} 