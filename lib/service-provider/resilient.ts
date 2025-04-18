import { OpportunityZoneService, CheckAddressResult, GeocodingResult, LogEvent } from './service-interface';
import { ServiceType, LogFn, getOpportunityZoneService } from './factory';
import { shouldUseMcpService } from '../feature-flags';

interface ServiceMetrics {
  failures: number;
  lastFailure: Date | null;
  consecutiveFailures: number;
  lastSuccess: Date | null;
}

export interface ServiceHealthMetrics {
  mcp: ServiceMetrics;
  local: ServiceMetrics;
  currentServiceType: ServiceType | null;
}

export class ResilientOpportunityZoneService implements OpportunityZoneService {
  private currentService: OpportunityZoneService | null = null;
  private serviceType: ServiceType | null = null;
  private metrics: Map<ServiceType, ServiceMetrics> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes

  constructor(private log: LogFn) {
    // Initialize metrics for both service types
    this.metrics.set('mcp', this.createInitialMetrics());
    this.metrics.set('local', this.createInitialMetrics());
  }

  private createInitialMetrics(): ServiceMetrics {
    return {
      failures: 0,
      lastFailure: null,
      consecutiveFailures: 0,
      lastSuccess: null,
    };
  }

  private async initializeService(preferredType?: ServiceType): Promise<void> {
    try {
      // Determine service type based on feature flag and metrics
      const type = preferredType || this.determineServiceType();
      
      // Get the service instance
      this.currentService = await getOpportunityZoneService(type, this.log);
      this.serviceType = type;
      
      // Update metrics on successful initialization
      const metrics = this.metrics.get(type)!;
      metrics.lastSuccess = new Date();
      metrics.consecutiveFailures = 0;
    } catch (error) {
      this.handleServiceError(error);
      throw error;
    }
  }

  private determineServiceType(): ServiceType {
    const useMcp = shouldUseMcpService();
    const mcpMetrics = this.metrics.get('mcp')!;
    
    // Check if MCP service is in cooldown
    if (useMcp && mcpMetrics.lastFailure) {
      const timeSinceLastFailure = Date.now() - mcpMetrics.lastFailure.getTime();
      const isInCooldown = timeSinceLastFailure < this.COOLDOWN_PERIOD;
      
      if (isInCooldown && mcpMetrics.consecutiveFailures >= this.FAILURE_THRESHOLD) {
        this.log('warning', `MCP service in cooldown period, using local service`);
        return 'local';
      }
    }
    
    return useMcp ? 'mcp' : 'local';
  }

  private handleServiceError(error: unknown): void {
    if (!this.serviceType) return;

    const metrics = this.metrics.get(this.serviceType)!;
    metrics.failures++;
    metrics.consecutiveFailures++;
    metrics.lastFailure = new Date();

    this.log('error', `Service error (${this.serviceType}): ${error instanceof Error ? error.message : 'Unknown error'}`);
    this.log('info', `Service metrics (${this.serviceType}): ${JSON.stringify(metrics)}`);
  }

  private async withFallback<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let attempts = 0;
    let lastError: unknown;

    while (attempts < this.MAX_RETRIES) {
      try {
        // Initialize service if needed
        if (!this.currentService) {
          await this.initializeService();
        }

        // Attempt the operation
        const result = await operation();
        
        // Update success metrics
        if (this.serviceType) {
          const metrics = this.metrics.get(this.serviceType)!;
          metrics.lastSuccess = new Date();
          metrics.consecutiveFailures = 0;
        }
        
        return result;
      } catch (error) {
        lastError = error;
        this.handleServiceError(error);
        
        // Increment attempt counter
        attempts++;
        
        // If using MCP and it fails, try falling back to local
        if (this.serviceType === 'mcp' && attempts < this.MAX_RETRIES) {
          this.log('warning', `${context} failed with MCP service, attempting fallback to local service`);
          this.currentService = null;
          await this.initializeService('local');
          continue;
        }
        
        // If we're already on local service, or max retries reached, throw the error
        if (attempts === this.MAX_RETRIES) {
          this.log('error', `${context} failed after ${attempts} attempts`);
          throw lastError;
        }
        
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    throw lastError;
  }

  // Implement OpportunityZoneService interface methods with resilience
  async preloadData(): Promise<boolean> {
    return this.withFallback(
      async () => {
        if (!this.currentService) throw new Error('No service initialized');
        return this.currentService.preloadData();
      },
      'Preload data'
    );
  }

  async checkAddress(address: string): Promise<CheckAddressResult> {
    return this.withFallback(
      async () => {
        if (!this.currentService) throw new Error('No service initialized');
        return this.currentService.checkAddress(address);
      },
      'Check address'
    );
  }

  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    return this.withFallback(
      async () => {
        if (!this.currentService) throw new Error('No service initialized');
        return this.currentService.geocodeAddress(address);
      },
      'Geocode address'
    );
  }

  // Service health monitoring methods
  getMetrics(): ServiceHealthMetrics {
    return {
      mcp: { ...this.metrics.get('mcp')! },
      local: { ...this.metrics.get('local')! },
      currentServiceType: this.serviceType,
    };
  }

  getCurrentServiceType(): ServiceType | null {
    return this.serviceType;
  }
}

// Export factory function
export function createResilientService(log: LogFn): OpportunityZoneService {
  return new ResilientOpportunityZoneService(log);
} 