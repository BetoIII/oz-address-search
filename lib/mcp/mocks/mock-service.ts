import { mockResponses } from './mock-responses';
import type { MCPResponse } from '../client';
import type { GeocodingResult, OpportunityZoneCheck } from '../services';

export class MockOpportunityZoneService {
  static async checkAddress(address: string): Promise<MCPResponse<OpportunityZoneCheck>> {
    return mockResponses.checkAddress(address);
  }

  static async geocodeAddress(address: string): Promise<MCPResponse<GeocodingResult>> {
    return mockResponses.geocodeAddress(address);
  }

  static async preloadData(): Promise<MCPResponse<{ status: string }>> {
    return mockResponses.preloadData();
  }
} 