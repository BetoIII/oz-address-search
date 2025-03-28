import RBush from 'rbush'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'

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
}

interface RBushItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  feature: any
  index: number
}

class OpportunityZoneService {
  private static instance: OpportunityZoneService
  private spatialIndex: RBush<RBushItem> | null = null
  private metadata: SpatialIndexMetadata | null = null
  private isInitializing = false
  private initPromise: Promise<void> | null = null

  private constructor() {}

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
    
    log("info", `🔗 Fetching opportunity zones data`)
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

  async initialize(log: LogFn = defaultLog): Promise<void> {
    // If already initialized, return immediately
    if (this.spatialIndex) {
      return
    }

    // If initialization is in progress, wait for it
    if (this.isInitializing) {
      return this.initPromise!
    }

    this.isInitializing = true
    this.initPromise = (async () => {
      try {
        log("info", "🔄 Initializing opportunity zone spatial index...")
        const geoJson = await this.loadOpportunityZones(log)
        this.spatialIndex = this.createSpatialIndex(geoJson)
        this.metadata = {
          version: '1.0.0',
          lastUpdated: new Date(),
          featureCount: geoJson.features.length
        }
        log("success", `✅ Spatial index created with ${geoJson.features.length} features`)
      } catch (error) {
        log("error", `❌ Failed to initialize spatial index: ${error instanceof Error ? error.message : 'Unknown error'}`)
        throw error
      } finally {
        this.isInitializing = false
      }
    })()

    return this.initPromise
  }

  async checkPoint(lat: number, lon: number, log: LogFn = defaultLog): Promise<{
    isInZone: boolean,
    zoneId?: string,
    metadata: SpatialIndexMetadata
  }> {
    if (!this.spatialIndex || !this.metadata) {
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
    
    const candidateFeatures = this.spatialIndex!.search(searchBBox)
    log("info", `🔍 Checking point against ${candidateFeatures.length} nearby polygons`)
    
    for (const item of candidateFeatures) {
      if (booleanPointInPolygon(pt, item.feature.geometry)) {
        return {
          isInZone: true,
          zoneId: item.feature.properties?.GEOID,
          metadata: this.metadata!
        }
      }
    }
    
    return {
      isInZone: false,
      metadata: this.metadata!
    }
  }
}

// Export a singleton instance
export const opportunityZoneService = OpportunityZoneService.getInstance() 