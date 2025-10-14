import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Loader2, 
  XCircle, 
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  RotateCcw,
  Play,
  Pause,
  BarChart3,
  Filter,
  Search,
  Download,
  Settings,
  ExternalLink,
  Database,
  Terminal,
  Copy,
  Eye,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createApiUrl } from '@/lib/api';
import { useQueueMonitoring } from '../../hooks/useQueueMonitoring';
import { ErrorLogDetailsModal } from './ErrorLogDetailsModal';

// Types
interface QueueHealthData {
  systemHealth: 'healthy' | 'degraded' | 'critical';
  totalQueues: number;
  healthyQueues: number;
  failedQueues: number;
  stuckQueues: number;
  apiBreakdown: {
    [apiSource: string]: {
      status: 'healthy' | 'degraded' | 'critical';
      failedCount: number;
      retryCount: number;
      lastSuccess: string | null;
      lastFailure: string | null;
      averageRetryTime: number;
    };
  };
  recentFailures: QueueFailure[];
  recentRecoveries: QueueRecovery[];
}

interface QueueFailure {
  id: string;
  apiSource: string;
  userId: string;
  errorType: string;
  errorMessage: string;
  timestamp: string;
  retryCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface QueueRecovery {
  id: string;
  apiSource: string;
  userId: string;
  recoveryType: string;
  timestamp: string;
  success: boolean;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  apiSource: string;
  userId: string;
  errorType: string;
  errorMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  stackTrace?: string;
  requestData?: any;
  responseData?: any;
  logLocations?: {
    vercelUrl: string;
    databaseId: string;
    consoleFilter: string;
    supportTicketId: string;
  };
  context?: {
    environment: 'production' | 'staging';
    requestId: string;
    relatedErrors: string[];
  };
  guidance?: {
    severity: 'auto-resolvable' | 'user-action' | 'support-required';
    instructions: string[];
    suggestedActions: string[];
  };
}

interface RetryAnalytics {
  overallSuccessRate: number;
  successRateByApi: Record<string, number>;
  averageRetryTime: number;
  commonFailureReasons: Array<{ reason: string; count: number; percentage: number }>;
  retryDistribution: Array<{ retryCount: number; frequency: number }>;
}

// Utility functions for log access
const getVercelLogUrl = (errorId: string, timestamp: string) => {
  const projectName = 'brand-protected';
  const timestampParam = new Date(timestamp).toISOString();
  return `https://vercel.com/dashboard/projects/${projectName}/functions/logs?filter=${errorId}&timestamp=${timestampParam}`;
};

const getConsoleInstructions = (errorType: string, timestamp: string) => {
  return {
    steps: [
      "1. Open browser Developer Tools (F12)",
      "2. Go to Console tab", 
      "3. Look for errors with timestamp: " + new Date(timestamp).toLocaleString(),
      "4. Filter by 'Brand Protected' prefix"
    ],
    filter: `Brand Protected ${errorType}`,
    timestamp: new Date(timestamp).toISOString()
  };
};

const getErrorGuidance = (errorType: string, message: string) => {
  const guidanceMap: Record<string, any> = {
    'queue.history_record_error': {
      severity: 'auto-resolvable',
      instructions: ['This is a database logging issue that will resolve automatically'],
      actions: ['Monitor queue status', 'Check system health dashboard']
    },
    'debug.automation_status.logs_error': {
      severity: 'auto-resolvable', 
      instructions: ['Query timeout issue - system is working normally'],
      actions: ['Check Vercel logs for more details', 'Monitor API performance']
    },
    'queue-error-logs.error': {
      severity: 'auto-resolvable',
      instructions: ['Log query optimization in progress'],
      actions: ['System will auto-recover', 'Check back in 5 minutes']
    },
    'fetch.error': {
      severity: 'user-action',
      instructions: ['Check your API keys and rate limits'],
      actions: ['Verify API credentials', 'Check quota usage', 'Wait for rate limit reset']
    },
    'network.error': {
      severity: 'auto-resolvable',
      instructions: ['Network connectivity issue - will retry automatically'],
      actions: ['Check internet connection', 'Monitor system status']
    }
  };
  
  return guidanceMap[errorType] || {
    severity: 'support-required',
    instructions: ['Unknown error type - contact support'],
    actions: ['Copy log ID', 'Contact support team']
  };
};

export function QueueErrorMonitoring() {
  const [healthData, setHealthData] = useState<QueueHealthData | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [retryAnalytics, setRetryAnalytics] = useState<RetryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Filters
  const [timeRange, setTimeRange] = useState('24h');
  const [apiSourceFilter, setApiSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [selectedErrorLog, setSelectedErrorLog] = useState<ErrorLog | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const { toast } = useToast();

  // Log access functions
  const openVercelLogs = (errorId: string, timestamp: string) => {
    const url = getVercelLogUrl(errorId, timestamp);
    window.open(url, '_blank');
    toast({
      title: "Opening Vercel Logs",
      description: "Vercel dashboard opened in new tab"
    });
  };

  const showDatabaseLogs = async (errorId: string) => {
    try {
      // Fetch related database logs
      const response = await fetch(createApiUrl(`/api/admin/queue-error-logs?limit=10&search=${errorId}`));
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Database Logs",
          description: `Found ${data.logs?.length || 0} related log entries`
        });
        // Could open a modal here to show the logs
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch database logs",
        variant: "destructive"
      });
    }
  };

  const showConsoleInstructions = (log: ErrorLog) => {
    const instructions = getConsoleInstructions(log.errorType, log.timestamp);
    const message = instructions.steps.join('\n');
    toast({
      title: "Console Log Instructions",
      description: message,
      duration: 10000
    });
  };

  const copyLogId = (errorId: string) => {
    navigator.clipboard.writeText(errorId);
    toast({
      title: "Log ID Copied",
      description: `Log ID ${errorId} copied to clipboard`
    });
  };

  const openErrorDetails = (log: ErrorLog) => {
    setSelectedErrorLog(log);
    setIsDetailsModalOpen(true);
  };

  // Add queue monitoring hook for basic queue status
  const {
    queueData,
    loading: queueLoading,
    error: queueError,
    lastRefresh: queueLastRefresh,
    refreshQueueStatus,
    resetAllQueues: resetAllQueuesFromHook,
    resetQueueByApiSource: resetQueueByApiSourceFromHook,
    getQueueStatusColor,
    getQueueStatusText,
    formatTimeAgo: formatTimeAgoFromHook,
    getApiSourceDisplayName: getApiSourceDisplayNameFromHook,
    getApiSourceIcon
  } = useQueueMonitoring({ autoRefresh: true, refreshInterval: 30000 });

  // Fetch all queue error data
  const fetchQueueErrorData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch health data
      const healthResponse = await fetch(createApiUrl('/admin/queue-health-detailed'));
      const healthResult = await healthResponse.json();
      
      // Fetch error logs
      const logsResponse = await fetch(createApiUrl('/admin/queue-error-logs?limit=100&hours=24'));
      const logsResult = await logsResponse.json();
      
      // Fetch retry analytics (we'll create this endpoint)
      const analyticsResponse = await fetch(createApiUrl('/admin/queue-error-analytics'));
      const analyticsResult = await analyticsResponse.json();

      if (healthResult.success) {
        setHealthData(healthResult.data);
      }

      if (logsResult.success) {
        // Use the transformed logs from the new endpoint and enhance with guidance
        const rawLogs = logsResult.data?.errors || [];
        const enhancedLogs = rawLogs.map((log: ErrorLog) => ({
          ...log,
          guidance: log.guidance || getErrorGuidance(log.errorType, log.errorMessage),
          logLocations: log.logLocations || {
            vercelUrl: getVercelLogUrl(log.id, log.timestamp),
            databaseId: log.id,
            consoleFilter: `Brand Protected ${log.errorType}`,
            supportTicketId: `BP-${log.id.slice(0, 8)}`
          },
          context: log.context || {
            environment: 'production',
            requestId: log.id,
            relatedErrors: []
          }
        }));
        setErrorLogs(enhancedLogs);
        
        // Log success for debugging
        console.log(`✅ Loaded ${enhancedLogs.length} error logs from backend`);
      } else {
        console.error('❌ Failed to load error logs:', logsResult.error);
        setErrorLogs([]);
      }

      if (analyticsResult.success) {
        setRetryAnalytics(analyticsResult.data);
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Error fetching queue error data:', err);
      setError('Failed to fetch queue error data');
      toast({
        title: "Error",
        description: "Failed to fetch queue error data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Recovery actions - use the hook functions
  const resetQueueByApiSource = useCallback(async (apiSource: string) => {
    try {
      await resetQueueByApiSourceFromHook(apiSource);
      await fetchQueueErrorData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to reset ${apiSource} queue: ${err.message}`,
        variant: "destructive"
      });
    }
  }, [resetQueueByApiSourceFromHook, toast]);

  const resetAllQueues = useCallback(async () => {
    try {
      await resetAllQueuesFromHook();
      await fetchQueueErrorData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to reset all queues: ${err.message}`,
        variant: "destructive"
      });
    }
  }, [resetAllQueuesFromHook, toast]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchQueueErrorData();
    const interval = setInterval(fetchQueueErrorData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter error logs
  const filteredErrorLogs = errorLogs.filter(log => {
    const matchesTimeRange = true; // TODO: Implement time range filtering
    const matchesApiSource = apiSourceFilter === 'all' || log.apiSource === apiSourceFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesSearch = searchTerm === '' || 
      log.errorMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.errorType.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTimeRange && matchesApiSource && matchesSeverity && matchesSearch;
  });

  // Helper functions
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getApiSourceDisplayName = (apiSource: string) => {
    const displayNames: Record<string, string> = {
      'youtube': 'YouTube',
      'reddit': 'Reddit',
      'x': 'X (Twitter)',
      'google_alert': 'Google Alerts',
      'rss_news': 'RSS News'
    };
    return displayNames[apiSource] || apiSource;
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading queue error data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Queue Error Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor queue health, errors, and retry patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchQueueErrorData} 
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
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {formatTimeAgo(lastRefresh.toISOString())}
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

      {/* Queue Status Overview */}
      {queueData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Queue Status Overview
            </CardTitle>
            <CardDescription>
              Real-time queue monitoring and management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  onClick={refreshQueueStatus} 
                  disabled={queueLoading}
                  variant="outline"
                  size="sm"
                >
                  {queueLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Button 
                  onClick={resetAllQueues}
                  variant="destructive"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reset All Failed
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {queueLastRefresh ? formatTimeAgoFromHook(queueLastRefresh.toISOString()) : 'Never'}
              </div>
            </div>

            {queueError && (
              <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Queue Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{queueError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {queueData.summary.byStatus.pending}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {queueData.summary.byStatus.processing}
                </div>
                <div className="text-sm text-muted-foreground">Processing</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {queueData.summary.byStatus.completed}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {queueData.summary.byStatus.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue by API Source */}
      {queueData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Queue by API Source
            </CardTitle>
            <CardDescription>
              Breakdown of queue entries by API source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(queueData.summary.byApiSource).map(([apiSource, stats]) => (
                <div key={apiSource} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getApiSourceIcon(apiSource)}</span>
                    <div>
                      <div className="font-medium">{getApiSourceDisplayNameFromHook(apiSource)}</div>
                      <div className="text-sm text-muted-foreground">
                        Total: {stats.total} | Avg Priority: {stats.averagePriority.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <Badge variant="outline" className="text-xs">
                          {stats.pending} pending
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {stats.processing} processing
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {stats.completed} completed
                        </Badge>
                        {stats.failed > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {stats.failed} failed
                          </Badge>
                        )}
                      </div>
                    </div>
                    {stats.failed > 0 && (
                      <Button
                        onClick={() => resetQueueByApiSource(apiSource)}
                        variant="destructive"
                        size="sm"
                      >
                        Reset Failed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health Overview */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Overview
            </CardTitle>
            <CardDescription>
              Current status of all queue systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{healthData.healthyQueues}</div>
                <div className="text-sm text-muted-foreground">Healthy</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{healthData.stuckQueues}</div>
                <div className="text-sm text-muted-foreground">Stuck</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">{healthData.failedQueues}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{healthData.totalQueues}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>

            {/* API Source Health */}
            <div className="space-y-3">
              <h4 className="font-medium">API Source Health</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(healthData.apiBreakdown).map(([apiSource, data]) => (
                  <div key={apiSource} className={`p-3 border rounded-lg ${getHealthStatusColor(data.status)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getHealthStatusIcon(data.status)}
                        <span className="font-medium">{getApiSourceDisplayName(apiSource)}</span>
                      </div>
                      <Badge className={getHealthStatusColor(data.status)}>
                        {data.status}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Failed: {data.failedCount}</div>
                      <div>Retries: {data.retryCount}</div>
                      {data.lastFailure && (
                        <div>Last failure: {formatTimeAgo(data.lastFailure)}</div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resetQueueByApiSource(apiSource)}
                        disabled={loading}
                        className="w-full"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset Queue
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  onClick={resetAllQueues}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All Failed Queues
                </Button>
                <Button
                  onClick={fetchQueueErrorData}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Force Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Queue Entries */}
      {queueData && queueData.entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Queue Entries</CardTitle>
            <CardDescription>
              Latest queue activity and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queueData.entries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${getQueueStatusColor(entry.status)}`} />
                    <div>
                      <div className="text-sm font-medium">
                        {getApiSourceDisplayNameFromHook(entry.api_source)} - User {entry.user_id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Priority: {entry.priority_score} | Queued: {formatTimeAgoFromHook(entry.queued_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">
                      {getQueueStatusText(entry.status)}
                    </Badge>
                    {entry.last_served_at && (
                      <span className="text-xs text-muted-foreground">
                        Served: {formatTimeAgoFromHook(entry.last_served_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Logs and Analytics */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="analytics">Retry Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Logs
              </CardTitle>
              <CardDescription>
                Recent queue errors and failures
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search errors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={apiSourceFilter} onValueChange={setApiSourceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="API Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="google_alert">Google Alerts</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="reddit">Reddit</SelectItem>
                    <SelectItem value="x">X (Twitter)</SelectItem>
                    <SelectItem value="rss_news">RSS News</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Error Logs Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>API Source</TableHead>
                      <TableHead>Error Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Log Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredErrorLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <CheckCircle className="h-12 w-12 text-green-500" />
                            <h3 className="text-lg font-semibold">No Errors Found</h3>
                            <p className="text-muted-foreground">
                              System is running smoothly with no errors in the last {timeRange}.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredErrorLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {formatTimeAgo(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getApiSourceDisplayName(log.apiSource)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.errorType}
                        </TableCell>
                        <TableCell className="text-sm max-w-md truncate">
                          {log.errorMessage}
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {log.retryCount}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View logs</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openErrorDetails(log)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openVercelLogs(log.id, log.timestamp)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Vercel Dashboard
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => showDatabaseLogs(log.id)}>
                                <Database className="h-4 w-4 mr-2" />
                                Database Logs
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => showConsoleInstructions(log)}>
                                <Terminal className="h-4 w-4 mr-2" />
                                Console Instructions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyLogId(log.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Log ID
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Retry Analytics
              </CardTitle>
              <CardDescription>
                Success rates and failure patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {retryAnalytics ? (
                <div className="space-y-6">
                  {/* Overall Success Rate */}
                  <div className="text-center p-6 border rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {retryAnalytics.overallSuccessRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Success Rate</div>
                    {retryAnalytics.summary && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {retryAnalytics.summary.totalAttempts} total attempts, {retryAnalytics.summary.completedEntries} completed
                      </div>
                    )}
                  </div>

                  {/* Success Rate by API */}
                  <div>
                    <h4 className="font-medium mb-3">Success Rate by API Source</h4>
                    <div className="space-y-2">
                      {Object.entries(retryAnalytics.successRateByApi).map(([apiSource, rate]) => (
                        <div key={apiSource} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{getApiSourceDisplayName(apiSource)}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {rate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Retry Distribution */}
                  {retryAnalytics.retryDistribution && retryAnalytics.retryDistribution.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Retry Distribution</h4>
                      <div className="space-y-2">
                        {retryAnalytics.retryDistribution.slice(0, 5).map((dist, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm">
                              {dist.retryCount === 0 ? 'No retries' : `${dist.retryCount} retry${dist.retryCount > 1 ? 'ies' : ''}`}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {dist.frequency} entries
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Common Failure Reasons */}
                  {retryAnalytics.commonFailureReasons && retryAnalytics.commonFailureReasons.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Common Failure Reasons</h4>
                      <div className="space-y-2">
                        {retryAnalytics.commonFailureReasons.slice(0, 5).map((reason, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm">{reason.reason}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {reason.count} ({reason.percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Retry analytics data not available</p>
                  <p className="text-sm">This feature requires additional backend endpoints</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Log Details Modal */}
      <ErrorLogDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        errorLog={selectedErrorLog}
      />
    </div>
  );
}
