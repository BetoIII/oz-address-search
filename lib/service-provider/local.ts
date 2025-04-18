import { checkAddressInOpportunityZone } from "@/lib/actions";
import { opportunityZoneService } from "@/lib/services/opportunity-zones";
import type { 
  OpportunityZoneService, 
  CheckAddressResult,
  GeocodingResult 
} from "./service-interface";

export class LocalOpportunityZoneService implements OpportunityZoneService {
  private initialized: boolean = false;

  async checkAddress(address: string): Promise<CheckAddressResult> {
    if (!this.initialized) {
      await this.preloadData();
    }
    return checkAddressInOpportunityZone(address);
  }
  
  async preloadData(): Promise<boolean> {
    try {
      await opportunityZoneService.initialize();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to preload opportunity zones:', error);
      return false;
    }
  }

  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!this.initialized) {
      await this.preloadData();
    }

    try {
      const result = await checkAddressInOpportunityZone(address);
      
      // Look for coordinates in the logs
      const coordinates = this.extractCoordinatesFromLogs(result.logs || []);
      if (!coordinates) return null;

      return {
        lat: coordinates.lat,
        lon: coordinates.lon,
        display_name: address // Use the original address as display name
      };
    } catch (error) {
      console.error('Failed to geocode address:', error);
      return null;
    }
  }

  private extractCoordinatesFromLogs(logs: Array<{ message: string }>): { lat: number, lon: number } | null {
    // Find the log entry containing coordinates
    const geocodingLog = logs.find(log => log.message.includes('Found coordinates:'));
    if (!geocodingLog) return null;

    // Extract coordinates using regex
    const coordMatch = geocodingLog.message.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
    if (!coordMatch) return null;

    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);

    // Validate the parsed numbers
    if (isNaN(lat) || isNaN(lon)) return null;

    return { lat, lon };
  }
} 