import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Zap, 
  BarChart3, 
  AlertCircle,
  Users,
  Database,
  Shield,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemOverviewProps {
  onRefresh: () => void;
  loading: boolean;
}

export function SystemOverview({ onRefresh, loading }: SystemOverviewProps) {
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  const fetchSystemData = async () => {
    try {
      // Fetch system health
      const healthResponse = await fetch('https://mentions-backend.vercel.app/api/api/admin/system-health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('System health data:', healthData); // Debug log
        setSystemHealth(healthData.data || healthData);
      } else {
        console.warn('System health endpoint not available');
        setSystemHealth(null);
      }

      // Fetch cache stats
      const cacheResponse = await fetch('https://mentions-backend.vercel.app/api/api/admin/cache-stats');
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        console.log('Cache stats data:', cacheData); // Debug log
        setCacheStats(cacheData.data || cacheData);
      } else {
        console.warn('Cache stats endpoint not available');
        setCacheStats(null);
      }
    } catch (error) {
      console.error('Error fetching system data:', error);
      // Don't show toast for missing endpoints, just log the error
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const getHealthStatus = (status: string) => {
    switch (status) {
      case 'healthy': return { color: 'text-green-600', icon: CheckCircle, bg: 'bg-green-100' };
      case 'operational': return { color: 'text-green-600', icon: CheckCircle, bg: 'bg-green-100' };
      case 'active': return { color: 'text-green-600', icon: CheckCircle, bg: 'bg-green-100' };
      case 'processing': return { color: 'text-blue-600', icon: Activity, bg: 'bg-blue-100' };
      case 'warning': return { color: 'text-yellow-600', icon: AlertTriangle, bg: 'bg-yellow-100' };
      case 'degraded': return { color: 'text-yellow-600', icon: AlertTriangle, bg: 'bg-yellow-100' };
      case 'error': return { color: 'text-red-600', icon: XCircle, bg: 'bg-red-100' };
      case 'unhealthy': return { color: 'text-red-600', icon: XCircle, bg: 'bg-red-100' };
      case 'inactive': return { color: 'text-red-600', icon: XCircle, bg: 'bg-red-100' };
      default: return { color: 'text-gray-600', icon: AlertCircle, bg: 'bg-gray-100' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return 'Invalid';
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Overview
          </CardTitle>
          <CardDescription>
            Real-time system status and performance metrics
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
              Refresh All
            </Button>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Database className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">Database</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className={getHealthStatus(systemHealth.database?.status || 'unknown').bg}>
                      {systemHealth.database?.status || 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(systemHealth.database?.last_checked)}
                    </span>
                  </div>
                  {systemHealth.database?.error && (
                    <div className="text-xs text-red-600 mt-1">
                      {systemHealth.database.error}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Wifi className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-sm font-medium">API Endpoints</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className={getHealthStatus(systemHealth.api_endpoints?.status || 'unknown').bg}>
                      {systemHealth.api_endpoints?.status || 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(systemHealth.api_endpoints?.last_checked)}
                    </span>
                  </div>
                  {systemHealth.api_endpoints?.error && (
                    <div className="text-xs text-red-600 mt-1">
                      {systemHealth.api_endpoints.error}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">Queue System</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className={getHealthStatus(systemHealth.queue_system?.status || 'unknown').bg}>
                      {systemHealth.queue_system?.status || 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(systemHealth.queue_system?.last_checked)}
                    </span>
                  </div>
                  {systemHealth.queue_system?.error && (
                    <div className="text-xs text-red-600 mt-1">
                      {systemHealth.queue_system.error}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-sm font-medium">Performance</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className={getHealthStatus('healthy').bg}>
                      {systemHealth.performance?.success_rate || 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {systemHealth.performance?.average_response_time || 'N/A'}
                    </span>
                  </div>
                  {systemHealth.performance?.last_updated && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Updated: {formatTimestamp(systemHealth.performance.last_updated)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!systemHealth && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p>System health data not available</p>
              <p className="text-sm mt-2">Check console for debug information</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      {cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Statistics
            </CardTitle>
            <CardDescription>
              Redis cache performance and usage metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cacheStats.cache_stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {cacheStats.cache_stats.hitRate ? `${(cacheStats.cache_stats.hitRate * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Hit Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {cacheStats.cache_stats.totalKeys || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Keys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {cacheStats.cache_stats.memoryUsage ? `${(cacheStats.cache_stats.memoryUsage / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Memory Usage</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Cache statistics not available</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

