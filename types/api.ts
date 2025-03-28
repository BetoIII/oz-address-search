export interface OpportunityZoneCheck {
  lat: number
  lon: number
  timestamp: string
  isInOpportunityZone: boolean
  opportunityZoneId?: string
  metadata: {
    version: string
    lastUpdated: string
    featureCount: number
  }
  error?: string
} 