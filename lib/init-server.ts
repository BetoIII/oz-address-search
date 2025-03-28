import { opportunityZoneService } from './services/opportunity-zones'

export async function initializeServer() {
  console.log('🚀 Initializing server...')

  try {
    // Pre-load opportunity zones data
    console.log('📍 Pre-loading opportunity zones data...')
    await opportunityZoneService.initialize()
    console.log('✅ Opportunity zones data loaded successfully')

    // Add any other initialization tasks here

  } catch (error) {
    console.error('❌ Server initialization failed:', error)
    throw error
  }
} 