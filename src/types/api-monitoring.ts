export interface ApiSourceHealth {
  source: string;
  healthy: boolean;
  responseTime: number;
  quotaUsed?: number;
  lastChecked: string;
  error?: string;
  details?: {
    apiVersion?: string;
    quotaRemaining?: string;
    quotaReset?: string;
    contentType?: string;
    note?: string;
    testUrl?: string;
  };
}

export interface ApiSourceAnalytics {
  source: string;
  timeRange: {
    start: string;
    end: string;
    hours: number;
  };
  performance: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  };
  results: {
    totalMentions: number;
    noResultsCalls: number;
    lowResultCalls: number;
    mediumResultCalls: number;
    highResultCalls: number;
    averageMentionsPerCall: number;
  };
  errors: {
    totalErrors: number;
    rateLimit: number;
    network: number;
    timeout: number;
    clientError: number;
    serverError: number;
  };
  totalMentionsFound: number;
  totalErrors: number;
}

export interface QueueAnalytics {
  processing: {
    totalProcessed: number;
    averageProcessingTime: number;
    peakProcessingTime: number;
    totalProcessingTime: number;
  };
  users: {
    totalActiveUsers: number;
    averageProcessingPerUser: number;
    topUsers: Array<{userId: string, processed: number}>;
  };
  efficiency: {
    queueUtilization: number;
    processingThroughput: number;
    bottleneckSources: string[];
  };
}

export interface DashboardData {
  overview: {
    totalApiCalls: number;
    totalMentionsFound: number;
    overallSuccessRate: number;
    averageResponseTime: number;
    activeSources: number;
    totalSources: number;
    lastUpdated: string;
  };
  health: {
    overall: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      score: number;
      healthySources: number;
      totalSources: number;
      issues: string[];
    };
    sources: ApiSourceHealth[];
    issues: string[];
  };
  analytics: {
    last24Hours: ApiSourceAnalytics[];
    performanceComparison: Record<string, any>;
    queueAnalytics: QueueAnalytics;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    source: string;
    message: string;
    timestamp: string;
    actionable: boolean;
  }>;
  recommendations: string[];
}

export interface ApiSourceConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

