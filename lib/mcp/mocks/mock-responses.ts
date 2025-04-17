import type { MCPResponse } from '../client';
import type { GeocodingResult, OpportunityZoneCheck } from '../services';

// Sample addresses that are in opportunity zones
const SAMPLE_OZ_ADDRESSES = [
  '123 Enterprise Zone, Business District, CA 90001',
  '456 Development Ave, Growth City, NY 10001',
  '789 Opportunity Blvd, Investment Town, TX 75001'
];

// Mock coordinates for different regions
const MOCK_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'CA': { lat: 34.0522, lon: -118.2437 },
  'NY': { lat: 40.7128, lon: -74.0060 },
  'TX': { lat: 29.7604, lon: -95.3698 }
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to determine if address should be in an opportunity zone
function isInOpportunityZone(address: string): boolean {
  return SAMPLE_OZ_ADDRESSES.some(sample => 
    address.toLowerCase().includes(sample.toLowerCase().split(',')[0])
  );
}

// Helper to get mock coordinates based on state
function getMockCoordinates(address: string): { lat: number; lon: number } {
  const state = Object.keys(MOCK_COORDINATES).find(state => 
    address.toUpperCase().includes(state)
  );
  return state ? MOCK_COORDINATES[state] : MOCK_COORDINATES['CA'];
}

export const mockResponses = {
  // Mock geocoding response
  async geocodeAddress(address: string): Promise<MCPResponse<GeocodingResult>> {
    await delay(500); // Simulate network delay

    const coordinates = getMockCoordinates(address);
    
    return {
      data: {
        lat: coordinates.lat,
        lon: coordinates.lon,
        display_name: address
      },
      logs: [
        { type: "info", message: "🔍 Geocoding address..." },
        { type: "success", message: "✅ Address successfully geocoded" }
      ]
    };
  },

  // Mock opportunity zone check response
  async checkAddress(address: string): Promise<MCPResponse<OpportunityZoneCheck>> {
    await delay(1000); // Simulate network delay

    const coordinates = getMockCoordinates(address);
    const isInZone = isInOpportunityZone(address);

    return {
      data: {
        isInZone,
        address,
        coordinates
      },
      logs: [
        { type: "info", message: "🔍 Processing address..." },
        { type: "info", message: "📍 Geocoding successful" },
        { type: "info", message: `🎯 Checking coordinates: (${coordinates.lat}, ${coordinates.lon})` },
        { 
          type: isInZone ? "success" : "info",
          message: isInZone 
            ? "✅ Location is in an Opportunity Zone" 
            : "ℹ️ Location is not in an Opportunity Zone"
        }
      ]
    };
  },

  // Mock preload data response
  async preloadData(): Promise<MCPResponse<{ status: string }>> {
    await delay(300); // Simulate network delay

    return {
      data: {
        status: "success"
      },
      logs: [
        { type: "info", message: "🔄 Preloading opportunity zone data..." },
        { type: "success", message: "✅ Data preloaded successfully" }
      ]
    };
  }
}; 