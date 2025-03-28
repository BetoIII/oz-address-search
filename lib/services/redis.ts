import { Redis } from '@upstash/redis'
import type { RBush } from 'rbush'
import type { RBushItem } from './opportunity-zones'

// Redis key prefixes
const KEYS = {
  OPPORTUNITY_ZONES: 'oz:data',
  SPATIAL_INDEX: 'oz:spatial_index',
  METADATA: 'oz:metadata'
} as const

export class RedisService {
  private static instance: RedisService
  private client: Redis
  private readonly cacheKey = 'opportunity-zones'
  private _isConnected = false

  constructor() {
    this.client = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!
    })
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService()
    }
    return RedisService.instance
  }

  getClient(): Redis {
    return this.client
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

  async saveCache(tree: RBush<RBushItem>): Promise<void> {
    try {
      await this.client.set(this.cacheKey, JSON.stringify(tree.toJSON()))
    } catch (error) {
      console.error('Failed to save cache to Redis:', error)
    }
  }

  async loadCache(): Promise<RBush<RBushItem> | null> {
    try {
      const data = await this.client.get<string>(this.cacheKey)
      if (!data) return null

      const tree = new RBush<RBushItem>()
      tree.fromJSON(JSON.parse(data))
      return tree
    } catch (error) {
      console.error('Failed to load cache from Redis:', error)
      return null
    }
  }

  async clearCache(): Promise<void> {
    try {
      await this.client.del(this.cacheKey)
    } catch (error) {
      console.error('Failed to clear Redis cache:', error)
    }
  }
}

export const redisService = RedisService.getInstance() 