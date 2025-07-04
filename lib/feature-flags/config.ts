import { z } from 'zod';

// Feature flag schema definition
const FeatureFlagSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  description: z.string(),
  lastUpdated: z.date().optional(),
  updatedBy: z.string().optional(),
});

// All available feature flags
const FeatureFlagsSchema = z.object({
  USE_MCP_SERVICE: FeatureFlagSchema,
  // Add other feature flags here as needed
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

// Default configuration for all feature flags
const defaultFlags: FeatureFlags = {
  USE_MCP_SERVICE: {
    name: 'USE_MCP_SERVICE',
    enabled: false,
    description: 'Controls whether to use MCP service for opportunity zone lookups',
    lastUpdated: new Date(),
    updatedBy: 'system',
  },
};

class FeatureFlagConfig {
  private static instance: FeatureFlagConfig;
  private flags: FeatureFlags;

  private constructor() {
    this.flags = this.loadConfiguration();
  }

  static getInstance(): FeatureFlagConfig {
    if (!FeatureFlagConfig.instance) {
      FeatureFlagConfig.instance = new FeatureFlagConfig();
    }
    return FeatureFlagConfig.instance;
  }

  private loadConfiguration(): FeatureFlags {
    try {
      // First try to load from environment variables
      const envFlags = this.loadFromEnvironment();
      
      // Merge with default flags
      return {
        ...defaultFlags,
        ...envFlags,
      };
    } catch (error) {
      console.warn('Error loading feature flags configuration:', error);
      return defaultFlags;
    }
  }

  private loadFromEnvironment(): Partial<FeatureFlags> {
    const flags: Partial<FeatureFlags> = {};

    // Check environment variable for MCP service flag
    const useMcpService = process.env.FEATURE_FLAG_USE_MCP_SERVICE;
    if (useMcpService !== undefined) {
      flags.USE_MCP_SERVICE = {
        ...defaultFlags.USE_MCP_SERVICE,
        enabled: useMcpService.toLowerCase() === 'true',
        lastUpdated: new Date(),
      };
    }

    // Force disable MCP service to prevent 405 errors
    // TODO: Remove this override once MCP endpoints are properly implemented
    flags.USE_MCP_SERVICE = {
      ...defaultFlags.USE_MCP_SERVICE,
      enabled: false,
      lastUpdated: new Date(),
      updatedBy: 'system-override',
    };

    return flags;
  }

  getFlag(flagName: keyof FeatureFlags): FeatureFlag {
    return this.flags[flagName];
  }

  isEnabled(flagName: keyof FeatureFlags): boolean {
    return this.flags[flagName]?.enabled ?? false;
  }

  updateFlag(
    flagName: keyof FeatureFlags,
    updates: Partial<FeatureFlag>,
    updatedBy: string
  ): FeatureFlag {
    const currentFlag = this.flags[flagName];
    
    this.flags[flagName] = {
      ...currentFlag,
      ...updates,
      lastUpdated: new Date(),
      updatedBy,
    };

    return this.flags[flagName];
  }

  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }
}

// Export singleton instance getter
export function getFeatureFlagConfig(): FeatureFlagConfig {
  return FeatureFlagConfig.getInstance();
}

// Export convenience functions
export function isFeatureEnabled(flagName: keyof FeatureFlags): boolean {
  return getFeatureFlagConfig().isEnabled(flagName);
}

export function updateFeatureFlag(
  flagName: keyof FeatureFlags,
  updates: Partial<FeatureFlag>,
  updatedBy: string
): FeatureFlag {
  return getFeatureFlagConfig().updateFlag(flagName, updates, updatedBy);
} 