import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  RefreshCw, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  BarChart3,
  AlertCircle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { createApiUrl, apiFetch } from '@/lib/api';

interface FunctionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecution: string | null;
  errorRate: number;
  mentionsProcessed: number;
}

interface InngestMonitoringData {
  functionStats: {
    'x-api-worker': FunctionStats;
    'reddit-api-worker': FunctionStats;
    'youtube-api-worker': FunctionStats;
    'google-alerts-api-worker': FunctionStats;
  };
  recentErrors: Array<{
    id: string;
    event_type: string;
    message: string;
    created_at: string;
    error_details?: any;
  }>;
  queueStatus: {
    totalEntries: number;
    pendingEntries: number;
    processingEntries: number;
    completedEntries: number;
  };
  healthMetrics: {
    overallHealthScore: number;
    totalExecutions24h: number;
    totalErrors24h: number;
    errorRate: number;
    lastUpdate: string;
  };
  recommendations: string[];
  timestamp: string;
}

interface InngestMonitoringProps {
  onRefresh?: () => void;
  loading?: boolean;
}

export function InngestMonitoring({ onRefresh, loading }: InngestMonitoringProps) {
  const [data, setData] = useState<InngestMonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInngestData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch('/admin/inngest-monitor');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastRefresh(new Date());
        toast({
          title: "Inngest monitoring data updated",
          description: `Health score: ${result.data.healthMetrics.overallHealthScore}%`,
        });
      } else {
        throw new Error(result.error || 'Failed to fetch Inngest monitoring data');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch Inngest monitoring data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInngestData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchInngestData, 30000);
    return () => clearInterval(interval);
  }, [fetchInngestData]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
    return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
  };

  const getErrorRateColor = (rate: number) => {
    if (rate <= 5) return 'text-green-600';
    if (rate <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${Math.round(ms / 1000)}s`;
  };

  const getFunctionIcon = (functionName: string) => {
    switch (functionName) {
      case 'x-api-worker': return '🐦';
      case 'reddit-api-worker': return '🔴';
      case 'youtube-api-worker': return '📺';
      case 'google-alerts-api-worker': return '🔍';
      default: return '⚙️';
    }
  };

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Inngest monitoring data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inngest Function Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of Inngest functions and event processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchInngestData} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {formatDistanceToNow(lastRefresh)} ago
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.healthMetrics.overallHealthScore}%</div>
                <div className="flex items-center gap-2 mt-2">
                  {getHealthBadge(data.healthMetrics.overallHealthScore)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Executions (24h)</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.healthMetrics.totalExecutions24h}</div>
                <p className="text-xs text-muted-foreground">
                  {data.healthMetrics.totalErrors24h} errors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getErrorRateColor(data.healthMetrics.errorRate)}`}>
                  {data.healthMetrics.errorRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.queueStatus.totalEntries}</div>
                <p className="text-xs text-muted-foreground">
                  {data.queueStatus.pendingEntries} pending
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Function Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Function Performance
              </CardTitle>
              <CardDescription>
                Performance metrics for each Inngest function
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Function</TableHead>
                    <TableHead>Executions</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Avg Duration</TableHead>
                    <TableHead>Mentions Processed</TableHead>
                    <TableHead>Last Execution</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.functionStats).map(([functionName, stats]) => (
                    <TableRow key={functionName}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{getFunctionIcon(functionName)}</span>
                          {functionName.replace('-worker', '')}
                        </div>
                      </TableCell>
                      <TableCell>{stats.totalExecutions}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={getErrorRateColor(stats.errorRate)}>
                            {(100 - stats.errorRate).toFixed(1)}%
                          </span>
                          <div className="flex gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">{stats.successfulExecutions}</span>
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span className="text-xs text-red-600">{stats.failedExecutions}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(stats.averageDuration)}</TableCell>
                      <TableCell>{stats.mentionsProcessed}</TableCell>
                      <TableCell>
                        {stats.lastExecution ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">
                              {formatDistanceToNow(parseISO(stats.lastExecution))} ago
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stats.errorRate > 20 ? (
                          <Badge variant="destructive">High Errors</Badge>
                        ) : stats.totalExecutions === 0 ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : (
                          <Badge variant="default">Healthy</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Errors & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Errors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recent Errors
                </CardTitle>
                <CardDescription>
                  Latest errors from Inngest functions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentErrors.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentErrors.slice(0, 5).map((error) => (
                      <div key={error.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{error.event_type}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(parseISO(error.created_at))} ago
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{error.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent errors</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Recommendations
                </CardTitle>
                <CardDescription>
                  System recommendations based on current metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
