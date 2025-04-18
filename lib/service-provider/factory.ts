import { MCPClient, initializeMCPClient } from '../mcp/client';
import { OpportunityZoneService } from './service-interface';
import { MCPOpportunityZoneService } from './mcp';
import { LocalOpportunityZoneService } from './local';
import { getConfig, getMCPConfig } from './config';
import { shouldUseMcpService } from '../feature-flags';
import { createResilientService } from './resilient';

export type ServiceType = 'local' | 'mcp';
export type LogType = 'info' | 'success' | 'warning' | 'error';
export type LogFn = (type: LogType, message: string) => void;

export class OpportunityZoneServiceFactory {
  private static instance: OpportunityZoneServiceFactory;
  private services: Map<ServiceType, OpportunityZoneService>;
  private defaultLog: LogFn = (type: LogType, message: string) => console.log(`[${type}] ${message}`);
  private resilientService: OpportunityZoneService | null = null;
  
  private constructor() {
    this.services = new Map();
  }

  static getInstance(): OpportunityZoneServiceFactory {
    if (!OpportunityZoneServiceFactory.instance) {
      OpportunityZoneServiceFactory.instance = new OpportunityZoneServiceFactory();
    }
    return OpportunityZoneServiceFactory.instance;
  }

  async getService(type?: ServiceType, log: LogFn = this.defaultLog): Promise<OpportunityZoneService> {
    // If no specific type is requested, return the resilient service
    if (!type) {
      if (!this.resilientService) {
        this.resilientService = createResilientService(log);
      }
      return this.resilientService;
    }

    // If a specific type is requested, return that service directly
    // Return cached service if available
    const existingService = this.services.get(type);
    if (existingService) {
      log('info', `Using cached ${type} service`);
      return existingService;
    }

    // Create new service instance
    let service: OpportunityZoneService;
    
    try {
      switch (type) {
        case 'mcp':
          log('info', 'Initializing MCP service');
          const mcpConfig = getMCPConfig();
          const mcpClient = initializeMCPClient({
            serverUrl: mcpConfig.serverUrl,
            apiKey: mcpConfig.apiKey
          });
          service = new MCPOpportunityZoneService(mcpClient);
          break;
          
        case 'local':
        default:
          log('info', 'Initializing local service');
          service = new LocalOpportunityZoneService();
          break;
      }

      // Initialize the service
      await service.preloadData();
      
      // Cache the service instance
      this.services.set(type, service);
      
      return service;
    } catch (error) {
      log('error', `Failed to initialize ${type} service: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private determineServiceType(log: LogFn): ServiceType {
    const useMcp = shouldUseMcpService();
    log('info', `Feature flag USE_MCP_SERVICE is ${useMcp ? 'enabled' : 'disabled'}`);
    return useMcp ? 'mcp' : 'local';
  }

  clearServices(): void {
    this.services.clear();
    this.resilientService = null;
  }
}

// Convenience function to get a service instance
export async function getOpportunityZoneService(
  type?: ServiceType,
  log?: LogFn
): Promise<OpportunityZoneService> {
  return OpportunityZoneServiceFactory.getInstance().getService(type, log);
} 