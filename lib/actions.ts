"use server"

import { checkPointInPolygon } from "./opportunity-zone-checker"

interface GeocodeResponse {
  lat: string
  lon: string
  display_name: string
  error?: string
}

export async function checkAddressInOpportunityZone(address: string) {
  try {
    // Step 1: Geocode the address to get lat/long
    const geocodeUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(address)}`
    const response = await fetch(geocodeUrl)

    if (!response.ok) {
      throw new Error("Failed to geocode address")
    }

    const data = (await response.json()) as GeocodeResponse[]

    if (!data.length) {
      return {
        isInZone: null,
        error: "Address not found. Please check the address and try again.",
      }
    }

    // Get the first result
    const { lat, lon } = data[0]

    if (!lat || !lon) {
      return {
        isInZone: null,
        error: "Could not determine coordinates for this address.",
      }
    }

    // Step 2: Check if the point is in any opportunity zone polygon
    const isInZone = await checkPointInPolygon(Number.parseFloat(lat), Number.parseFloat(lon))

    return { isInZone }
  } catch (error) {
    console.error("Error checking address:", error)
    return {
      isInZone: null,
      error: "An error occurred while processing your request. Please try again later.",
    }
  }
}

