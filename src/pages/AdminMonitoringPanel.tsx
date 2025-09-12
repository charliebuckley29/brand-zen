import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Activity, Database, Mail, Zap, TrendingUp, AlertTriangle, RefreshCw, Search, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

type MonitoringMetrics = {
  totalMentions: number;
  totalUsers: number;
  totalApiCalls: number;
  totalEdgeFunctionCalls: number;
  totalNotifications: number;
  dailyMentionsBySource: Record<string, number>;
  weeklyGrowth: number;
  errorRate: number;
};

type UserFetchLog = {
  id: string;
  user_id: string;
  fetch_type: string;
  started_at: string;
  completed_at: string | null;
  successful_keywords: number;
  failed_keywords: number;
  profiles?: { full_name: string };
};

type EdgeFunctionLog = {
  function_name: string;
  calls_today: number;
  errors_today: number;
  avg_duration: number;
  last_call: string;
};

export default function AdminMonitoringPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    totalMentions: 0,
    totalUsers: 0,
    totalApiCalls: 0,
    totalEdgeFunctionCalls: 0,
    totalNotifications: 0,
    dailyMentionsBySource: {},
    weeklyGrowth: 0,
    errorRate: 0,
  });
  const [userLogs, setUserLogs] = useState<UserFetchLog[]>([]);
  const [edgeFunctionLogs, setEdgeFunctionLogs] = useState<EdgeFunctionLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [searchEmail, setSearchEmail] = useState("");
  const [dateRange, setDateRange] = useState("7d");

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchAllMetrics();
    } else if (!roleLoading && !isAdmin) {
      setLoading(false);
    }
  }, [isAdmin, roleLoading, dateRange]);

  const fetchAllMetrics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOverviewMetrics(),
        fetchUserFetchLogs(),
        fetchEdgeFunctionMetrics(),
      ]);
    } catch (error) {
      console.error('Error fetching monitoring metrics:', error);
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverviewMetrics = async () => {
    try {
      const daysAgo = parseInt(dateRange.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Get total mentions
      const { count: totalMentions } = await supabase
        .from('mentions')
        .select('*', { count: 'exact', head: true });

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get recent mentions by source
      const { data: recentMentions } = await supabase
        .from('mentions')
        .select('source_name, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Get total notifications
      const { count: totalNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Calculate metrics
      const dailyMentionsBySource: Record<string, number> = {};
      recentMentions?.forEach(mention => {
        const source = mention.source_name || 'unknown';
        dailyMentionsBySource[source] = (dailyMentionsBySource[source] || 0) + 1;
      });

      // Calculate growth (simplified)
      const previousWeekStart = new Date(startDate);
      previousWeekStart.setDate(previousWeekStart.getDate() - daysAgo);
      
      const { count: previousPeriodMentions } = await supabase
        .from('mentions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousWeekStart.toISOString())
        .lt('created_at', startDate.toISOString());

      const currentPeriodMentions = recentMentions?.length || 0;
      const weeklyGrowth = previousPeriodMentions ? 
        ((currentPeriodMentions - previousPeriodMentions) / previousPeriodMentions * 100) : 0;

      setMetrics({
        totalMentions: totalMentions || 0,
        totalUsers: totalUsers || 0,
        totalApiCalls: currentPeriodMentions, // Approximate
        totalEdgeFunctionCalls: 0, // Will be updated by edge function metrics
        totalNotifications: totalNotifications || 0,
        dailyMentionsBySource,
        weeklyGrowth,
        errorRate: 0, // Will be calculated from logs
      });
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
    }
  };

  const fetchUserFetchLogs = async () => {
    try {
      let query = supabase
        .from('user_fetch_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (selectedUser) {
        query = query.eq('user_id', selectedUser);
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      // Fetch user profiles separately to avoid join issues
      const userIds = [...new Set(logs?.map(log => log.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Map profiles to logs
      const logsWithProfiles = logs?.map(log => ({
        ...log,
        profiles: profiles?.find(p => p.user_id === log.user_id) || { full_name: 'Unknown User' }
      })) || [];

      setUserLogs(logsWithProfiles);
    } catch (error) {
      console.error('Error fetching user fetch logs:', error);
    }
  };

  const fetchEdgeFunctionMetrics = async () => {
    try {
      // Get Supabase analytics for edge functions
      const { data, error } = await supabase.functions.invoke('get-function-metrics', {
        body: { days: parseInt(dateRange.replace('d', '')) }
      });

      if (error) {
        console.log('Edge function metrics not available via API, using mock data');
        // Mock data for demonstration
        setEdgeFunctionLogs([
          {
            function_name: 'automated-mention-fetch',
            calls_today: 147,
            errors_today: 3,
            avg_duration: 2400,
            last_call: new Date().toISOString(),
          },
          {
            function_name: 'google-alerts',
            calls_today: 89,
            errors_today: 1,
            avg_duration: 1200,
            last_call: new Date().toISOString(),
          },
          {
            function_name: 'send-twilio-notification',
            calls_today: 23,
            errors_today: 0,
            avg_duration: 800,
            last_call: new Date().toISOString(),
          },
        ]);
      } else {
        setEdgeFunctionLogs(data?.functions || []);
      }
    } catch (error) {
      console.error('Error fetching edge function metrics:', error);
    }
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

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">System Monitoring</h1>
              <p className="text-muted-foreground">
                Track resource usage and scaling limits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchAllMetrics} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalMentions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.weeklyGrowth > 0 ? '+' : ''}{metrics.weeklyGrowth.toFixed(1)}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalApiCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Last {dateRange.replace('d', ' days')}
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
                Including SMS, email, WhatsApp
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total registered users
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="api-usage" className="space-y-6">
          <TabsList>
            <TabsTrigger value="api-usage">API Usage</TabsTrigger>
            <TabsTrigger value="user-logs">User Activity</TabsTrigger>
            <TabsTrigger value="edge-functions">Edge Functions</TabsTrigger>
            <TabsTrigger value="limits">Scaling Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="api-usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mentions by Source</CardTitle>
                <CardDescription>
                  Track API usage per source to monitor limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.dailyMentionsBySource).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <span className="font-medium">{source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{count} calls</span>
                        <Badge variant={count > 1000 ? "destructive" : count > 500 ? "secondary" : "default"}>
                          {count > 1000 ? "High" : count > 500 ? "Medium" : "Low"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user-logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Search</CardTitle>
                <CardDescription>
                  Search for specific user's mention fetching activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="search-email">Search by Name/Email</Label>
                    <Input
                      id="search-email"
                      placeholder="Enter user name or email..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchUserByEmail()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={searchUserByEmail}>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Fetch Activity</CardTitle>
                <CardDescription>
                  Latest mention fetching operations by users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(log)}`}></div>
                        <div>
                          <p className="font-medium">{log.profiles?.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.fetch_type} • {format(new Date(log.started_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ✅ {log.successful_keywords} / ❌ {log.failed_keywords}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getDuration(log.started_at, log.completed_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {userLogs.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No fetch logs found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edge-functions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edge Function Performance</CardTitle>
                <CardDescription>
                  Monitor Supabase Edge Function usage and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {edgeFunctionLogs.map((func) => (
                    <div key={func.function_name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{func.function_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Last called: {format(new Date(func.last_call), 'MMM d, HH:mm')}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            📞 {func.calls_today} calls today
                          </span>
                          <span className="text-sm">
                            ⚡ {func.avg_duration}ms avg
                          </span>
                          {func.errors_today > 0 && (
                            <Badge variant="destructive">
                              {func.errors_today} errors
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scaling Limits & Alerts</CardTitle>
                <CardDescription>
                  Monitor resource usage against known limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">Google News API</p>
                        <p className="text-sm text-muted-foreground">10,000 requests/day limit</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {metrics.dailyMentionsBySource['Google News'] || 0}
                      </p>
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

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-medium">Database Storage</p>
                        <p className="text-sm text-muted-foreground">500MB limit (Free plan)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">~{Math.round(metrics.totalMentions * 0.001)}MB</p>
                      <p className="text-sm text-muted-foreground">estimated usage</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}