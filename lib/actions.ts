"use server"

import { checkPointInPolygon } from "./opportunity-zone-checker"

interface GeocodeResponse {
  lat: string
  lon: string
  display_name: string
  error?: string
}

export async function checkAddressInOpportunityZone(address: string) {
  console.log(`🔍 Starting opportunity zone check for address: ${address}`);
  
  try {
    // Step 1: Geocode the address to get lat/long
    console.log(`🌎 Geocoding address: ${address}`);
    const apiKey = process.env.GEOCODING_API_KEY;
    
    if (!apiKey) {
      throw new Error("Geocoding API key not configured");
    }
    
    const geocodeUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(address)}&api_key=${apiKey}`
    console.log(`🔗 Geocoding request initiated`);
    
    const response = await fetch(geocodeUrl)

    if (!response.ok) {
      console.error(`❌ Geocoding failed: ${response.status} ${response.statusText}`);
      throw new Error("Failed to geocode address")
    }

    const data = (await response.json()) as GeocodeResponse[]
    console.log(`📊 Geocoding returned ${data.length} results`);

    if (!data.length) {
      console.warn("⚠️ No geocoding results found for address");
      return {
        isInZone: null,
        error: "Address not found. Please check the address and try again.",
      }
    }

    // Get the first result
    const { lat, lon, display_name } = data[0]
    console.log(`📍 Using coordinates: (${lat}, ${lon}) for "${display_name}"`);

    if (!lat || !lon) {
      console.error("❌ Missing coordinates in geocoding result");
      return {
        isInZone: null,
        error: "Could not determine coordinates for this address.",
      }
    }

    // Step 2: Check if the point is in any opportunity zone polygon
    try {
      console.log(`🔍 Checking coordinates (${lat}, ${lon}) against opportunity zones`);
      const isInZone = await checkPointInPolygon(Number.parseFloat(lat), Number.parseFloat(lon))
      console.log(`🏁 Opportunity zone check result: ${isInZone ? "YES - In Zone" : "NO - Not in Zone"}`);
      return { isInZone }
    } catch (error) {
      console.error("❌ Error checking opportunity zone:", error)
      return {
        isInZone: null,
        error: "Failed to check opportunity zone data. Please try again later.",
      }
    }
  } catch (error) {
    console.error("❌ Error checking address:", error)
    return {
      isInZone: null,
      error: "An error occurred while processing your request. Please try again later.",
    }
  }
}

