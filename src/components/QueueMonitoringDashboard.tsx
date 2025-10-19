import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle, Activity, Settings, BarChart3 } from "lucide-react";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface QueueHealthData {
  overall: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    healthy: boolean;
    lastChecked: string;
  };
  bySource: Record<string, {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    healthy: boolean;
    oldestFailedAge: number;
    oldestPendingAge: number;
    issues: string[];
  }>;
  issues: string[];
  recommendations: string[];
}

interface QueueDashboardData {
  queue: {
    overall: {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    bySource: Record<string, {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      trends: {
        last24Hours: {
          totalFetches: number;
          successfulFetches: number;
          failedFetches: number;
          successRate: number;
        };
      };
      oldestPendingAge: number;
      oldestFailedAge: number;
      health: {
        status: 'healthy' | 'warning' | 'error';
        issues: string[];
      };
    }>;
  };
  activity: {
    errors: number;
    warnings: number;
    info: number;
    lastActivity: string | null;
  };
  health: {
    overall: 'healthy' | 'warning' | 'error';
    issues: string[];
    lastCheck: string;
  };
  timestamp: string;
}

export function QueueMonitoringDashboard() {
  const [healthData, setHealthData] = useState<QueueHealthData | null>(null);
  const [dashboardData, setDashboardData] = useState<QueueDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const fetchHealthData = async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.QUEUE_HEALTH);
      if (!response.ok) throw new Error('Failed to fetch queue health');
      const data = await response.json();
      setHealthData(data.health);
    } catch (err: any) {
      console.error('Error fetching queue health:', err);
      setError(err.message);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.QUEUE_DASHBOARD);
      if (!response.ok) throw new Error('Failed to fetch queue dashboard');
      const data = await response.json();
      setDashboardData(data.data);
    } catch (err: any) {
      console.error('Error fetching queue dashboard:', err);
      setError(err.message);
    }
  };

  const runMaintenance = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(API_ENDPOINTS.QUEUE_MAINTENANCE, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to run queue maintenance');
      const result = await response.json();
      
      toast({
        title: "Queue Maintenance Complete",
        description: result.message,
      });
      
      // Refresh data after maintenance
      await Promise.all([fetchHealthData(), fetchDashboardData()]);
    } catch (err: any) {
      console.error('Error running maintenance:', err);
      toast({
        title: "Maintenance Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runMonitoring = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(API_ENDPOINTS.QUEUE_MONITOR, {
        method: 'POST',
        body: JSON.stringify({ autoFix: true })
      });
      if (!response.ok) throw new Error('Failed to run queue monitoring');
      const result = await response.json();
      
      toast({
        title: "Queue Monitoring Complete",
        description: result.hasActions ? "Issues detected and fixed" : "No issues found",
      });
      
      // Refresh data after monitoring
      await Promise.all([fetchHealthData(), fetchDashboardData()]);
    } catch (err: any) {
      console.error('Error running monitoring:', err);
      toast({
        title: "Monitoring Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchHealthData(), fetchDashboardData()]);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getHealthColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Queue Monitoring Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Queue Monitoring Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and maintenance of the mention processing queue
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshAll} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={runMaintenance} disabled={loading}>
            <Settings className="h-4 w-4 mr-2" />
            Run Maintenance
          </Button>
          <Button onClick={runMonitoring} disabled={loading} variant="secondary">
            <Activity className="h-4 w-4 mr-2" />
            Monitor & Fix
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">By Source</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="health">Health Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {dashboardData && (
            <>
              {/* Overall Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getHealthIcon(dashboardData.health.overall)}
                    Overall Queue Status
                  </CardTitle>
                  <CardDescription>
                    Last updated: {new Date(dashboardData.timestamp).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{dashboardData.queue.overall.total}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{dashboardData.queue.overall.pending}</div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{dashboardData.queue.overall.processing}</div>
                      <div className="text-sm text-muted-foreground">Processing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{dashboardData.queue.overall.completed}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{dashboardData.queue.overall.failed}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Health Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <Badge className={getHealthColor(dashboardData.health.overall)}>
                      {dashboardData.health.overall.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Last check: {new Date(dashboardData.health.lastCheck).toLocaleString()}
                    </span>
                  </div>
                  
                  {dashboardData.health.issues.length > 0 ? (
                    <div>
                      <h4 className="font-medium mb-2">Issues:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {dashboardData.health.issues.map((issue, index) => (
                          <li key={index} className="text-sm text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-green-600 text-sm">✅ No issues detected</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          {dashboardData && (
            <div className="grid gap-4">
              {Object.entries(dashboardData.queue.bySource).map(([source, data]) => (
                <Card key={source}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{source.replace('_', ' ')}</span>
                      <Badge className={getHealthColor(data.health.status)}>
                        {data.health.status.toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{data.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{data.pending}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-yellow-600">{data.processing}</div>
                        <div className="text-xs text-muted-foreground">Processing</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{data.completed}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">{data.failed}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">24h Success Rate</div>
                        <div className="text-lg font-semibold text-green-600">
                          {data.trends.last24Hours.successRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {data.trends.last24Hours.successfulFetches} / {data.trends.last24Hours.totalFetches} fetches
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Age Issues</div>
                        {data.oldestPendingAge > 60 && (
                          <div className="text-yellow-600">Pending: {data.oldestPendingAge}m</div>
                        )}
                        {data.oldestFailedAge > 30 && (
                          <div className="text-red-600">Failed: {data.oldestFailedAge}m</div>
                        )}
                        {data.oldestPendingAge <= 60 && data.oldestFailedAge <= 30 && (
                          <div className="text-green-600">No age issues</div>
                        )}
                      </div>
                    </div>
                    
                    {data.health.issues.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-sm mb-2">Issues:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {data.health.issues.map((issue, index) => (
                            <li key={index} className="text-xs text-red-600">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {dashboardData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity (Last Hour)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{dashboardData.activity.errors}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{dashboardData.activity.warnings}</div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.activity.info}</div>
                    <div className="text-sm text-muted-foreground">Info</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {dashboardData.activity.lastActivity ? (
                        <Clock className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dashboardData.activity.lastActivity ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                
                {dashboardData.activity.lastActivity && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Last activity: {new Date(dashboardData.activity.lastActivity).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {healthData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getHealthIcon(healthData.overall.healthy ? 'healthy' : 'warning')}
                  Detailed Health Analysis
                </CardTitle>
                <CardDescription>
                  Comprehensive queue health assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {healthData.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-lg">Current Issues:</h4>
                    <div className="space-y-2">
                      {healthData.issues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-base font-medium text-red-900 dark:text-red-100 leading-relaxed">{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {healthData.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-lg">Recommendations:</h4>
                    <div className="space-y-2">
                      {healthData.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-base font-medium text-blue-900 dark:text-blue-100 leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium mb-2">Source Health Details:</h4>
                  <div className="space-y-2">
                    {Object.entries(healthData.bySource).map(([source, data]) => (
                      <div key={source} className="flex items-center justify-between p-2 border rounded">
                        <span className="capitalize font-medium">{source.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={getHealthColor(data.healthy ? 'healthy' : 'warning')}>
                            {data.healthy ? 'HEALTHY' : 'ISSUES'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {data.total} total, {data.failed} failed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
