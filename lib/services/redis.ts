import Redis from 'ioredis'
import { CacheState, RBushItem } from './opportunity-zones'
import RBush from 'rbush'

// Redis key prefixes
const KEYS = {
  OPPORTUNITY_ZONES: 'oz:data',
  SPATIAL_INDEX: 'oz:spatial_index',
  METADATA: 'oz:metadata'
} as const

class RedisService {
  private static instance: RedisService
  private client: Redis | null = null
  private _isConnected = false

  private constructor() {
    this.initializeClient()
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService()
    }
    return RedisService.instance
  }

  getClient(): Redis | null {
    return this.client
  }

  private initializeClient() {
    const redisUrl = process.env.REDIS_URL

    if (!redisUrl) {
      console.warn('⚠️ REDIS_URL not configured, Redis caching will be disabled')
      return
    }

    this.client = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: 3
    })

    this.client.on('connect', () => {
      console.log('✅ Connected to Redis')
      this._isConnected = true
    })

    this.client.on('error', (error: Error) => {
      console.error('❌ Redis connection error:', error)
      this._isConnected = false
    })
  }

  isConnected(): boolean {
    return this._isConnected
  }

  async saveOpportunityZoneCache(cache: CacheState): Promise<boolean> {
    if (!this.client || !this._isConnected) return false

    try {
      const pipeline = this.client.pipeline()

      // Save GeoJSON data
      pipeline.set(
        KEYS.OPPORTUNITY_ZONES,
        JSON.stringify(cache.geoJson),
        'EX',
        24 * 60 * 60 // 24 hours
      )

      // Save spatial index
      pipeline.set(
        KEYS.SPATIAL_INDEX,
        JSON.stringify(cache.spatialIndex.toJSON()),
        'EX',
        24 * 60 * 60
      )

      // Save metadata
      pipeline.set(
        KEYS.METADATA,
        JSON.stringify(cache.metadata),
        'EX',
        24 * 60 * 60
      )

      await pipeline.exec()
      return true
    } catch (error) {
      console.error('Error saving to Redis:', error)
      return false
    }
  }

  async getOpportunityZoneCache(): Promise<CacheState | null> {
    if (!this.client || !this._isConnected) return null

    try {
      const pipeline = this.client.pipeline()
      pipeline.get(KEYS.OPPORTUNITY_ZONES)
      pipeline.get(KEYS.SPATIAL_INDEX)
      pipeline.get(KEYS.METADATA)

      const results = await pipeline.exec()
      if (!results) return null

      // Check if any of the keys are missing
      const [geoJsonResult, spatialIndexResult, metadataResult] = results
      if (!geoJsonResult?.[1] || !spatialIndexResult?.[1] || !metadataResult?.[1]) {
        return null
      }

      const geoJson = JSON.parse(geoJsonResult[1] as string)
      const spatialIndexData = JSON.parse(spatialIndexResult[1] as string)
      const metadata = JSON.parse(metadataResult[1] as string)

      // Reconstruct RBush index
      const spatialIndex = new RBush<RBushItem>()
      spatialIndex.fromJSON(spatialIndexData)

      // Convert metadata dates back to Date objects
      metadata.lastUpdated = new Date(metadata.lastUpdated)
      metadata.nextRefreshDue = new Date(metadata.nextRefreshDue)

      return {
        geoJson,
        spatialIndex,
        metadata
      }
    } catch (error) {
      console.error('Error retrieving from Redis:', error)
      return null
    }
  }

  async clearOpportunityZoneCache(): Promise<boolean> {
    if (!this.client || !this._isConnected) return false

    try {
      await this.client.del(
        KEYS.OPPORTUNITY_ZONES,
        KEYS.SPATIAL_INDEX,
        KEYS.METADATA
      )
      return true
    } catch (error) {
      console.error('Error clearing Redis cache:', error)
      return false
    }
  }
}

export const redisService = RedisService.getInstance() 