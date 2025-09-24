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
import { format } from 'date-fns';
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
      const healthResponse = await fetch('https://mentions-backend.vercel.app/api/admin/system-health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSystemHealth(healthData);
      } else {
        console.warn('System health endpoint not available');
        setSystemHealth(null);
      }

      // Fetch cache stats
      const cacheResponse = await fetch('https://mentions-backend.vercel.app/api/admin/cache-stats');
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        setCacheStats(cacheData);
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
      case 'warning': return { color: 'text-yellow-600', icon: AlertTriangle, bg: 'bg-yellow-100' };
      case 'error': return { color: 'text-red-600', icon: XCircle, bg: 'bg-red-100' };
      default: return { color: 'text-gray-600', icon: AlertCircle, bg: 'bg-gray-100' };
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
                      {systemHealth.database?.responseTime || 'N/A'}ms
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Wifi className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-sm font-medium">External APIs</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className={getHealthStatus(systemHealth.apis?.overall || 'unknown').bg}>
                      {systemHealth.apis?.overall || 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {systemHealth.apis?.healthyCount || 0}/{systemHealth.apis?.totalCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">Security</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className={getHealthStatus(systemHealth.security?.status || 'unknown').bg}>
                      {systemHealth.security?.status || 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {systemHealth.security?.threatsBlocked || 0} blocked
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-sm font-medium">Performance</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className={getHealthStatus(systemHealth.performance?.status || 'unknown').bg}>
                      {systemHealth.performance?.status || 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {systemHealth.performance?.avgResponseTime || 'N/A'}ms
                    </span>
                  </div>
                </div>
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {cacheStats.hitRate ? `${(cacheStats.hitRate * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Hit Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {cacheStats.totalKeys || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Total Keys</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {cacheStats.memoryUsage ? `${(cacheStats.memoryUsage / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Memory Usage</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
