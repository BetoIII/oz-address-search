import { z } from 'zod';

// Types for MCP responses
export interface MCPResponse {
  isInZone: boolean;
  error?: string;
  logs?: Array<{
    type: string;
    message: string;
  }>;
}

export interface GeocodingResponse {
  lat: number;
  lon: number;
  display_name?: string;
}

// Validation schemas for MCP responses
const LogEventSchema = z.object({
  type: z.enum(["info", "success", "warning", "error"]),
  message: z.string()
});

const AddressCheckResponseSchema = z.object({
  isInZone: z.boolean().nullable(),
  error: z.string().optional(),
  logs: z.array(LogEventSchema).optional()
});

// Configuration for MCP client
export interface MCPConfig {
  serverUrl: string;
  apiKey?: string;
}

// MCP client class
export class MCPClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.MCP_API_URL || 'http://localhost:3000';
    this.apiKey = apiKey || process.env.MCP_API_KEY || '';
  }

  async initialize(): Promise<void> {
    // Verify connection and API key
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initialize MCP client: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to MCP service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkAddress(address: string): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/check-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        throw new Error(`Failed to check address: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        isInZone: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        logs: [{
          type: 'error',
          message: 'Failed to check address with MCP service'
        }]
      };
    }
  }

  async geocodeAddress(address: string): Promise<GeocodingResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        throw new Error(`Failed to geocode address: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to geocode address:', error);
      return null;
    }
  }
}

// Create singleton instance
let mcpClient: MCPClient | null = null;

export function initializeMCPClient(config: MCPConfig): MCPClient {
  if (!mcpClient) {
    mcpClient = new MCPClient(config.serverUrl, config.apiKey);
  }
  return mcpClient;
}

export function getMCPClient(): MCPClient {
  if (!mcpClient) {
    throw new Error('MCP client not initialized. Call initializeMCPClient first.');
  }
  return mcpClient;
} 