#!/usr/bin/env tsx

import { opportunityZoneService } from '../lib/services/opportunity-zones'

async function warmCache() {
  console.log('🔥 Starting cache warmup...')
  
  try {
    await opportunityZoneService.initialize()
    const metrics = opportunityZoneService.getCacheMetrics()
    
    console.log('✅ Cache warmup complete!')
    console.log(`📊 Loaded ${metrics.featureCount} opportunity zones`)
    console.log(`🕒 Last updated: ${metrics.lastUpdated}`)
    console.log(`🆔 Version: ${metrics.version}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Cache warmup failed:', error)
    process.exit(1)
  }
}

warmCache() 