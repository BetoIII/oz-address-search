"use server"

import { checkPointInPolygon } from "./opportunity-zone-checker"

interface GeocodeResponse {
  lat: string
  lon: string
  display_name: string
  error?: string
}

interface LogEvent {
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export interface CheckAddressResult {
  isInZone: boolean | null;
  error?: string;
  logs?: LogEvent[];
}

export async function checkAddressInOpportunityZone(address: string): Promise<CheckAddressResult> {
  const logs: LogEvent[] = [];
  
  // Helper to add logs
  const log = (type: LogEvent["type"], message: string) => {
    logs.push({ type, message });
    console.log(`[${type}] ${message}`); // Still log to console for server debugging
  };
  
  log("info", `🔍 Starting opportunity zone check for address: ${address}`);
  
  try {
    // Step 1: Geocode the address to get lat/long
    log("info", `🌎 Geocoding address: ${address}`);
    const apiKey = process.env.GEOCODING_API_KEY;
    
    if (!apiKey) {
      log("error", "❌ Geocoding API key not configured");
      throw new Error("Geocoding API key not configured");
    }
    
    const geocodeUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(address)}&api_key=${apiKey}`
    log("info", `🔗 Geocoding request initiated`);
    
    const response = await fetch(geocodeUrl)

    if (!response.ok) {
      const errorMessage = `❌ Geocoding failed: ${response.status} ${response.statusText}`;
      log("error", errorMessage);
      throw new Error("Failed to geocode address")
    }

    const data = (await response.json()) as GeocodeResponse[]
    log("info", `📊 Geocoding returned ${data.length} results`);

    if (!data.length) {
      log("warning", "⚠️ No geocoding results found for address");
      return {
        isInZone: null,
        error: "Address not found. Please check the address and try again.",
        logs
      }
    }

    // Get the first result
    const { lat, lon, display_name } = data[0]
    // Sanitize display_name to not include any private data 
    const sanitizedDisplayName = display_name.split(',').slice(0, -2).join(',');
    log("info", `📍 Using coordinates: (${lat}, ${lon}) for "${sanitizedDisplayName}"`);

    if (!lat || !lon) {
      log("error", "❌ Missing coordinates in geocoding result");
      return {
        isInZone: null,
        error: "Could not determine coordinates for this address.",
        logs
      }
    }

    // Step 2: Check if the point is in any opportunity zone polygon
    try {
      log("info", `🔍 Checking coordinates (${lat}, ${lon}) against opportunity zones`);
      const isInZone = await checkPointInPolygon(Number.parseFloat(lat), Number.parseFloat(lon), log);
      log("success", `🏁 Opportunity zone check result: ${isInZone ? "YES - In Zone" : "NO - Not in Zone"}`);
      return { isInZone, logs }
    } catch (error) {
      log("error", `❌ Error checking opportunity zone: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isInZone: null,
        error: "Failed to check opportunity zone data. Please try again later.",
        logs
      }
    }
  } catch (error) {
    log("error", `❌ Error checking address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isInZone: null,
      error: "An error occurred while processing your request. Please try again later.",
      logs
    }
  }
}

