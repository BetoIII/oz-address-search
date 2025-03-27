// This is a simplified version of the points-in-polygon logic
// In a real implementation, you would load the actual opportunity zone polygons

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

// Cache for loaded polygons to avoid fetching repeatedly
let opportunityZonePolygons: any = null;

async function loadOpportunityZones(): Promise<any> {
  console.log("🔍 Attempting to load opportunity zones data");
  
  if (opportunityZonePolygons) {
    console.log("✅ Using cached opportunity zones data");
    return opportunityZonePolygons;
  }
  
  const url = process.env.OPPORTUNITY_ZONES_URL;
  
  if (!url) {
    console.error("❌ Opportunity zones URL not configured in environment variables");
    throw new Error('Opportunity zones URL not configured');
  }
  
  console.log(`🔗 Fetching opportunity zones from: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch opportunity zones: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to load opportunity zone data: ${response.status} ${response.statusText}`);
    }
    
    console.log("📥 Parsing GeoJSON response");
    opportunityZonePolygons = await response.json();
    
    // Log basic info about the loaded data
    if (opportunityZonePolygons && opportunityZonePolygons.features) {
      console.log(`📊 Loaded ${opportunityZonePolygons.features.length} opportunity zone features`);
    }
    
    return opportunityZonePolygons;
  } catch (error) {
    console.error("❌ Error loading opportunity zones:", error);
    throw error;
  }
}

export async function checkPointInPolygon(lat: number, lon: number): Promise<boolean> {
  console.log(`🔍 Checking if point (${lat}, ${lon}) is in any opportunity zone`);
  
  try {
    const geoJson = await loadOpportunityZones();
    const pt = point([lon, lat]); // GeoJSON uses [longitude, latitude] order
    
    console.log(`🧮 Checking point against ${geoJson.features.length} opportunity zone polygons`);
    
    // Check each feature in the GeoJSON
    for (let i = 0; i < geoJson.features.length; i++) {
      const feature = geoJson.features[i];
      
      // Optional: Log progress every 100 features to avoid console spam
      if (i % 100 === 0) {
        console.log(`🔄 Checked ${i}/${geoJson.features.length} polygons`);
      }
      
      if (booleanPointInPolygon(pt, feature.geometry)) {
        console.log(`✅ Point is inside opportunity zone! Feature ID: ${feature.id || feature.properties?.GEOID || i}`);
        return true;
      }
    }
    
    console.log("❌ Point is not in any opportunity zone");
    return false;
  } catch (error) {
    console.error("❌ Error checking point in polygon:", error);
    throw error; // Let the caller handle the error
  }
}

