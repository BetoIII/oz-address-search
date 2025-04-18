import { getFeatureFlagConfig, isFeatureEnabled, updateFeatureFlag } from './config';
import type { FeatureFlag, FeatureFlags } from './config';
import type { ServiceHealthMetrics } from '@/lib/service-provider/resilient';

// Re-export types
export type { FeatureFlag, FeatureFlags, ServiceHealthMetrics };

// Feature flag names as constants
export const FEATURE_FLAGS = {
  USE_MCP_SERVICE: 'USE_MCP_SERVICE',
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

class FeatureFlagManager {
  private static instance: FeatureFlagManager;

  private constructor() {}

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  isEnabled(flagName: FeatureFlagName): boolean {
    return isFeatureEnabled(flagName);
  }

  getFlag(flagName: FeatureFlagName): FeatureFlag {
    return getFeatureFlagConfig().getFlag(flagName);
  }

  getAllFlags(): FeatureFlags {
    return getFeatureFlagConfig().getAllFlags();
  }

  enableFlag(flagName: FeatureFlagName, updatedBy: string): FeatureFlag {
    return updateFeatureFlag(flagName, { enabled: true }, updatedBy);
  }

  disableFlag(flagName: FeatureFlagName, updatedBy: string): FeatureFlag {
    return updateFeatureFlag(flagName, { enabled: false }, updatedBy);
  }

  updateFlag(
    flagName: FeatureFlagName,
    updates: Partial<FeatureFlag>,
    updatedBy: string
  ): FeatureFlag {
    return updateFeatureFlag(flagName, updates, updatedBy);
  }

  shouldUseMcpService(): boolean {
    return this.isEnabled('USE_MCP_SERVICE');
  }
}

// Export singleton instance
export const featureFlags = FeatureFlagManager.getInstance();

// Export convenience function for MCP service check
export function shouldUseMcpService(): boolean {
  return featureFlags.shouldUseMcpService();
} 