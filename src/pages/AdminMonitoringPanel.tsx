import React from "react";
import { useUserRole } from "../hooks/use-user-role";
import { useMonitoring } from "../hooks/useMonitoring";
import { useQueueMonitoring } from "../hooks/useQueueMonitoring";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Activity, 
  Database, 
  Mail, 
  Zap, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  X, 
  Clock, 
  AlertCircle, 
  Users, 
  Hash, 
  Play, 
  MessageSquare, 
  Rss, 
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Shield,
  Wifi,
  WifiOff
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Alert, AlertDescription } from "../components/ui/alert";
import { ErrorMonitoringDashboard } from "../components/ErrorMonitoringDashboard";
import { 
  EdgeFunctionLog, 
  UserFetchLog 
} from "../types/monitoring";
import { API_LIMITS } from "../constants/monitoring";

const AdminMonitoringPanel: React.FC = () => {
  const { isAdmin } = useUserRole();
  const {
    metrics,
    edgeFunctionLogs,
    userLogs,
    searchEmail,
    selectedUser,
    showFunctionDetails,
    selectedFunction,
    autoRefresh,
    lastRefresh,
    systemHealth,
    totalErrors,
    averageErrorRate,
    hasActiveFunctions,
    totalActiveUsers,
    fetchMetrics,
    fetchEdgeFunctionMetrics,
    fetchUserFetchLogs,
    searchUserByEmail,
    refreshAll,
    setSelectedUser,
    setSearchEmail,
    setShowFunctionDetails,
    setSelectedFunction,
    setAutoRefresh,
    clearSelectedUser
  } = useMonitoring({ autoRefresh: true, refreshInterval: 30000 });

  const {
    queueData,
    loading: queueLoading,
    error: queueError,
    lastRefresh: queueLastRefresh,
    fetchQueueStatus,
    refreshQueueStatus,
    getQueueStatusColor,
    getQueueStatusText,
    formatTimeAgo,
    getApiSourceDisplayName,
    getApiSourceIcon
  } = useQueueMonitoring({ autoRefresh: true, refreshInterval: 30000 });

  // Helper functions for UI rendering
  const getStatusColor = (log: UserFetchLog): string => {
    switch (log.status) {
      case 'running': return 'bg-yellow-500';
      case 'partial': return 'bg-orange-500';
      case 'failed': return 'bg-red-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getDuration = (startedAt: string, completedAt: string | null): string => {
    if (!completedAt) return 'Running...';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diff = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${diff}s`;
  };

  const getSystemHealthIcon = () => {
    switch (systemHealth) {
      case 'healthy': return <Shield className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSystemHealthColor = () => {
    switch (systemHealth) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Event handlers
  const handleRefresh = async () => {
    await refreshAll();
    toast.success('Data refreshed successfully');
  };

  const handleUserSearch = async () => {
    await searchUserByEmail(searchEmail);
  };

  const handleFunctionDetails = (func: EdgeFunctionLog) => {
    setSelectedFunction(func);
    setShowFunctionDetails(true);
  };

  const handleCloseFunctionDetails = () => {
    setShowFunctionDetails(false);
    setSelectedFunction(null);
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast.success(`Auto-refresh ${!autoRefresh ? 'enabled' : 'disabled'}`);
  };

  // Early return for non-admin users
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with system health */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">System Monitoring</h1>
            <p className="text-muted-foreground">
              Monitor system performance, API usage, and user activity
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* System Health Indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            systemHealth === 'healthy' ? 'bg-green-50 border-green-200' :
            systemHealth === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            {getSystemHealthIcon()}
            <span className={`text-sm font-medium ${getSystemHealthColor()}`}>
              System {systemHealth}
            </span>
          </div>

          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAutoRefresh}
              className={autoRefresh ? 'bg-green-50' : ''}
            >
              {autoRefresh ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={metrics.isLoading}
            >
              {metrics.isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* System Status Alert */}
      {metrics.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading monitoring data: {metrics.error}
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalErrors}</div>
              <div className="text-sm text-muted-foreground">Total Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{averageErrorRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{hasActiveFunctions ? 'Yes' : 'No'}</div>
              <div className="text-sm text-muted-foreground">Active Functions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalActiveUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
          </div>
          {lastRefresh && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Last updated: {format(new Date(lastRefresh), 'MMM dd, yyyy HH:mm:ss')}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="functions">Edge Functions</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="queue">API Queue</TabsTrigger>
          <TabsTrigger value="resources">Resource Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    metrics.totalMentions.toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time mentions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    metrics.totalApiCalls.toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all sources
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Edge Function Calls</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    metrics.totalEdgeFunctionCalls.toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Today's automated calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notifications Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    metrics.totalNotifications.toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Email notifications
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API Usage by Source</CardTitle>
              <CardDescription>Current usage across all data sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(metrics.apiUsageBySource).map(([source, usage]) => (
                  <div key={source} className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      source === 'google_alerts' ? 'bg-blue-500' :
                      source === 'youtube' ? 'bg-red-500' :
                      source === 'reddit' ? 'bg-orange-500' :
                      source === 'x' ? 'bg-black' :
                      source === 'rss_news' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}>
                      {source === 'google_alerts' ? <Search className="h-4 w-4" /> :
                       source === 'youtube' ? <Play className="h-4 w-4" /> :
                       source === 'reddit' ? <MessageSquare className="h-4 w-4" /> :
                       source === 'x' ? <Hash className="h-4 w-4" /> :
                       source === 'rss_news' ? <Rss className="h-4 w-4" /> :
                       <Database className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{source.replace('_', ' ')}</div>
                      <div className="text-sm text-muted-foreground">
                        {Number(usage).toLocaleString()} mentions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Rate Limits</CardTitle>
              <CardDescription>Current API usage vs limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {API_LIMITS.map((apiLimit) => {
                  // Get real usage data for this API
                  const apiUsage = metrics.apiUsageData[apiLimit.name.toLowerCase().replace(/\s+/g, '_')] || 
                                 metrics.apiUsageData[apiLimit.name.toLowerCase().replace(/\s+/g, '')] ||
                                 metrics.apiUsageData[apiLimit.name];
                  
                  const usage = apiUsage?.totalCalls || 0;
                  const errorRate = apiUsage?.errorRate || 0;
                  const percentage = (usage / apiLimit.paid) * 100;
                  const isWarning = percentage > (apiLimit.warningThreshold * 100) || errorRate > 10;
                  const hasErrors = errorRate > 0;

                  return (
                    <div key={apiLimit.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            hasErrors ? 'bg-red-500' : 'bg-green-500'
                          }`} />
                          <div>
                            <div className="font-medium">{apiLimit.name}</div>
                            <div className="text-sm text-muted-foreground">{apiLimit.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {usage.toLocaleString()} / {apiLimit.paid.toLocaleString()} {apiLimit.unit}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}% used
                            {hasErrors && (
                              <span className="text-red-600 ml-2">
                                • {errorRate.toFixed(1)}% error rate
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            isWarning ? 'bg-yellow-500' : hasErrors ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Free: {apiLimit.free.toLocaleString()} {apiLimit.unit}</span>
                        <span>Paid: {apiLimit.paid.toLocaleString()} {apiLimit.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Usage Summary</CardTitle>
              <CardDescription>Real-time API call tracking across all services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.apiUsageData).map(([apiSource, usage]) => {
                  const usageData = usage as { totalCalls: number; errorCalls: number; errorRate: number };
                  return (
                    <div key={apiSource} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          usageData.errorRate > 0 ? 'bg-red-500' : 'bg-green-500'
                        }`} />
                        <div>
                          <div className="font-medium capitalize">{apiSource}</div>
                          {usageData.errorRate > 0 && (
                            <div className="text-sm text-red-600">
                              {usageData.errorCalls} errors
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{usageData.totalCalls} calls</div>
                        <div className="text-sm text-muted-foreground">
                          {usageData.errorRate > 0 ? `${usageData.errorRate.toFixed(1)}% error rate` : 'No errors'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(metrics.apiUsageData).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No API usage data available</p>
                    <p className="text-sm">API calls will appear here when they are made</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Edge Function Performance
              </CardTitle>
              <CardDescription>Real-time metrics for automated functions</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Loading function metrics...</p>
                </div>
              ) : edgeFunctionLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No edge function data available</p>
                  <p className="text-sm">Functions will appear here when they run</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {edgeFunctionLogs.map((func) => (
                    <div key={func.function_name} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            func.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                          }`}>
                            <Zap className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{func.function_name}</div>
                            <div className="text-sm text-muted-foreground">{func.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{func.calls_today} calls</div>
                            <div className="text-xs text-muted-foreground">today</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${func.errors_today > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {func.errors_today} errors
                            </div>
                            <div className="text-xs text-muted-foreground">today</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFunctionDetails(func)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Last Call</div>
                          <div className="font-medium">
                            {format(new Date(func.last_call), 'MMM dd, HH:mm')}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg Duration</div>
                          <div className="font-medium">{func.avg_duration}ms</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Max Concurrent</div>
                          <div className="font-medium">{func.max_concurrent}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Timeout</div>
                          <div className="font-medium">{func.timeout_seconds}s</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Activity Search
              </CardTitle>
              <CardDescription>
                Search for specific user's mention fetching activity by name or email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by user name or email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="max-w-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                />
                <Button onClick={handleUserSearch} disabled={!searchEmail.trim()}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                {selectedUser && (
                  <Button variant="outline" onClick={clearSelectedUser}>
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {userLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fetch history available</p>
              <p className="text-sm">User fetch operations will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${getStatusColor(log)}`}>
                        {log.status === 'running' ? <Clock className="h-4 w-4" /> :
                         log.status === 'partial' ? <AlertTriangle className="h-4 w-4" /> :
                         log.status === 'failed' ? <AlertCircle className="h-4 w-4" /> :
                         <CheckCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium">{log.user_name || 'Unknown User'}</div>
                        <div className="text-sm text-muted-foreground">
                          {log.status === 'running' ? 'In Progress' :
                           log.status === 'partial' ? 'Partial Success' :
                           log.status === 'failed' ? 'Failed' :
                           'Completed'} • {log.total_keywords} keywords
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {format(new Date(log.started_at), 'MMM dd, HH:mm')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Duration: {getDuration(log.started_at, log.completed_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Keywords</div>
                      <div className="font-medium">{log.total_keywords}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Failed Keywords</div>
                      <div className={`font-medium ${log.failed_keywords > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {log.failed_keywords}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Sources</div>
                      <div className="font-medium">{log.sources?.join(', ') || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Mentions Found</div>
                      <div className="font-medium">{log.mentions_found || 0}</div>
                    </div>
                  </div>
                  
                  {log.error_message && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Error</span>
                      </div>
                      <div className="text-sm text-red-600 mt-1">{log.error_message}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">API Queue Monitoring</h2>
              <p className="text-muted-foreground">
                Monitor fair API usage distribution across all users
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshQueueStatus}
                disabled={queueLoading}
              >
                <RefreshCw className={`h-4 w-4 ${queueLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {queueLastRefresh && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {format(queueLastRefresh, 'HH:mm:ss')}
                </span>
              )}
            </div>
          </div>

          {queueError && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Error loading queue data: {queueError}
              </AlertDescription>
            </Alert>
          )}

          {queueData && (
            <>
              {/* Queue Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Queue Entries</CardTitle>
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{queueData.summary.total}</div>
                    <p className="text-xs text-muted-foreground">
                      All queue entries
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {queueData.summary.byStatus.pending}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Waiting for processing
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Processing</CardTitle>
                    <Loader2 className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {queueData.summary.byStatus.processing}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently processing
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Priority</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {queueData.summary.averagePriorityScore}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Higher = more urgent
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* API Source Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Queue by API Source</CardTitle>
                  <CardDescription>Distribution of queue entries across different APIs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(queueData.summary.byApiSource).map(([apiSource, stats]) => (
                      <div key={apiSource} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getApiSourceIcon(apiSource)}</span>
                          <div>
                            <p className="font-medium">{getApiSourceDisplayName(apiSource)}</p>
                            <p className="text-sm text-muted-foreground">
                              Avg Priority: {stats.averagePriority}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">{stats.pending}</div>
                            <div className="text-xs text-muted-foreground">Pending</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{stats.processing}</div>
                            <div className="text-xs text-muted-foreground">Processing</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{stats.completed}</div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">{stats.failed}</div>
                            <div className="text-xs text-muted-foreground">Failed</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Queue Entries */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Queue Activity</CardTitle>
                  <CardDescription>Latest queue entries and their status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {queueData.entries.slice(0, 20).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getApiSourceIcon(entry.api_source)}</span>
                          <div>
                            <p className="font-medium text-sm">
                              {getApiSourceDisplayName(entry.api_source)} - User {entry.user_id.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Priority: {entry.priority_score} • Queued: {formatTimeAgo(entry.queued_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`${getQueueStatusColor(entry.status)} text-white`}
                          >
                            {getQueueStatusText(entry.status)}
                          </Badge>
                          {entry.last_served_at && (
                            <span className="text-xs text-muted-foreground">
                              Last served: {formatTimeAgo(entry.last_served_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!queueData && !queueLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No queue data available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage</CardTitle>
              <CardDescription>Current resource consumption and limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Database Storage</p>
                      <p className="text-sm text-muted-foreground">500MB (Pro plan)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">~{Math.round(metrics.totalMentions * 0.001)}MB</p>
                    <p className="text-sm text-muted-foreground">estimated usage</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">API Requests</p>
                      <p className="text-sm text-muted-foreground">1M requests/month (Pro)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{metrics.totalApiCalls.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">requests today</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Supabase Edge Functions</p>
                      <p className="text-sm text-muted-foreground">500,000 invocations/month (Pro)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {edgeFunctionLogs.reduce((sum, func) => sum + func.calls_today, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">calls today</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">Resend Email API</p>
                      <p className="text-sm text-muted-foreground">3,000 emails/month (free)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{metrics.totalNotifications}</p>
                    <p className="text-sm text-muted-foreground">emails sent</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Monitoring Dashboard */}
      <ErrorMonitoringDashboard />

      {/* Function Details Modal */}
      {showFunctionDetails && selectedFunction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {selectedFunction.function_name}
              </h3>
              <Button variant="outline" onClick={handleCloseFunctionDetails}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Description</div>
                <div className="text-sm">{selectedFunction.description}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedFunction.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm capitalize">{selectedFunction.status}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Calls Today</div>
                  <div className="text-sm font-medium">{selectedFunction.calls_today}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Errors Today</div>
                  <div className={`text-sm font-medium ${
                    selectedFunction.errors_today > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {selectedFunction.errors_today}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Avg Duration</div>
                  <div className="text-sm">{selectedFunction.avg_duration}ms</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Max Concurrent</div>
                  <div className="text-sm">{selectedFunction.max_concurrent}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Timeout</div>
                  <div className="text-sm">{selectedFunction.timeout_seconds}s</div>
                </div>
              </div>
              
              {selectedFunction.recent_logs && selectedFunction.recent_logs.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Recent Logs</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFunction.recent_logs.map((log, index) => (
                      <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="text-muted-foreground">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </div>
                        <div>{log.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedFunction.recent_errors && selectedFunction.recent_errors.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Recent Errors</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFunction.recent_errors.map((error, index) => (
                      <div key={index} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                        <div className="text-red-600">
                          {format(new Date(error.timestamp), 'HH:mm:ss')}
                        </div>
                        <div className="text-red-700">{error.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitoringPanel;