// This is a simplified version of the points-in-polygon logic
// In a real implementation, you would load the actual opportunity zone polygons

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import RBush from 'rbush';

// Type for the log function
type LogFn = (type: "info" | "success" | "warning" | "error", message: string) => void;

// Default log function that just uses console
const defaultLog: LogFn = (type, message) => {
  console.log(`[${type}] ${message}`);
};

// Cache for loaded polygons to avoid fetching repeatedly
let opportunityZonePolygons: any = null;

// Retry configuration
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000; // 30 seconds
const RETRY_DELAYS = [1000, 3000, 5000]; // Delays between retries in milliseconds

// Add type for coordinates
type Coordinate = [number, number];

async function fetchWithTimeout(url: string, timeoutMs: number, log: LogFn = defaultLog): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw new Error(error?.message || 'Network error occurred');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadOpportunityZones(log: LogFn = defaultLog): Promise<any> {
  log("info", "🔍 Attempting to load opportunity zones data");
  
  if (opportunityZonePolygons) {
    log("success", "✅ Using cached opportunity zones data");
    return opportunityZonePolygons;
  }
  
  const url = process.env.OPPORTUNITY_ZONES_URL;
  
  if (!url) {
    log("error", "❌ Opportunity zones URL not configured");
    throw new Error('Opportunity zones URL not configured');
  }
  
  log("info", `🔗 Fetching opportunity zones data`);
  
  let lastError: Error = new Error('No attempts made');
  
  // Try multiple times with increasing delays
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      if (i > 0) {
        log("info", `Retry attempt ${i + 1} of ${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[i - 1]));
      }
      
      const response = await fetchWithTimeout(url, TIMEOUT_MS);
      log("info", "📥 Parsing GeoJSON response");
      opportunityZonePolygons = await response.json();
      
      if (!opportunityZonePolygons?.features?.length) {
        log("error", "❌ Invalid GeoJSON format: missing features array");
        throw new Error('Invalid GeoJSON format: missing features array');
      }
      
      log("success", `📊 Loaded ${opportunityZonePolygons.features.length} opportunity zone features`);
      opportunityZonePolygons = optimizeGeoJson(opportunityZonePolygons);
      return opportunityZonePolygons;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      log("error", `Attempt ${i + 1} failed: ${errorMessage}`);
      lastError = new Error(errorMessage);
      
      // If this isn't a timeout or network error, don't retry
      if (!errorMessage.includes('timeout') && !errorMessage.includes('network')) {
        break;
      }
    }
  }
  
  throw new Error(`Failed to load opportunity zones after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

// Add this helper function to calculate bounding box
function calculateBBox(geometry: any) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function processCoordinates(coords: number[]) {
    const [lon, lat] = coords;
    minX = Math.min(minX, lon);
    minY = Math.min(minY, lat);
    maxX = Math.max(maxX, lon);
    maxY = Math.max(maxY, lat);
  }

  function processGeometry(geom: any) {
    if (geom.type === 'Polygon') {
      geom.coordinates[0].forEach((coord: Coordinate) => processCoordinates(coord));
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((polygon: Coordinate[][]) => 
        polygon[0].forEach((coord: Coordinate) => processCoordinates(coord))
      );
    }
  }

  processGeometry(geometry);
  return [minX, minY, maxX, maxY];
}

// Add type for RBush item
interface RBushItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  feature: any;
  index: number;
}

function createSpatialIndex(geoJson: any) {
  const tree = new RBush<RBushItem>();
  const items = geoJson.features.map((feature: any, index: number) => {
    const bbox = feature.bbox || calculateBBox(feature.geometry);
    return {
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3],
      feature,
      index
    };
  });
  tree.load(items);
  return tree;
}

// Add this function to optimize the GeoJSON before creating the spatial index
function optimizeGeoJson(geoJson: any) {
  return {
    type: 'FeatureCollection',
    features: geoJson.features.map((feature: any) => ({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        GEOID: feature.properties?.GEOID // Keep only essential properties
      }
    }))
  };
}

export async function checkPointInPolygon(lat: number, lon: number, log: LogFn = defaultLog): Promise<boolean> {
  try {
    log("info", "🔍 Checking coordinates against opportunity zones");
    
    // Load opportunity zones if not already loaded
    const geoJson = await loadOpportunityZones(log);
    
    // Create a point from the coordinates
    const pt = point([lon, lat]);
    
    // Create spatial index if not already created
    const spatialIndex = createSpatialIndex(geoJson);
    
    // Find potential matches using the spatial index
    const searchBBox = {
      minX: lon - 0.1, // Add small buffer for search
      minY: lat - 0.1,
      maxX: lon + 0.1,
      maxY: lat + 0.1
    };
    
    const potentialMatches = spatialIndex.search(searchBBox) as RBushItem[];
    
    // Check each potential match
    for (const item of potentialMatches) {
      if (booleanPointInPolygon(pt, item.feature)) {
        log("success", "✅ Location is within an opportunity zone");
        return true;
      }
    }
    
    log("success", "✅ Location is not within any opportunity zone");
    return false;
  } catch (error: any) {
    log("error", `❌ Error checking point in polygon: ${error?.message || 'Unknown error'}`);
    throw error;
  }
}

// Export the loading function so we can call it from the form
export async function preloadOpportunityZones(log: LogFn = defaultLog): Promise<void> {
  try {
    await loadOpportunityZones(log);
  } catch (error) {
    // Silently fail on preload - we'll retry during the actual check if needed
    log("warning", `⚠️ Preload attempt failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

