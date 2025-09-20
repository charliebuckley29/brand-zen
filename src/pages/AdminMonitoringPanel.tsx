import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Activity, Database, Mail, Zap, TrendingUp, AlertTriangle, RefreshCw, Search, Calendar, Info, X, Clock, AlertCircle, Users, Hash, Play, MessageSquare, Rss, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorMonitoringDashboard } from "@/components/ErrorMonitoringDashboard";

interface SourceStats {
  google_alerts: number;
  youtube: number;
  reddit: number;
  x: number;
  rss_news: number;
}

function parseSourceStats(log: string): SourceStats {
  const stats: SourceStats = {
    google_alerts: 0,
    youtube: 0,
    reddit: 0,
    x: 0,
    rss_news: 0
  };

  if (!log) return stats;

  // Parse patterns like "20 Google Alerts", "5 YouTube", etc.
  const googleMatch = log.match(/(\d+)\s+Google\s+Alerts?/i);
  if (googleMatch) stats.google_alerts = parseInt(googleMatch[1]);

  const youtubeMatch = log.match(/(\d+)\s+YouTube/i);
  if (youtubeMatch) stats.youtube = parseInt(youtubeMatch[1]);

  const redditMatch = log.match(/(\d+)\s+Reddit/i);
  if (redditMatch) stats.reddit = parseInt(redditMatch[1]);

  const xMatch = log.match(/(\d+)\s+X/i);
  if (xMatch) stats.x = parseInt(xMatch[1]);

  const rssMatch = log.match(/(\d+)\s+RSS/i);
  if (rssMatch) stats.rss_news = parseInt(rssMatch[1]);

  return stats;
}

interface ApiLimit {
  name: string;
  free: number;
  paid: number;
  unit: string;
  description: string;
  warningThreshold: number;
}

const API_LIMITS: ApiLimit[] = [
  {
    name: 'YouTube Data API',
    free: 10000,
    paid: 1000000,
    unit: 'quota units/day',
    description: 'YouTube API for video and channel data',
    warningThreshold: 0.85
  },
  {
    name: 'Reddit API',
    free: 60,
    paid: 300,
    unit: 'requests/min',
    description: 'Reddit API for post and comment fetching',
    warningThreshold: 0.8
  },
  {
    name: 'X (Twitter) API',
    free: 10000,
    paid: 50000,
    unit: 'tweets/month',
    description: 'X API v2 for tweet data',
    warningThreshold: 0.8
  },
  {
    name: 'Google Alerts',
    free: 1000,
    paid: 10000,
    unit: 'RSS fetches/day',
    description: 'Google Alerts RSS feed processing',
    warningThreshold: 0.9
  }
];

interface MonitoringMetrics {
  totalMentions: number;
  totalApiCalls: number;
  totalNotifications: number;
  totalEdgeFunctionCalls: number;
  apiUsageBySource: Record<string, number>;
}

interface EdgeFunctionLog {
  function_name: string;
  calls_today: number;
  errors_today: number;
  avg_duration: number;
  last_call: string;
  description: string;
  status: 'active' | 'inactive';
  max_concurrent: number;
  timeout_seconds: number;
  recent_logs?: Array<{
    timestamp: string;
    message: string;
    level: string;
  }>;
  recent_errors?: Array<{
    timestamp: string;
    message: string;
    level: string;
  }>;
}

interface UserFetchLog {
  id: string;
  user_name: string;
  started_at: string;
  completed_at: string | null;
  total_keywords: number;
  failed_keywords: number;
  sources: string[];
  mentions_found: number;
  error_message?: string;
}

const AdminMonitoringPanel = () => {
  const { userRole } = useUserRole();
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    totalMentions: 0,
    totalApiCalls: 0,
    totalNotifications: 0,
    totalEdgeFunctionCalls: 0,
    apiUsageBySource: {}
  });
  const [edgeFunctionLogs, setEdgeFunctionLogs] = useState<EdgeFunctionLog[]>([]);
  const [userLogs, setUserLogs] = useState<UserFetchLog[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [showFunctionDetails, setShowFunctionDetails] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<EdgeFunctionLog | null>(null);

  useEffect(() => {
    if (userRole === "admin") {
      fetchMetrics();
      fetchEdgeFunctionMetrics();
    }
  }, [userRole]);

  const fetchMetrics = async () => {
    try {
      // Fetch mentions count
      const { data: mentions, error: mentionsError } = await supabase
        .from('mentions')
        .select('id', { count: 'exact' });

      if (mentionsError) throw mentionsError;

      // Fetch API usage by source
      const { data: fetchLogs, error: logsError } = await supabase
        .from('fetch_logs')
        .select('source_stats')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (logsError) throw logsError;

      const sourceStats: Record<string, number> = {};
      fetchLogs?.forEach(log => {
        const stats = parseSourceStats(log.source_stats || '');
        Object.entries(stats).forEach(([source, count]) => {
          sourceStats[source] = (sourceStats[source] || 0) + count;
        });
      });

      setMetrics({
        totalMentions: mentions?.length || 0,
        totalApiCalls: Object.values(sourceStats).reduce((sum, count) => sum + count, 0),
        totalNotifications: 0, // TODO: Implement notification counting
        totalEdgeFunctionCalls: 0, // Will be updated by fetchEdgeFunctionMetrics
        apiUsageBySource: sourceStats
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to fetch monitoring metrics');
    }
  };

  const fetchEdgeFunctionMetrics = async () => {
    try {
      // Get real edge function metrics from automation_logs table
      const { data: automationLogs, error } = await supabase
        .from('automation_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching automation logs:', error);
        // Fallback to basic metrics
        setEdgeFunctionLogs([{
          function_name: 'automated-mention-fetch',
          calls_today: 0,
          errors_today: 0,
          avg_duration: 0,
          last_call: new Date().toISOString(),
          description: 'Automated mention fetching from various sources',
          status: 'inactive',
          max_concurrent: 10,
          timeout_seconds: 300,
          recent_logs: [],
          recent_errors: []
        }]);
        return;
      }

      // Process automation logs to create function metrics
      const functionMetrics: Record<string, EdgeFunctionLog> = {};
      
      automationLogs?.forEach(log => {
        const functionName = log.function_name || 'unknown';
        
        if (!functionMetrics[functionName]) {
          functionMetrics[functionName] = {
            function_name: functionName,
            calls_today: 0,
            errors_today: 0,
            avg_duration: 0,
            last_call: log.created_at,
            description: log.description || 'Automated function',
            status: 'active',
            max_concurrent: 5,
            timeout_seconds: 300,
            recent_logs: [],
            recent_errors: []
          };
        }
        
        functionMetrics[functionName].calls_today++;
        if (log.level === 'error') {
          functionMetrics[functionName].errors_today++;
          functionMetrics[functionName].recent_errors?.push({
            timestamp: log.created_at,
            message: log.message,
            level: log.level
          });
        } else {
          functionMetrics[functionName].recent_logs?.push({
            timestamp: log.created_at,
            message: log.message,
            level: log.level
          });
        }
        
        // Keep only last 5 logs/errors
        if (functionMetrics[functionName].recent_logs && functionMetrics[functionName].recent_logs.length > 5) {
          functionMetrics[functionName].recent_logs = functionMetrics[functionName].recent_logs.slice(0, 5);
        }
        if (functionMetrics[functionName].recent_errors && functionMetrics[functionName].recent_errors.length > 5) {
          functionMetrics[functionName].recent_errors = functionMetrics[functionName].recent_errors.slice(0, 5);
        }
      });

      setEdgeFunctionLogs(Object.values(functionMetrics));
      
      // Update total edge function calls in metrics
      const totalEdgeFunctionCalls = Object.values(functionMetrics).reduce((sum, fn) => sum + fn.calls_today, 0);
      setMetrics(prev => ({ ...prev, totalEdgeFunctionCalls }));
      
    } catch (error) {
      console.error('Error fetching edge function metrics:', error);
      setEdgeFunctionLogs([]);
    }
  };

  const fetchUserFetchLogs = async () => {
    if (!selectedUser) return;

    try {
      const { data, error } = await supabase
        .from('fetch_logs')
        .select('*')
        .eq('user_id', selectedUser)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const logs: UserFetchLog[] = data?.map(log => ({
        id: log.id,
        user_name: log.user_name || 'Unknown User',
        started_at: log.created_at,
        completed_at: log.completed_at,
        total_keywords: log.total_keywords || 0,
        failed_keywords: log.failed_keywords || 0,
        sources: log.sources || [],
        mentions_found: log.mentions_found || 0,
        error_message: log.error_message
      })) || [];

      setUserLogs(logs);
    } catch (error) {
      console.error('Error fetching user logs:', error);
      toast.error('Failed to fetch user logs');
    }
  };

  const openFunctionDetails = (func: EdgeFunctionLog) => {
    setSelectedFunction(func);
    setShowFunctionDetails(true);
  };

  const closeFunctionDetails = () => {
    setShowFunctionDetails(false);
    setSelectedFunction(null);
  };

  const searchUserByEmail = async () => {
    if (!searchEmail.trim()) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .ilike('full_name', `%${searchEmail}%`)
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedUser(data.user_id);
        toast.success(`Found user: ${data.full_name}`);
        fetchUserFetchLogs();
      }
    } catch (error) {
      toast.error('User not found');
    }
  };

  const getStatusColor = (log: UserFetchLog) => {
    if (!log.completed_at) return 'bg-yellow-500';
    if (log.failed_keywords > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'Running...';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diff = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${diff}s`;
  };

  if (userRole !== "admin") {
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
        <Button onClick={fetchMetrics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="functions">Edge Functions</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
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
                <div className="text-2xl font-bold">{metrics.totalMentions.toLocaleString()}</div>
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
                <div className="text-2xl font-bold">{metrics.totalApiCalls.toLocaleString()}</div>
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
                <div className="text-2xl font-bold">{metrics.totalEdgeFunctionCalls.toLocaleString()}</div>
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
                <div className="text-2xl font-bold">{metrics.totalNotifications.toLocaleString()}</div>
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
                        {usage.toLocaleString()} mentions
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
                  const usage = Math.random() * apiLimit.paid; // Mock usage data
                  const percentage = (usage / apiLimit.paid) * 100;
                  const isWarning = percentage > (apiLimit.warningThreshold * 100);

                  return (
                    <div key={apiLimit.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{apiLimit.name}</div>
                          <div className="text-sm text-muted-foreground">{apiLimit.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {usage.toLocaleString()} / {apiLimit.paid.toLocaleString()} {apiLimit.unit}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}% used
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            isWarning ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edge Function Performance</CardTitle>
              <CardDescription>Real-time metrics for automated functions</CardDescription>
            </CardHeader>
            <CardContent>
              {edgeFunctionLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No edge function data available</p>
                  <p className="text-sm">Functions will appear here when they run</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {edgeFunctionLogs.map((func) => (
                    <div key={func.function_name} className="border rounded-lg p-4">
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
                            <div className="text-sm font-medium">{func.errors_today} errors</div>
                            <div className="text-xs text-muted-foreground">today</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openFunctionDetails(func)}
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
              <CardTitle>User Activity Search</CardTitle>
              <CardDescription>
                Search for specific user's mention fetching activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by user name..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={searchUserByEmail}>Search</Button>
                {selectedUser && (
                  <Button variant="outline" onClick={() => setSelectedUser("")}>
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
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        !log.completed_at ? 'bg-yellow-500' :
                        log.failed_keywords > 0 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}>
                        {!log.completed_at ? <Clock className="h-4 w-4" /> :
                         log.failed_keywords > 0 ? <AlertTriangle className="h-4 w-4" /> :
                         <CheckCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium">{log.user_name || 'Unknown User'}</div>
                        <div className="text-sm text-muted-foreground">
                          {!log.completed_at ? 'In Progress' :
                           log.failed_keywords > 0 ? 'Partial Success' :
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
                      <div className="font-medium">{log.failed_keywords}</div>
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
              <h3 className="text-lg font-semibold">{selectedFunction.function_name}</h3>
              <Button variant="outline" onClick={closeFunctionDetails}>
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
                  <div className="text-sm capitalize">{selectedFunction.status}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Calls Today</div>
                  <div className="text-sm">{selectedFunction.calls_today}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Errors Today</div>
                  <div className="text-sm">{selectedFunction.errors_today}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Avg Duration</div>
                  <div className="text-sm">{selectedFunction.avg_duration}ms</div>
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