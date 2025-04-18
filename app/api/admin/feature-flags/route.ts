import { NextRequest, NextResponse } from 'next/server';
import { featureFlags, FeatureFlag, FEATURE_FLAGS } from '@/lib/feature-flags';
import { getOpportunityZoneService } from '@/lib/service-provider/factory';
import { ResilientOpportunityZoneService } from '@/lib/service-provider/resilient';

// Basic auth middleware
async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Use environment variables for credentials
  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  return username === validUsername && password === validPassword;
}

// GET /api/admin/feature-flags
export async function GET(request: NextRequest) {
  if (!await authenticate(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Get all feature flags
    const flags = featureFlags.getAllFlags();

    // Get service metrics if available
    const service = await getOpportunityZoneService();
    let metrics = {};
    
    if (service instanceof ResilientOpportunityZoneService) {
      metrics = service.getMetrics();
    }

    return NextResponse.json({
      flags,
      metrics,
      currentService: service instanceof ResilientOpportunityZoneService 
        ? service.getCurrentServiceType()
        : 'unknown'
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

// POST /api/admin/feature-flags
export async function POST(request: NextRequest) {
  if (!await authenticate(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { flagName, enabled, updatedBy } = body;

    if (!flagName || typeof enabled !== 'boolean' || !updatedBy) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!(flagName in FEATURE_FLAGS)) {
      return NextResponse.json(
        { error: 'Invalid feature flag name' },
        { status: 400 }
      );
    }

    const updatedFlag = enabled
      ? featureFlags.enableFlag(flagName, updatedBy)
      : featureFlags.disableFlag(flagName, updatedBy);

    return NextResponse.json({ flag: updatedFlag });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
} 