import { getMCPClient } from './client';
import type { MCPResponse } from './client';

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

export interface OpportunityZoneCheck {
  isInZone: boolean | null;
  address: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export class OpportunityZoneService {
  // Check if an address is in an opportunity zone
  static async checkAddress(address: string): Promise<MCPResponse<OpportunityZoneCheck>> {
    const client = getMCPClient();
    return client.makeRequest<OpportunityZoneCheck>('/opportunity-zone/check', 'POST', { address });
  }

  // Geocode an address to coordinates
  static async geocodeAddress(address: string): Promise<MCPResponse<GeocodingResult>> {
    const client = getMCPClient();
    return client.makeRequest<GeocodingResult>('/geocoding/address', 'POST', { address });
  }

  // Preload opportunity zone data (optional optimization)
  static async preloadData(): Promise<MCPResponse<{ status: string }>> {
    const client = getMCPClient();
    return client.makeRequest<{ status: string }>('/opportunity-zone/preload', 'POST');
  }
} 