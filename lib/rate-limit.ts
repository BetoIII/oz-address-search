interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Maximum number of unique tokens per interval
}

interface RateLimitStore {
  timestamp: number
  tokens: Set<string>
}

const stores = new Map<string, RateLimitStore>()

export function rateLimit(config: RateLimitConfig) {
  return {
    check: async (limit: number, token: string) => {
      const now = Date.now()
      const windowStart = now - config.interval

      // Clean up old stores
      for (const [key, store] of stores) {
        if (store.timestamp < windowStart) {
          stores.delete(key)
        }
      }

      const tokenCount = stores.get(token)?.tokens.size ?? 0

      if (tokenCount >= limit) {
        throw new Error('Rate limit exceeded')
      }

      let store = stores.get(token)
      if (!store) {
        store = { timestamp: now, tokens: new Set() }
        stores.set(token, store)
      }

      store.tokens.add(now.toString())

      return true
    }
  }
} 