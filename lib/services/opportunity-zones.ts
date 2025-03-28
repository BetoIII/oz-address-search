import RBush from 'rbush'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import { redisService } from './redis'

// Type for the log function
type LogFn = (type: "info" | "success" | "warning" | "error", message: string) => void;

// Default log function that just uses console
const defaultLog: LogFn = (type, message) => {
  console.log(`[${type}] ${message}`);
};

interface SpatialIndexMetadata {
  version: string
  lastUpdated: Date
  featureCount: number
  nextRefreshDue: Date
}

export interface RBushItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  feature: any
  index: number
}

export interface CacheState {
  spatialIndex: RBush<RBushItem>
  metadata: SpatialIndexMetadata
  geoJson: any
}

class OpportunityZoneService {
  private static instance: OpportunityZoneService
  private cache: CacheState | null = null
  private isInitializing = false
  private initPromise: Promise<void> | null = null
  private refreshInterval: NodeJS.Timeout | null = null
  private readonly REFRESH_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
  private readonly REFRESH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    // Start the refresh check timer
    this.startRefreshChecker()
  }

  static getInstance(): OpportunityZoneService {
    if (!OpportunityZoneService.instance) {
      OpportunityZoneService.instance = new OpportunityZoneService()
    }
    return OpportunityZoneService.instance
  }

  private async loadOpportunityZones(log: LogFn = defaultLog): Promise<any> {
    const url = process.env.OPPORTUNITY_ZONES_URL
    
    if (!url) {
      throw new Error('Opportunity zones URL not configured')
    }
    
    log("info", `🔗 Fetching opportunity zones data from ${url}`)
    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data?.features?.length) {
      throw new Error('Invalid GeoJSON format: missing features array')
    }

    return this.optimizeGeoJson(data)
  }

  private optimizeGeoJson(geoJson: any) {
    return {
      type: 'FeatureCollection',
      features: geoJson.features.map((feature: any) => ({
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          GEOID: feature.properties?.GEOID
        }
      }))
    }
  }

  private calculateBBox(geometry: any) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    function processCoordinates(coords: [number, number]) {
      const [lon, lat] = coords
      minX = Math.min(minX, lon)
      minY = Math.min(minY, lat)
      maxX = Math.max(maxX, lon)
      maxY = Math.max(maxY, lat)
    }

    function processGeometry(geom: any) {
      if (geom.type === 'Polygon') {
        geom.coordinates[0].forEach((coord: [number, number]) => processCoordinates(coord))
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((polygon: [number, number][][]) => 
          polygon[0].forEach((coord: [number, number]) => processCoordinates(coord))
        )
      }
    }

    processGeometry(geometry)
    return [minX, minY, maxX, maxY]
  }

  private createSpatialIndex(geoJson: any): RBush<RBushItem> {
    const tree = new RBush<RBushItem>()
    const items = geoJson.features.map((feature: any, index: number) => {
      const bbox = feature.bbox || this.calculateBBox(feature.geometry)
      return {
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3],
        feature,
        index
      }
    })
    tree.load(items)
    return tree
  }

  private startRefreshChecker() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }

    // Set up periodic refresh check
    this.refreshInterval = setInterval(async () => {
      try {
        if (this.cache && new Date() >= this.cache.metadata.nextRefreshDue) {
          await this.refresh(defaultLog)
        }
      } catch (error) {
        console.error('Error in refresh check:', error)
      }
    }, this.REFRESH_CHECK_INTERVAL)

    // Ensure the interval doesn't prevent the process from exiting
    if (this.refreshInterval.unref) {
      this.refreshInterval.unref()
    }
  }

  private async refresh(log: LogFn = defaultLog): Promise<void> {
    log("info", "🔄 Refreshing opportunity zone data...")
    
    try {
      const geoJson = await this.loadOpportunityZones(log)
      const spatialIndex = this.createSpatialIndex(geoJson)
      
      this.cache = {
        spatialIndex,
        geoJson,
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date(),
          featureCount: geoJson.features.length,
          nextRefreshDue: new Date(Date.now() + this.REFRESH_INTERVAL)
        }
      }

      // Save to Redis as backup
      await redisService.saveOpportunityZoneCache(this.cache)

      log("success", `✅ Refresh complete. Loaded ${geoJson.features.length} features`)
    } catch (error) {
      log("error", `❌ Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  async initialize(log: LogFn = defaultLog): Promise<void> {
    // If already initialized with valid cache, return immediately
    if (this.cache && new Date() < this.cache.metadata.nextRefreshDue) {
      return
    }

    // If initialization is in progress, wait for it
    if (this.isInitializing) {
      return this.initPromise!
    }

    this.isInitializing = true
    
    try {
      // Try to load from Redis first
      log("info", "🔍 Checking Redis for cached data...")
      const redisCache = await redisService.getOpportunityZoneCache()
      
      if (redisCache && new Date() < redisCache.metadata.nextRefreshDue) {
        log("success", "✅ Loaded data from Redis cache")
        this.cache = redisCache
        return
      }

      // If Redis cache is missing or expired, refresh from source
      this.initPromise = this.refresh(log)
      await this.initPromise
    } finally {
      this.isInitializing = false
    }
  }

  async checkPoint(lat: number, lon: number, log: LogFn = defaultLog): Promise<{
    isInZone: boolean,
    zoneId?: string,
    metadata: SpatialIndexMetadata
  }> {
    if (!this.cache || new Date() >= this.cache.metadata.nextRefreshDue) {
      await this.initialize(log)
    }

    const pt = point([lon, lat])
    
    // Search only nearby features
    const searchBBox = {
      minX: lon - 0.1,
      minY: lat - 0.1,
      maxX: lon + 0.1,
      maxY: lat + 0.1
    }
    
    const candidateFeatures = this.cache!.spatialIndex.search(searchBBox)
    log("info", `🔍 Checking point against ${candidateFeatures.length} nearby polygons`)
    
    for (const item of candidateFeatures) {
      if (booleanPointInPolygon(pt, item.feature.geometry)) {
        return {
          isInZone: true,
          zoneId: item.feature.properties?.GEOID,
          metadata: this.cache!.metadata
        }
      }
    }
    
    return {
      isInZone: false,
      metadata: this.cache!.metadata
    }
  }

  // For testing and monitoring
  getCacheState(): CacheState | null {
    return this.cache
  }
}

// Export a singleton instance
export const opportunityZoneService = OpportunityZoneService.getInstance() 