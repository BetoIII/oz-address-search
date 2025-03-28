import { initializeServer } from '@/lib/init-server'

// Initialize server when this module is imported
initializeServer().catch(console.error)

// Export an empty object to satisfy module requirements
export {} 