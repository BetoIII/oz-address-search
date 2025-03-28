import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Get allowed origins from environment variables or use defaults for development
const getAllowedOrigins = () => {
  const webAppOrigin = process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000'
  const mcpServerOrigin = process.env.MCP_SERVER_URL || 'http://localhost:8000'
  return new Set([webAppOrigin, mcpServerOrigin])
}

export function cors(response: NextResponse) {
  const allowedOrigins = getAllowedOrigins()
  const origin = process.env.NODE_ENV === 'development' 
    ? '*' // Allow all origins in development
    : Array.from(allowedOrigins).join(', ') // Specific origins in production

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  )
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  return response
} 