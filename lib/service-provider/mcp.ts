import { MCPClient } from '../mcp/client';
import { OpportunityZoneService } from './service-interface';
import { CheckAddressResult, GeocodingResult, LogEvent } from './service-interface';

export class MCPOpportunityZoneService implements OpportunityZoneService {
  private client: MCPClient;
  private initialized: boolean = false;

  constructor(client: MCPClient) {
    this.client = client;
  }

  async checkAddress(address: string): Promise<CheckAddressResult> {
    if (!this.initialized) {
      await this.preloadData();
    }

    try {
      const response = await this.client.checkAddress(address);
      
      return {
        isInZone: response.isInZone,
        logs: response.logs?.map(log => ({
          type: log.type,
          message: log.message
        } as LogEvent)) || []
      };
    } catch (error) {
      return {
        isInZone: false,
        logs: [{
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to check address'
        }]
      };
    }
  }

  async preloadData(): Promise<boolean> {
    try {
      await this.client.initialize();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize MCP service:', error);
      return false;
    }
  }

  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!this.initialized) {
      await this.preloadData();
    }

    try {
      const result = await this.client.geocodeAddress(address);
      if (!result) return null;

      return {
        lat: result.lat,
        lon: result.lon,
        display_name: result.display_name || 'Unknown location'
      };
    } catch (error) {
      console.error('Failed to geocode address:', error);
      return null;
    }
  }
} 