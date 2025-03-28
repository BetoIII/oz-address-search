import { config } from 'dotenv'
import { resolve } from 'path'
import { initializeServer } from '../lib/init-server'
import { redisService } from '../lib/services/redis'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function init() {
  try {
    console.log('🚀 Starting server initialization...')
    
    // Force Redis to reinitialize with loaded environment variables
    if (process.env.REDIS_URL) {
      console.log('🔄 Reinitializing Redis connection...')
      // @ts-ignore - Accessing private method for initialization
      redisService['initializeClient']()
      
      // Wait a bit for Redis to connect
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    await initializeServer()
    console.log('✅ Server initialization completed successfully')
  } catch (error) {
    console.error('❌ Server initialization failed:', error)
    process.exit(1)
  }
}

init().catch(console.error) 