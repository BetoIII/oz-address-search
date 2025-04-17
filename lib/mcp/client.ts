import { z } from 'zod';

// Types for MCP responses
export interface MCPResponse<T> {
  data: T;
  error?: string;
  logs?: Array<{
    type: "info" | "success" | "warning" | "error";
    message: string;
  }>;
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
  private config: MCPConfig;

  constructor(config: MCPConfig) {
    this.config = config;
  }

  async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: any
  ): Promise<MCPResponse<T>> {
    try {
      const response = await fetch(`${this.config.serverUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        ...(body && { body: JSON.stringify(body) })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as MCPResponse<T>;
    } catch (error) {
      return {
        data: null as T,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        logs: [{
          type: 'error',
          message: 'Failed to communicate with MCP server'
        }]
      };
    }
  }

  // Initialize connection with MCP server
  async initialize(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ status: string }>('/health');
      return !response.error;
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
      return false;
    }
  }
}

// Create singleton instance
let mcpClient: MCPClient | null = null;

export function initializeMCPClient(config: MCPConfig): MCPClient {
  if (!mcpClient) {
    mcpClient = new MCPClient(config);
  }
  return mcpClient;
}

export function getMCPClient(): MCPClient {
  if (!mcpClient) {
    throw new Error('MCP client not initialized. Call initializeMCPClient first.');
  }
  return mcpClient;
} 