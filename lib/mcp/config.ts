import { MCPConfig } from './client';

export function loadMCPConfig(): MCPConfig {
  const serverUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL;
  const apiKey = process.env.MCP_API_KEY;

  if (!serverUrl) {
    throw new Error('MCP server URL not configured. Please set NEXT_PUBLIC_MCP_SERVER_URL environment variable.');
  }

  return {
    serverUrl: serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl,
    apiKey
  };
}

export const DEFAULT_MCP_CONFIG: MCPConfig = {
  serverUrl: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001'
    : 'https://your-production-mcp-server.com',
  apiKey: process.env.MCP_API_KEY
}; 