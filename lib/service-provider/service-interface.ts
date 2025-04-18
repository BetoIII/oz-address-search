// Types shared between implementations
export interface LogEvent {
  type: "info" | "success" | "warning" | "error";
  message: string;
}

export interface CheckAddressResult {
  isInZone: boolean | null;
  error?: string;
  logs?: LogEvent[];
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

// Core service interface
export interface OpportunityZoneService {
  // Check if an address is in an opportunity zone
  checkAddress(address: string): Promise<CheckAddressResult>;
  
  // Preload opportunity zone data (optional optimization)
  preloadData(): Promise<boolean>;
  
  // Geocode an address to coordinates
  geocodeAddress(address: string): Promise<GeocodingResult | null>;
} 