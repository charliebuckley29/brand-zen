import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Zap,
  Settings,
  Eye,
  AlertCircle,
  XCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { createApiUrl } from '@/lib/api';

interface DiagnosticData {
  timestamp: string;
  systemHealth: {
    overall: 'healthy' | 'warning' | 'error';
    issues: string[];
    warnings: string[];
    checks: {
      systemLocks: string;
      openaiKey: string;
      database: string;
    };
  };
  queueAnalysis: {
    totalPending: number;
    totalProcessed: number;
    errorMarked: number;
    ageDistribution: {
      under1hour: number;
      under24hours: number;
      under7days: number;
      over7days: number;
    };
    oldestPending: any;
    queueHealth: string;
  };
  errorAnalysis: {
    totalErrors: number;
    recentErrors: number;
    errorCategories: {
      openai_api_error: number;
      content_too_long: number;
      empty_content: number;
      parsing_error: number;
      timeout_error: number;
      unknown_error: number;
    };
    recentErrorMentions: any[];
    errorRate: number;
  };
  performanceMetrics: {
    last_hour: { processed: number; rate: number };
    last_6_hours: { processed: number; rate: number };
    last_24_hours: { processed: number; rate: number };
    last_7_days: { processed: number; rate: number };
    averageProcessingTime: number;
  };
  contentAnalysis: {
    total: number;
    empty_content: number;
    null_string_content: number;
    too_long_content: number;
    valid_content: number;
    source_breakdown: Record<string, number>;
  };
  processingHistory: Array<{
    hour: number;
    timestamp: string;
    processed: number;
  }>;
  recommendations: string[];
}

interface LiveData {
  timestamp: string;
  currentStatus: {
    isProcessing: boolean;
    processingSince: string | null;
    estimatedCompletion: string | null;
    activeWorkers: number;
    status: 'processing' | 'idle';
  };
  liveQueue: {
    currentSize: number;
    recentAdditions: number;
    recentProcessed: number;
    velocity: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  activeOperations: Array<{
    name: string;
    status: string;
    lastRun: string | null;
    health: string;
  }>;
  recentActivity: {
    last_5_minutes: { processed: number; errors: number; rate: number };
    last_15_minutes: { processed: number; errors: number; rate: number };
    last_hour: { processed: number; errors: number; rate: number };
  };
  systemAlerts: Array<{
    type: string;
    message: string;
    severity: string;
    timestamp: string;
  }>;
}

export function SentimentDiagnosticsDashboard() {
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch(createApiUrl('/admin/sentiment-diagnostics'));
      if (response.ok) {
        const result = await response.json();
        setDiagnosticData(result.diagnostics);
      } else {
        toast.error('Failed to fetch diagnostics');
      }
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      toast.error('Failed to fetch diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      const response = await fetch(createApiUrl('/admin/sentiment-live-monitor'));
      if (response.ok) {
        const result = await response.json();
        setLiveData(result.liveData);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  };

  const triggerWorker = async () => {
    try {
      const response = await fetch(createApiUrl('/mentions/sentiment-worker-unified'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize: 5,
          maxProcessingTime: 180000,
          skipEmpty: true,
          useQueueLock: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Worker triggered: ${result.stats?.totalProcessed || 0} processed`);
        await fetchDiagnostics();
      } else {
        toast.error('Failed to trigger worker');
      }
    } catch (error) {
      console.error('Error triggering worker:', error);
      toast.error('Failed to trigger worker');
    }
  };

  const resetFailedMentions = async () => {
    try {
      const response = await fetch(createApiUrl('/admin/reset-failed-sentiment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Reset ${result.resetCount} failed mentions`);
        await fetchDiagnostics();
      } else {
        toast.error('Failed to reset failed mentions');
      }
    } catch (error) {
      console.error('Error resetting failed mentions:', error);
      toast.error('Failed to reset failed mentions');
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchLiveData();
  }, []);

  useEffect(() => {
    if (liveMode) {
      const interval = setInterval(() => {
        fetchLiveData();
      }, 5000); // Update every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [liveMode]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sentiment Worker Diagnostics</h2>
          <p className="text-muted-foreground">
            Comprehensive monitoring and debugging for sentiment analysis system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setLiveMode(!liveMode)}
            variant={liveMode ? "default" : "outline"}
            size="sm"
          >
            {liveMode ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {liveMode ? 'Stop Live' : 'Live Mode'}
          </Button>
          <Button onClick={fetchDiagnostics} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* System Alerts */}
      {liveData?.systemAlerts && liveData.systemAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveData.systemAlerts.map((alert, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {alert.severity}
                </Badge>
                <span className="text-sm">{alert.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Live Status */}
      {liveData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Status
              {liveMode && <Badge variant="outline">Live</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${
                  liveData.currentStatus.isProcessing ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm font-medium">Worker Status</span>
                <Badge variant={liveData.currentStatus.isProcessing ? 'default' : 'secondary'}>
                  {liveData.currentStatus.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Queue Size</span>
                <Badge variant="outline">{liveData.liveQueue.currentSize}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {liveData.liveQueue.trend === 'increasing' ? 
                  <TrendingUp className="h-4 w-4 text-red-500" /> :
                  liveData.liveQueue.trend === 'decreasing' ?
                  <TrendingDown className="h-4 w-4 text-green-500" /> :
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                }
                <span className="text-sm font-medium">Queue Trend</span>
                <Badge variant="outline">{liveData.liveQueue.trend}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Velocity</span>
                <Badge variant="outline">{liveData.liveQueue.velocity}/min</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Diagnostics */}
      {diagnosticData && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="queue">Queue Analysis</TabsTrigger>
            <TabsTrigger value="errors">Error Analysis</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="content">Content Analysis</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getHealthIcon(diagnosticData.systemHealth.overall)}
                  System Health
                  <Badge variant={diagnosticData.systemHealth.overall === 'healthy' ? 'default' : 'destructive'}>
                    {diagnosticData.systemHealth.overall}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">System Checks</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="text-sm">Database</span>
                        <Badge variant={diagnosticData.systemHealth.checks.database === 'connected' ? 'default' : 'destructive'}>
                          {diagnosticData.systemHealth.checks.database}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="text-sm">System Locks</span>
                        <Badge variant={diagnosticData.systemHealth.checks.systemLocks === 'available' ? 'default' : 'destructive'}>
                          {diagnosticData.systemHealth.checks.systemLocks}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm">OpenAI Key</span>
                        <Badge variant={diagnosticData.systemHealth.checks.openaiKey === 'available' ? 'default' : 'destructive'}>
                          {diagnosticData.systemHealth.checks.openaiKey}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Issues</h4>
                    {diagnosticData.systemHealth.issues.length > 0 ? (
                      <ul className="text-sm text-red-600 space-y-1">
                        {diagnosticData.systemHealth.issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-green-600">No critical issues</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Warnings</h4>
                    {diagnosticData.systemHealth.warnings.length > 0 ? (
                      <ul className="text-sm text-yellow-600 space-y-1">
                        {diagnosticData.systemHealth.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">No warnings</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {diagnosticData.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {diagnosticData.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Queue Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Queue Status</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Pending</span>
                        <Badge variant="outline">{diagnosticData.queueAnalysis.totalPending}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Processed</span>
                        <Badge variant="outline">{diagnosticData.queueAnalysis.totalProcessed}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Error Marked</span>
                        <Badge variant="outline">{diagnosticData.queueAnalysis.errorMarked}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Queue Health</span>
                        <Badge variant={diagnosticData.queueAnalysis.queueHealth === 'healthy' ? 'default' : 'destructive'}>
                          {diagnosticData.queueAnalysis.queueHealth}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Age Distribution</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Under 1 hour</span>
                        <Badge variant="outline">{diagnosticData.queueAnalysis.ageDistribution.under1hour}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Under 24 hours</span>
                        <Badge variant="outline">{diagnosticData.queueAnalysis.ageDistribution.under24hours}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Under 7 days</span>
                        <Badge variant="outline">{diagnosticData.queueAnalysis.ageDistribution.under7days}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Over 7 days</span>
                        <Badge variant="outline">{diagnosticData.queueAnalysis.ageDistribution.over7days}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Error Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Errors</span>
                        <Badge variant="outline">{diagnosticData.errorAnalysis.totalErrors}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Recent Errors (24h)</span>
                        <Badge variant="outline">{diagnosticData.errorAnalysis.recentErrors}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Error Rate</span>
                        <Badge variant="outline">{diagnosticData.errorAnalysis.errorRate}%</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Error Categories</h4>
                    <div className="space-y-2">
                      {Object.entries(diagnosticData.errorAnalysis.errorCategories).map(([category, count]) => (
                        <div key={category} className="flex justify-between">
                          <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Processing Rates</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Last Hour</span>
                        <Badge variant="outline">{diagnosticData.performanceMetrics.last_hour.processed} ({diagnosticData.performanceMetrics.last_hour.rate}/hr)</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Last 6 Hours</span>
                        <Badge variant="outline">{diagnosticData.performanceMetrics.last_6_hours.processed} ({diagnosticData.performanceMetrics.last_6_hours.rate}/hr)</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Last 24 Hours</span>
                        <Badge variant="outline">{diagnosticData.performanceMetrics.last_24_hours.processed} ({diagnosticData.performanceMetrics.last_24_hours.rate}/hr)</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Last 7 Days</span>
                        <Badge variant="outline">{diagnosticData.performanceMetrics.last_7_days.processed} ({diagnosticData.performanceMetrics.last_7_days.rate}/hr)</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Processing Time</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Average Processing Time</span>
                        <Badge variant="outline">{diagnosticData.performanceMetrics.averageProcessingTime}s</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Content Quality</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Valid Content</span>
                        <Badge variant="default">{diagnosticData.contentAnalysis.valid_content}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Empty Content</span>
                        <Badge variant="destructive">{diagnosticData.contentAnalysis.empty_content}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Null String Content</span>
                        <Badge variant="destructive">{diagnosticData.contentAnalysis.null_string_content}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Too Long Content</span>
                        <Badge variant="destructive">{diagnosticData.contentAnalysis.too_long_content}</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Source Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries(diagnosticData.contentAnalysis.source_breakdown).map(([source, count]) => (
                        <div key={source} className="flex justify-between">
                          <span className="text-sm">{source}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual Actions</CardTitle>
                <CardDescription>
                  Manually control the sentiment worker system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={triggerWorker} className="h-20 flex flex-col gap-2">
                    <Zap className="h-6 w-6" />
                    <span>Trigger Worker</span>
                    <span className="text-xs opacity-70">Process pending mentions</span>
                  </Button>
                  <Button onClick={resetFailedMentions} variant="destructive" className="h-20 flex flex-col gap-2">
                    <RotateCcw className="h-6 w-6" />
                    <span>Reset Failed</span>
                    <span className="text-xs opacity-70">Reset error-marked mentions</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
