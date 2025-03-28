import { redisService } from './services/redis'

export interface RateLimitConfig {
  // Time window in seconds
  windowSizeInSeconds: number
  // Maximum number of requests per window
  maxRequests: number
  // Optional prefix for Redis keys
  keyPrefix?: string
}

export interface RateLimitInfo {
  // Whether the request is allowed
  isAllowed: boolean
  // Number of remaining requests in the current window
  remaining: number
  // When the current window resets (Unix timestamp)
  reset: number
  // Total requests allowed per window
  limit: number
}

// Different rate limits for different API keys
const API_KEY_CONFIGS = {
  WEB_APP: {
    windowSizeInSeconds: 60, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyPrefix: 'ratelimit:webapp'
  },
  MCP_SERVER: {
    windowSizeInSeconds: 60, // 1 minute
    maxRequests: 300, // 300 requests per minute (higher limit for server)
    keyPrefix: 'ratelimit:mcp'
  }
} as const

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowSizeInSeconds: 60,
      maxRequests: 60,
      keyPrefix: 'ratelimit',
      ...config
    }
  }

  private getKey(identifier: string): string {
    return `${this.config.keyPrefix}:${identifier}`
  }

  async checkLimit(identifier: string): Promise<RateLimitInfo> {
    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - (now % this.config.windowSizeInSeconds)
    const key = this.getKey(identifier)
    
    // If Redis is not available, fallback to allowing the request
    if (!redisService.isConnected()) {
      console.warn('⚠️ Redis not available for rate limiting, allowing request')
      return {
        isAllowed: true,
        remaining: this.config.maxRequests - 1,
        reset: windowStart + this.config.windowSizeInSeconds,
        limit: this.config.maxRequests
      }
    }

    try {
      const client = redisService.getClient()
      if (!client) throw new Error('Redis client not available')

      const pipeline = client.pipeline()
      const windowKey = `${key}:${windowStart}`

      // Increment the counter for the current window
      pipeline.incr(windowKey)
      // Set expiration for the window key
      pipeline.expire(windowKey, this.config.windowSizeInSeconds * 2)
      
      const results = await pipeline.exec()
      if (!results) throw new Error('Failed to execute Redis pipeline')

      const requestCount = results[0][1] as number

      const isAllowed = requestCount <= this.config.maxRequests
      const remaining = Math.max(0, this.config.maxRequests - requestCount)
      const reset = windowStart + this.config.windowSizeInSeconds

      return {
        isAllowed,
        remaining,
        reset,
        limit: this.config.maxRequests
      }
    } catch (error) {
      console.error('Error checking rate limit:', error)
      // On error, fallback to allowing the request
      return {
        isAllowed: true,
        remaining: this.config.maxRequests - 1,
        reset: windowStart + this.config.windowSizeInSeconds,
        limit: this.config.maxRequests
      }
    }
  }
}

// Helper function to determine rate limit config based on API key
export function getRateLimitConfigForApiKey(apiKey: string): RateLimitConfig {
  if (apiKey === process.env.WEB_APP_API_KEY) {
    return API_KEY_CONFIGS.WEB_APP
  } else if (apiKey === process.env.MCP_SERVER_API_KEY) {
    return API_KEY_CONFIGS.MCP_SERVER
  }
  // Default to web app config for unknown keys (they'll be rejected by auth anyway)
  return API_KEY_CONFIGS.WEB_APP
}

// Helper function to apply rate limiting to a request
export async function applyRateLimit(
  apiKey: string
): Promise<RateLimitInfo> {
  const config = getRateLimitConfigForApiKey(apiKey)
  const limiter = new RateLimiter(config)
  return limiter.checkLimit(apiKey)
} 