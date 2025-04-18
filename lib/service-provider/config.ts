import { z } from 'zod';

// Configuration schema for MCP service
const MCPConfigSchema = z.object({
  serverUrl: z.string().url().default('http://localhost:3000'),
  apiKey: z.string().optional(),
  timeout: z.number().positive().default(30000), // 30 seconds default timeout
});

// Configuration schema for local service
const LocalConfigSchema = z.object({
  dataPath: z.string().optional(),
  cacheEnabled: z.boolean().default(true),
  cacheTimeout: z.number().positive().default(3600000), // 1 hour default cache timeout
});

// Combined configuration schema
const ServiceConfigSchema = z.object({
  defaultService: z.enum(['local', 'mcp']).default('local'),
  mcp: MCPConfigSchema,
  local: LocalConfigSchema,
});

// Configuration types
export type MCPConfig = z.infer<typeof MCPConfigSchema>;
export type LocalConfig = z.infer<typeof LocalConfigSchema>;
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

// Default configuration
const defaultConfig: ServiceConfig = {
  defaultService: 'local',
  mcp: {
    serverUrl: process.env.MCP_API_URL || 'http://localhost:3000',
    apiKey: process.env.MCP_API_KEY,
    timeout: 30000,
  },
  local: {
    cacheEnabled: true,
    cacheTimeout: 3600000,
  },
};

class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: ServiceConfig;

  private constructor() {
    this.config = defaultConfig;
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  getConfig(): ServiceConfig {
    return this.config;
  }

  getMCPConfig(): MCPConfig {
    return this.config.mcp;
  }

  getLocalConfig(): LocalConfig {
    return this.config.local;
  }

  updateConfig(newConfig: Partial<ServiceConfig>): ServiceConfig {
    // Validate and merge the new configuration
    const merged = {
      ...this.config,
      ...newConfig,
      mcp: { ...this.config.mcp, ...(newConfig.mcp || {}) },
      local: { ...this.config.local, ...(newConfig.local || {}) },
    };

    // Validate the merged configuration
    const validated = ServiceConfigSchema.parse(merged);
    this.config = validated;
    return this.config;
  }
}

// Export convenience functions
export function getConfig(): ServiceConfig {
  return ConfigurationManager.getInstance().getConfig();
}

export function getMCPConfig(): MCPConfig {
  return ConfigurationManager.getInstance().getMCPConfig();
}

export function getLocalConfig(): LocalConfig {
  return ConfigurationManager.getInstance().getLocalConfig();
}

export function updateConfig(newConfig: Partial<ServiceConfig>): ServiceConfig {
  return ConfigurationManager.getInstance().updateConfig(newConfig);
} 