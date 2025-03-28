// This is a simplified version of the points-in-polygon logic
// In a real implementation, you would load the actual opportunity zone polygons

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

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

export async function checkPointInPolygon(lat: number, lon: number, log: LogFn = defaultLog): Promise<boolean> {
  log("info", `🔍 Checking if point (${lat}, ${lon}) is in any opportunity zone`);
  
  try {
    const geoJson = await loadOpportunityZones(log);
    const pt = point([lon, lat]); // GeoJSON uses [longitude, latitude] order
    
    log("info", `🧮 Checking point against ${geoJson.features.length} opportunity zone polygons`);
    
    // Check each feature in the GeoJSON
    for (let i = 0; i < geoJson.features.length; i++) {
      const feature = geoJson.features[i];
      
      // Log progress every 100 features
      if (i % 100 === 0 && i > 0) {
        log("info", `🔄 Checked ${i}/${geoJson.features.length} polygons`);
      }
      
      if (booleanPointInPolygon(pt, feature.geometry)) {
        log("success", `✅ Point is inside opportunity zone! Feature ID: ${feature.id || feature.properties?.GEOID || i}`);
        return true;
      }
    }
    
    log("info", "❌ Point is not in any opportunity zone");
    return false;
  } catch (error: any) {
    log("error", `❌ Error checking point in polygon: ${error?.message || 'Unknown error'}`);
    throw error;
  }
}

