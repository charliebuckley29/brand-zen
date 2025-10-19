import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Users, 
  Zap, 
  Clock,
  TrendingUp,
  TrendingDown,
  ExternalLink
} from 'lucide-react';

interface SourcesDashboardData {
  sources: {
    youtube: {
      googleCloud: {
        dailyQuotaUsed: number;
        dailyQuotaLimit: number;
        remainingQuota: number;
        resetTime: string;
        lastChecked: string;
        error?: string;
      };
      internal: {
        totalCalls: number;
        errorCalls: number;
        errorRate: number;
        uniqueUsers: number;
        uniqueEndpoints: string[];
        lastUsed: string | null;
        callsToday: number;
      };
      userQuotas: {
        totalMentions: number;
        totalApiCalls: number;
        activeUsers: number;
        averageMentionsPerUser: number;
        averageApiCallsPerUser: number;
      };
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
    reddit: {
      apiUsage: {
        rateLimitRemaining: number;
        rateLimitReset: number;
        rateLimitUsed: number;
        lastChecked: string;
        error?: string;
      };
      rateLimit: {
        isNearLimit: boolean;
        remainingRequests: number;
        resetTime: Date;
        warningLevel: 'low' | 'medium' | 'high' | 'critical';
      };
      internal: any;
      userQuotas: any;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
    x: {
      apiUsage: {
        dailyUsage: number;
        monthlyUsage: number;
        rateLimitRemaining: number;
        rateLimitReset: number;
        lastChecked: string;
        error?: string;
      };
      rateLimit: {
        isNearLimit: boolean;
        remainingRequests: number;
        resetTime: Date;
        warningLevel: 'low' | 'medium' | 'high' | 'critical';
        dailyUsage: number;
        monthlyUsage: number;
      };
      internal: any;
      userQuotas: any;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
    google_alert: {
      internal: any;
      userQuotas: any;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
    rss_news: {
      internal: any;
      userQuotas: any;
      status: 'healthy' | 'degraded' | 'unhealthy';
    };
  };
  summary: {
    totalSources: number;
    healthySources: number;
    degradedSources: number;
    unhealthySources: number;
    totalApiCalls: number;
    totalErrors: number;
    totalUsers: number;
  };
  metadata: {
    generatedAt: string;
    processingTime: number;
    dataRange: {
      start: string;
      end: string;
    };
  };
}

const SourcesDashboard: React.FC = () => {
  const [data, setData] = useState<SourcesDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/sources-dashboard');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastRefresh(new Date());
      } else {
        setError(result.error || 'Failed to fetch sources dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default',
      degraded: 'secondary',
      unhealthy: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeUntilReset = (resetTime: string) => {
    const reset = new Date(resetTime);
    const now = new Date();
    const diff = reset.getTime() - now.getTime();
    
    if (diff <= 0) return 'Reset now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading sources dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-6 w-6 text-red-500 mr-2" />
              <div>
                <h3 className="font-semibold text-red-800">Error Loading Dashboard</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <Button 
                  onClick={fetchData} 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sources Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of API sources and quota usage
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {formatDateTime(lastRefresh.toISOString())}
            </span>
          )}
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sources</p>
                <p className="text-2xl font-bold">{data.summary.totalSources}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Healthy</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.healthySources}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                <p className="text-2xl font-bold">{formatNumber(data.summary.totalApiCalls)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{data.summary.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(data.sources).map(([sourceName, sourceData]) => (
          <Card key={sourceName} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  {getStatusIcon(sourceData.status)}
                  <span className="ml-2 capitalize">{sourceName.replace('_', ' ')}</span>
                </CardTitle>
                {getStatusBadge(sourceData.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google Cloud Data (YouTube only) */}
              {sourceName === 'youtube' && sourceData.googleCloud && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Google Cloud Quota
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600">Daily Usage</p>
                      <p className="font-semibold">
                        {formatNumber(sourceData.googleCloud.dailyQuotaUsed)} / {formatNumber(sourceData.googleCloud.dailyQuotaLimit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">Remaining</p>
                      <p className="font-semibold">{formatNumber(sourceData.googleCloud.remainingQuota)}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Reset In</p>
                      <p className="font-semibold">{getTimeUntilReset(sourceData.googleCloud.resetTime)}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Usage %</p>
                      <p className="font-semibold">
                        {formatPercentage((sourceData.googleCloud.dailyQuotaUsed / sourceData.googleCloud.dailyQuotaLimit) * 100)}
                      </p>
                    </div>
                  </div>
                  {sourceData.googleCloud.error && (
                    <div className="mt-3 p-2 bg-red-100 rounded text-red-700 text-sm">
                      Error: {sourceData.googleCloud.error}
                    </div>
                  )}
                </div>
              )}

              {/* Reddit API Usage */}
              {sourceName === 'reddit' && sourceData.apiUsage && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Reddit API Rate Limits
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-orange-600">Remaining</p>
                      <p className="font-semibold">{sourceData.apiUsage.rateLimitRemaining}</p>
                    </div>
                    <div>
                      <p className="text-orange-600">Used</p>
                      <p className="font-semibold">{sourceData.apiUsage.rateLimitUsed}</p>
                    </div>
                    <div>
                      <p className="text-orange-600">Reset In</p>
                      <p className="font-semibold">{getTimeUntilReset(new Date(sourceData.apiUsage.rateLimitReset * 1000).toISOString())}</p>
                    </div>
                    <div>
                      <p className="text-orange-600">Warning Level</p>
                      <p className="font-semibold capitalize">{sourceData.rateLimit.warningLevel}</p>
                    </div>
                  </div>
                  {sourceData.apiUsage.error && (
                    <div className="mt-3 p-2 bg-red-100 rounded text-red-700 text-sm">
                      Error: {sourceData.apiUsage.error}
                    </div>
                  )}
                </div>
              )}

              {/* X/Twitter API Usage */}
              {sourceName === 'x' && sourceData.apiUsage && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    X API Usage
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Daily Usage</p>
                      <p className="font-semibold">{formatNumber(sourceData.apiUsage.dailyUsage)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Monthly Usage</p>
                      <p className="font-semibold">{formatNumber(sourceData.apiUsage.monthlyUsage)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Rate Limit Remaining</p>
                      <p className="font-semibold">{sourceData.apiUsage.rateLimitRemaining}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Warning Level</p>
                      <p className="font-semibold capitalize">{sourceData.rateLimit.warningLevel}</p>
                    </div>
                  </div>
                  {sourceData.apiUsage.error && (
                    <div className="mt-3 p-2 bg-red-100 rounded text-red-700 text-sm">
                      Error: {sourceData.apiUsage.error}
                    </div>
                  )}
                </div>
              )}

              {/* Internal Usage */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Internal Usage (7 days)</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Calls</p>
                    <p className="font-semibold">{formatNumber(sourceData.internal.totalCalls)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Error Rate</p>
                    <p className="font-semibold">{formatPercentage(sourceData.internal.errorRate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unique Users</p>
                    <p className="font-semibold">{sourceData.internal.uniqueUsers}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Calls Today</p>
                    <p className="font-semibold">{formatNumber(sourceData.internal.callsToday)}</p>
                  </div>
                </div>
                {sourceData.internal.lastUsed && (
                  <div className="mt-3 text-sm text-gray-600">
                    Last used: {formatDateTime(sourceData.internal.lastUsed)}
                  </div>
                )}
              </div>

              {/* User Quotas */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3">User Quotas (This Month)</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-600">Total Mentions</p>
                    <p className="font-semibold">{formatNumber(sourceData.userQuotas.totalMentions)}</p>
                  </div>
                  <div>
                    <p className="text-green-600">Active Users</p>
                    <p className="font-semibold">{sourceData.userQuotas.activeUsers}</p>
                  </div>
                  <div>
                    <p className="text-green-600">Avg per User</p>
                    <p className="font-semibold">{formatNumber(sourceData.userQuotas.averageMentionsPerUser)}</p>
                  </div>
                  <div>
                    <p className="text-green-600">API Calls</p>
                    <p className="font-semibold">{formatNumber(sourceData.userQuotas.totalApiCalls)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Generated in {data.metadata.processingTime}ms • 
          Data range: {formatDateTime(data.metadata.dataRange.start)} - {formatDateTime(data.metadata.dataRange.end)}
        </p>
      </div>
    </div>
  );
};

export default SourcesDashboard;
