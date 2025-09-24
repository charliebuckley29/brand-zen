import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  BarChart3, 
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiMonitoringProps {
  onRefresh: () => void;
  loading: boolean;
}

export function ApiMonitoring({ onRefresh, loading }: ApiMonitoringProps) {
  const [apiLimits, setApiLimits] = useState<any>(null);
  const [userQuotaUsage, setUserQuotaUsage] = useState<any>(null);

  const fetchApiData = async () => {
    try {
      // Fetch API limits (real API key status)
      const limitsResponse = await fetch('https://mentions-backend.vercel.app/api/admin/api-limits');
      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        console.log('API limits data:', limitsData); // Debug log
        setApiLimits(limitsData.data || limitsData);
      } else {
        console.warn('API limits endpoint not available');
        setApiLimits(null);
      }

      // Fetch real user quota usage instead of deprecated api-usage
      const quotaResponse = await fetch('https://mentions-backend.vercel.app/api/admin/user-quota-usage');
      if (quotaResponse.ok) {
        const quotaData = await quotaResponse.json();
        console.log('User quota usage data:', quotaData); // Debug log
        setUserQuotaUsage(quotaData.data || quotaData);
      } else {
        console.warn('User quota usage endpoint not available');
        setUserQuotaUsage(null);
      }
    } catch (error) {
      console.error('Error fetching API data:', error);
      // Don't show toast for missing endpoints, just log the error
    }
  };

  useEffect(() => {
    fetchApiData();
  }, []);

  const getApiStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'available': return 'text-green-600';
      case 'configured': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'unavailable': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getApiStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'available': return CheckCircle;
      case 'configured': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      case 'unavailable': return XCircle;
      default: return AlertCircle;
    }
  };

  const getUsageColor = (usage: number, limit: number) => {
    if (limit === 0) return 'text-gray-600';
    const percentage = (usage / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* API Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            API Status Overview
          </CardTitle>
          <CardDescription>
            Real-time API health and rate limit monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={onRefresh} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {apiLimits && apiLimits.limits ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(apiLimits.limits || {}).map(([apiName, apiData]: [string, any]) => {
                const status = apiData.available ? 'available' : 'unavailable';
                const StatusIcon = getApiStatusIcon(status);
                return (
                  <div key={apiName} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`h-5 w-5 ${getApiStatusColor(status)}`} />
                        <span className="font-medium capitalize">{apiName}</span>
                      </div>
                      <Badge variant="default" className={getApiStatusColor(status)}>
                        {status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Status</span>
                        <span className={getApiStatusColor(status)}>
                          {apiData.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      
                      {apiData.data && (
                        <div className="text-xs text-muted-foreground">
                          {apiData.data.message || 'No additional info'}
                        </div>
                      )}
                      
                      {apiData.error && (
                        <div className="text-xs text-red-600">
                          Error: {apiData.error}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p>No API data available</p>
              <p className="text-sm mt-2">Check console for debug information</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Quota Usage */}
      {userQuotaUsage && userQuotaUsage.users && userQuotaUsage.users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              User Quota Usage
            </CardTitle>
            <CardDescription>
              Current quota usage across all users and API sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userQuotaUsage.users.slice(0, 10).map((user: any) => (
                <div key={user.user_id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium">{user.full_name || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">
                        User ID: {user.user_id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {user.quota_usage.map((quota: any) => (
                      <div key={quota.source_type} className="text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium capitalize">{quota.source_type}</span>
                          <span className={getUsageColor(quota.current_usage, quota.monthly_limit)}>
                            {quota.current_usage}/{quota.monthly_limit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              getUsageColor(quota.current_usage, quota.monthly_limit) === 'text-red-600' ? 'bg-red-500' :
                              getUsageColor(quota.current_usage, quota.monthly_limit) === 'text-yellow-600' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ 
                              width: `${Math.min((quota.current_usage / quota.monthly_limit) * 100, 100)}%` 
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {quota.utilization_percentage.toFixed(1)}% used
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Warnings */}
      {apiLimits && apiLimits.warnings && apiLimits.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              API Warnings
            </CardTitle>
            <CardDescription>
              Current issues and warnings for API services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {apiLimits.warnings.map((warning: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    warning.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div>
                    <div className="font-medium">{warning.service}</div>
                    <div className="text-sm text-muted-foreground">{warning.message}</div>
                    {warning.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Details: {JSON.stringify(warning.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}