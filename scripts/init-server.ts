import { config } from 'dotenv'
import { resolve } from 'path'
import { initializeServer } from '../lib/init-server'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function init() {
  try {
    console.log('🚀 Starting server initialization...')
    await initializeServer()
    console.log('✅ Server initialization completed successfully')
  } catch (error) {
    console.error('❌ Server initialization failed:', error)
    process.exit(1)
  }
}

init().catch(console.error) 