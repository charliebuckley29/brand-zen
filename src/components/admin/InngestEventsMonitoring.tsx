import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
  Info,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { createApiUrl, apiFetch } from '@/lib/api';

interface EventStreamItem {
  id: string;
  timestamp: string;
  eventType: string;
  level: string;
  message: string;
  data: any;
  errorDetails?: any;
  function: string;
  status: string;
  duration?: number;
  userId?: string;
}

interface FunctionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecution: string | null;
  errorRate: number;
  mentionsProcessed: number;
  status: string;
  recentErrors: Array<{
    timestamp: string;
    message: string;
    errorDetails?: any;
  }>;
}

interface ProcessingMetrics {
  totalMentions: number;
  processedMentions: number;
  pendingMentions: number;
  processingRate: number;
  sourceBreakdown: Record<string, number>;
  hourlyProcessing: Array<{
    hour: number;
    processed: number;
    total: number;
    rate: number;
  }>;
  averageProcessingTime: number;
}

interface SystemHealth {
  activeLocks: number;
  staleLocks: number;
  queueStatus: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  healthScore: number;
  lockHealth: number;
  queueHealth: number;
}

interface RealTimeStatus {
  activeFunctions: Array<{
    function: string;
    lockedAt: string;
    expiresAt: string;
    status: string;
  }>;
  recentActivity: Array<{
    timestamp: string;
    eventType: string;
    level: string;
    message: string;
  }>;
  systemStatus: string;
  lastActivity: string | null;
}

interface InngestEventsData {
  timeRange: string;
  functionFilter: string;
  eventStream: EventStreamItem[];
  functionMetrics: Record<string, FunctionMetrics>;
  processingMetrics: ProcessingMetrics;
  systemHealth: SystemHealth;
  realTimeStatus: RealTimeStatus;
  recommendations: string[];
  timestamp: string;
}

interface InngestEventsMonitoringProps {
  onRefresh?: () => void;
  loading?: boolean;
}

export function InngestEventsMonitoring({ onRefresh, loading }: InngestEventsMonitoringProps) {
  const [data, setData] = useState<InngestEventsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [functionFilter, setFunctionFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const { toast } = useToast();

  const fetchInngestEventsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        timeRange,
        function: functionFilter
      });
      
      const response = await apiFetch(`/admin/inngest-events?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastRefresh(new Date());
        toast({
          title: "Inngest events data updated",
          description: `Health score: ${result.data.systemHealth.healthScore}%`,
        });
      } else {
        throw new Error(result.error || 'Failed to fetch Inngest events data');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch Inngest events data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, functionFilter, toast]);

  useEffect(() => {
    fetchInngestEventsData();
    
    // Auto-refresh every 10 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchInngestEventsData, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchInngestEventsData, autoRefresh]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'degraded': return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case 'critical': return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case 'inactive': return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-800">Unknown</Badge>;
    }
  };

  const getEventStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="h-3 w-3 animate-spin text-blue-600" />;
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'error': return <XCircle className="h-3 w-3 text-red-600" />;
      case 'failed': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default: return <Info className="h-3 w-3 text-gray-600" />;
    }
  };

  const getFunctionIcon = (functionName: string) => {
    switch (functionName) {
      case 'schedule-user-fetches': return '⏰';
      case 'queue-manager': return '📋';
      case 'x-api-worker': return '🐦';
      case 'reddit-api-worker': return '🔴';
      case 'youtube-api-worker': return '📺';
      case 'google-alerts-api-worker': return '🔍';
      case 'single-mention-processor': return '💭';
      case 'continuous-sentiment-processor': return '🔄';
      case 'high-frequency-sentiment-processor': return '⚡';
      case 'enhanced-batch-sentiment-processor': return '📦';
      default: return '⚙️';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${Math.round(ms / 1000)}s`;
  };

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Inngest events data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inngest Events Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of Inngest events and function processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={functionFilter} onValueChange={setFunctionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Functions</SelectItem>
              <SelectItem value="fetching">Fetching Functions</SelectItem>
              <SelectItem value="sentiment">Sentiment Functions</SelectItem>
              <SelectItem value="scheduled">Scheduled Functions</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button 
            onClick={fetchInngestEventsData} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(lastRefresh)} ago
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
          {/* Real-Time Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.systemHealth.healthScore}%</div>
                <div className="flex items-center gap-2 mt-2">
                  {getHealthBadge(data.systemHealth.healthScore)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold capitalize">{data.realTimeStatus.systemStatus}</div>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(data.realTimeStatus.systemStatus)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Functions</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.systemHealth.activeLocks}</div>
                <p className="text-xs text-muted-foreground">
                  {data.systemHealth.staleLocks} stale
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.processingMetrics.processingRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {data.processingMetrics.pendingMentions} pending
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">Event Stream</TabsTrigger>
              <TabsTrigger value="functions">Functions</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Function Performance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Function Performance Overview
                  </CardTitle>
                  <CardDescription>
                    Performance metrics for all Inngest functions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Function</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Executions</TableHead>
                        <TableHead>Success Rate</TableHead>
                        <TableHead>Avg Duration</TableHead>
                        <TableHead>Last Execution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(data.functionMetrics).map(([functionName, metrics]) => (
                        <TableRow key={functionName}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{getFunctionIcon(functionName)}</span>
                              {functionName.replace(/-/g, ' ')}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(metrics.status)}</TableCell>
                          <TableCell>{metrics.totalExecutions}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={metrics.errorRate > 20 ? 'text-red-600' : 'text-green-600'}>
                                {(100 - metrics.errorRate).toFixed(1)}%
                              </span>
                              <div className="flex gap-1">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-green-600">{metrics.successfulExecutions}</span>
                                <XCircle className="h-3 w-3 text-red-600" />
                                <span className="text-xs text-red-600">{metrics.failedExecutions}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDuration(metrics.averageDuration)}</TableCell>
                          <TableCell>
                            {metrics.lastExecution ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">
                                  {formatDistanceToNow(parseISO(metrics.lastExecution))} ago
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    System Recommendations
                  </CardTitle>
                  <CardDescription>
                    Automated recommendations based on current system metrics
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
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              {/* Event Stream */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Real-Time Event Stream
                  </CardTitle>
                  <CardDescription>
                    Live view of Inngest events and function processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {data.eventStream.slice(0, 50).map((event) => (
                      <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0">
                          {getEventStatusIcon(event.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{event.function}</span>
                            <Badge variant="outline" className="text-xs">
                              {event.eventType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(parseISO(event.timestamp))} ago
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{event.message}</p>
                          {event.duration && (
                            <span className="text-xs text-blue-600">
                              Duration: {formatDuration(event.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="functions" className="space-y-4">
              {/* Detailed Function Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(data.functionMetrics).map(([functionName, metrics]) => (
                  <Card key={functionName}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>{getFunctionIcon(functionName)}</span>
                        {functionName.replace(/-/g, ' ')}
                      </CardTitle>
                      <CardDescription>
                        Detailed metrics for {functionName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Total Executions</p>
                          <p className="text-2xl font-bold">{metrics.totalExecutions}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Success Rate</p>
                          <p className="text-2xl font-bold text-green-600">
                            {(100 - metrics.errorRate).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Avg Duration</p>
                          <p className="text-2xl font-bold">{formatDuration(metrics.averageDuration)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Mentions Processed</p>
                          <p className="text-2xl font-bold">{metrics.mentionsProcessed}</p>
                        </div>
                      </div>
                      
                      {metrics.recentErrors.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Recent Errors</p>
                          <div className="space-y-2">
                            {metrics.recentErrors.map((error, index) => (
                              <div key={index} className="p-2 bg-red-50 border border-red-200 rounded">
                                <p className="text-xs text-red-800">{error.message}</p>
                                <p className="text-xs text-red-600">
                                  {formatDistanceToNow(parseISO(error.timestamp))} ago
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="processing" className="space-y-4">
              {/* Processing Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Processing Overview</CardTitle>
                    <CardDescription>
                      Overall processing statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Total Mentions</p>
                        <p className="text-2xl font-bold">{data.processingMetrics.totalMentions}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Processed</p>
                        <p className="text-2xl font-bold text-green-600">
                          {data.processingMetrics.processedMentions}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {data.processingMetrics.pendingMentions}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Processing Rate</p>
                        <p className="text-2xl font-bold">
                          {data.processingMetrics.processingRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Source Breakdown</CardTitle>
                    <CardDescription>
                      Mentions by source type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(data.processingMetrics.sourceBreakdown).map(([source, count]) => (
                        <div key={source} className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{source}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Queue Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Queue Status</CardTitle>
                  <CardDescription>
                    Current queue processing status
                    </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium">Total</p>
                      <p className="text-2xl font-bold">{data.systemHealth.queueStatus.total}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {data.systemHealth.queueStatus.pending}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Processing</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {data.systemHealth.queueStatus.processing}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {data.systemHealth.queueStatus.completed}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Failed</p>
                      <p className="text-2xl font-bold text-red-600">
                        {data.systemHealth.queueStatus.failed}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
