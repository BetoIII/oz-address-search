import { MCPClient, initializeMCPClient } from '../mcp/client';
import { OpportunityZoneService } from './service-interface';
import { MCPOpportunityZoneService } from './mcp';
import { LocalOpportunityZoneService } from './local';
import { getConfig, getMCPConfig } from './config';

export type ServiceType = 'local' | 'mcp';

export class OpportunityZoneServiceFactory {
  private static instance: OpportunityZoneServiceFactory;
  private services: Map<ServiceType, OpportunityZoneService>;
  
  private constructor() {
    this.services = new Map();
  }

  static getInstance(): OpportunityZoneServiceFactory {
    if (!OpportunityZoneServiceFactory.instance) {
      OpportunityZoneServiceFactory.instance = new OpportunityZoneServiceFactory();
    }
    return OpportunityZoneServiceFactory.instance;
  }

  async getService(type?: ServiceType): Promise<OpportunityZoneService> {
    // Use configured default service if type not specified
    const serviceType = type || getConfig().defaultService;

    // Return cached service if available
    const existingService = this.services.get(serviceType);
    if (existingService) {
      return existingService;
    }

    // Create new service instance
    let service: OpportunityZoneService;
    
    switch (serviceType) {
      case 'mcp':
        const mcpConfig = getMCPConfig();
        const mcpClient = initializeMCPClient({
          serverUrl: mcpConfig.serverUrl,
          apiKey: mcpConfig.apiKey
        });
        service = new MCPOpportunityZoneService(mcpClient);
        break;
        
      case 'local':
      default:
        service = new LocalOpportunityZoneService();
        break;
    }

    // Initialize the service
    await service.preloadData();
    
    // Cache the service instance
    this.services.set(serviceType, service);
    
    return service;
  }

  clearServices(): void {
    this.services.clear();
  }
}

// Convenience function to get a service instance
export async function getOpportunityZoneService(type?: ServiceType): Promise<OpportunityZoneService> {
  return OpportunityZoneServiceFactory.getInstance().getService(type);
} 