import { OpportunityZoneService } from './services';
import { MockOpportunityZoneService } from './mocks/mock-service';

// Environment-based service selection
const isDevelopment = process.env.NODE_ENV === 'development';
const useMocks = isDevelopment && process.env.NEXT_PUBLIC_USE_MOCK_MCP === 'true';

// Service factory that returns either mock or real implementation
export const getOpportunityZoneService = () => {
  if (useMocks) {
    console.log('Using mock MCP services for development');
    return MockOpportunityZoneService;
  }
  return OpportunityZoneService;
};

// Export a default instance for convenience
export default getOpportunityZoneService(); 