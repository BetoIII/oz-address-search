export interface RateLimitConfig {
  // Time window in seconds
  windowSizeInSeconds: number
  // Maximum number of requests per window
  maxRequests: number
  // Optional prefix for keys
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

// In-memory rate limiting storage
interface RateLimitWindow {
  count: number
  windowStart: number
}

class InMemoryRateLimitStore {
  private store = new Map<string, RateLimitWindow>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired windows every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Math.floor(Date.now() / 1000)
    for (const [key, window] of this.store.entries()) {
      // Remove windows older than 10 minutes
      if (now - window.windowStart > 600) {
        this.store.delete(key)
      }
    }
  }

  increment(key: string, windowStart: number): number {
    const existing = this.store.get(key)
    
    if (!existing || existing.windowStart !== windowStart) {
      // New window
      this.store.set(key, { count: 1, windowStart })
      return 1
    } else {
      // Existing window
      existing.count++
      return existing.count
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Global in-memory store
const globalStore = new InMemoryRateLimitStore()

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
    
    try {
      const requestCount = globalStore.increment(key, windowStart)

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