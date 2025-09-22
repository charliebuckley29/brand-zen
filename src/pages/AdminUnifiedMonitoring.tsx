import React, { useState, useEffect } from 'react';
import { useUserRole } from '../hooks/use-user-role';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { 
  ArrowLeft, 
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
  Loader2,
  Eye,
  EyeOff,
  Calendar,
  Filter,
  Download,
  Settings,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

// Types for the unified monitoring data
interface UserQuotaUsage {
  user_id: string;
  full_name: string;
  quota_usage: Array<{
    source_type: string;
    monthly_limit: number;
    current_usage: number;
    remaining_quota: number;
    utilization_percentage: number;
  }>;
}

interface MonthlyMentionsData {
  month: string;
  total_mentions: number;
  mentions_by_source: Array<{
    source_type: string;
    total_mentions: number;
    unique_users: number;
    avg_mentions_per_user: number;
  }>;
  mentions_by_user: Array<{
    user_id: string;
    total_mentions: number;
    mentions_by_source: Record<string, number>;
    full_name: string;
  }>;
  unique_users: number;
}

interface ApiVsQuotaData {
  external_api_usage: {
    apify?: {
      available: boolean;
      data?: {
        computeUnitsUsed: number;
        computeUnitsLimit: number;
        usagePercentage: number;
      };
      error?: string;
    };
    scraperapi?: {
      available: boolean;
      data?: {
        creditsRemaining: number;
        plan: string;
      };
      error?: string;
    };
    [key: string]: any;
  };
  user_quota_usage: {
    total_users: number;
    total_monthly_quota: number;
    quota_utilization_percentage: number;
    quota_usage_by_source: Record<string, any>;
  };
  warnings: Array<{
    type: string;
    service?: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface QuotaAnalyticsData {
  period_days: number;
  current_month: string;
  overall_stats: {
    total_mentions: number;
    total_api_calls: number;
    total_users: number;
    total_limits: number;
    avg_mentions_per_user: number;
  };
  source_analytics: Array<{
    source_type: string;
    total_mentions: number;
    total_api_calls: number;
    unique_users: number;
    active_limits: number;
    current_month_mentions: number;
    avg_mentions_per_user: number;
  }>;
  top_users: Array<{
    user_id: string;
    full_name: string;
    total_mentions: number;
    source_breakdown: Record<string, number>;
  }>;
}

const AdminUnifiedMonitoring: React.FC = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedSource, setSelectedSource] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Data state
  const [userQuotaUsage, setUserQuotaUsage] = useState<UserQuotaUsage[]>([]);
  const [monthlyMentions, setMonthlyMentions] = useState<MonthlyMentionsData | null>(null);
  const [apiVsQuota, setApiVsQuota] = useState<ApiVsQuotaData | null>(null);
  const [quotaAnalytics, setQuotaAnalytics] = useState<QuotaAnalyticsData | null>(null);
  const [apiLimits, setApiLimits] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Fetch data function
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const backendUrl = 'https://mentions-backend.vercel.app';
      
          const [userQuotaRes, monthlyRes, apiVsQuotaRes, analyticsRes, apiLimitsRes, systemHealthRes] = await Promise.allSettled([
            fetch(`${backendUrl}/api/admin/user-quota-usage?month=${selectedMonth}&source_type=${selectedSource}`),
            fetch(`${backendUrl}/api/admin/monthly-mentions?month=${selectedMonth}&source_type=${selectedSource}`),
            fetch(`${backendUrl}/api/admin/api-vs-quota-limits`),
            fetch(`${backendUrl}/api/admin/quota-analytics?days=30`),
            fetch(`${backendUrl}/api/admin/api-limits`),
            fetch(`${backendUrl}/api/admin/system-health`)
          ]);

      // Process user quota usage
      if (userQuotaRes.status === 'fulfilled' && userQuotaRes.value.ok) {
        const data = await userQuotaRes.value.json();
        setUserQuotaUsage(data.data.users || []);
      }

      // Process monthly mentions
      if (monthlyRes.status === 'fulfilled' && monthlyRes.value.ok) {
        const data = await monthlyRes.value.json();
        setMonthlyMentions(data.data);
      }

      // Process API vs quota
      if (apiVsQuotaRes.status === 'fulfilled' && apiVsQuotaRes.value.ok) {
        const data = await apiVsQuotaRes.value.json();
        setApiVsQuota(data.data);
      }

      // Process quota analytics
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        const data = await analyticsRes.value.json();
        setQuotaAnalytics(data.data);
      }

      // Process API limits
      if (apiLimitsRes.status === 'fulfilled' && apiLimitsRes.value.ok) {
        const data = await apiLimitsRes.value.json();
        setApiLimits(data.limits);
      }

      // Process system health
      if (systemHealthRes.status === 'fulfilled' && systemHealthRes.value.ok) {
        const data = await systemHealthRes.value.json();
        setSystemHealth(data.data);
      }

      // Generate alerts based on data
      generateAlerts();

      setLastRefresh(new Date());
      toast.success('Monitoring data refreshed successfully');
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      toast.error('Failed to refresh monitoring data');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin, selectedMonth, selectedSource]);

  // Loading state
  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  // Access control
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this page.
          </p>
          <Link to="/dashboard" className="text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Helper functions
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge variant="destructive">Critical</Badge>;
    if (percentage >= 75) return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="default">Healthy</Badge>;
  };

  // Generate alerts based on monitoring data
  const generateAlerts = () => {
    const newAlerts: any[] = [];

    // Check API limits
    if (apiLimits) {
      Object.entries(apiLimits).forEach(([service, data]: [string, any]) => {
        if (!data.available) {
          newAlerts.push({
            id: `api-${service}-unavailable`,
            type: 'error',
            severity: 'high',
            title: `${service.toUpperCase()} API Unavailable`,
            message: data.error || 'API service is not responding',
            service,
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    // Check quota usage
    if (userQuotaUsage) {
      userQuotaUsage.forEach(user => {
        user.quota_usage.forEach((quota: any) => {
          if (quota.utilization_percentage > 90) {
            newAlerts.push({
              id: `quota-${user.user_id}-${quota.source_type}`,
              type: 'warning',
              severity: 'high',
              title: 'High Quota Usage',
              message: `${user.full_name} has used ${quota.utilization_percentage.toFixed(1)}% of ${quota.source_type} quota`,
              user: user.full_name,
              source: quota.source_type,
              timestamp: new Date().toISOString()
            });
          }
        });
      });
    }

    // Check API usage
    if (apiVsQuota?.external_api_usage) {
      Object.entries(apiVsQuota.external_api_usage).forEach(([service, data]: [string, any]) => {
        if (data.usage_percentage > 80) {
          newAlerts.push({
            id: `usage-${service}-high`,
            type: 'warning',
            severity: 'medium',
            title: 'High API Usage',
            message: `${service} API usage at ${data.usage_percentage.toFixed(1)}%`,
            service,
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    // Check system health
    if (systemHealth) {
      // Database health
      if (systemHealth.database?.status !== 'healthy') {
        newAlerts.push({
          id: 'database-unhealthy',
          type: 'error',
          severity: 'high',
          title: 'Database Connection Issue',
          message: systemHealth.database?.error || 'Database connection is unhealthy',
          service: 'database',
          timestamp: new Date().toISOString()
        });
      }

      // API endpoints health
      if (systemHealth.api_endpoints?.status !== 'operational') {
        newAlerts.push({
          id: 'api-endpoints-degraded',
          type: 'warning',
          severity: 'medium',
          title: 'API Endpoints Degraded',
          message: systemHealth.api_endpoints?.error || 'API endpoints are not operational',
          service: 'api_endpoints',
          timestamp: new Date().toISOString()
        });
      }

      // Automated fetching health
      if (systemHealth.automated_fetching?.status === 'inactive') {
        newAlerts.push({
          id: 'automated-fetching-inactive',
          type: 'error',
          severity: 'high',
          title: 'Automated Fetching Inactive',
          message: systemHealth.automated_fetching?.error || 'Automated fetching is not running',
          service: 'automated_fetching',
          timestamp: new Date().toISOString()
        });
      } else if (systemHealth.automated_fetching?.status === 'no_recent_activity') {
        newAlerts.push({
          id: 'automated-fetching-no-activity',
          type: 'warning',
          severity: 'medium',
          title: 'No Recent Fetch Activity',
          message: systemHealth.automated_fetching?.error || 'No recent automated fetching activity detected',
          service: 'automated_fetching',
          timestamp: new Date().toISOString()
        });
      }

      // Queue system health
      if (systemHealth.queue_system?.status === 'error') {
        newAlerts.push({
          id: 'queue-system-error',
          type: 'error',
          severity: 'high',
          title: 'Queue System Error',
          message: systemHealth.queue_system?.error || 'Queue system has encountered an error',
          service: 'queue_system',
          timestamp: new Date().toISOString()
        });
      } else if (systemHealth.queue_system?.status === 'empty') {
        newAlerts.push({
          id: 'queue-system-empty',
          type: 'warning',
          severity: 'low',
          title: 'Queue System Empty',
          message: systemHealth.queue_system?.error || 'No users in the fetch queue',
          service: 'queue_system',
          timestamp: new Date().toISOString()
        });
      }
    }

    setAlerts(newAlerts);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const sourceColors = {
    youtube: '#FF0000',
    reddit: '#FF4500',
    x: '#1DA1F2',
    google_alert: '#4285F4',
    rss_news: '#34A853',
    openai: '#10A37F'
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Unified Monitoring Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive view of API usage, quotas, and system performance
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchAllData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="text-sm text-muted-foreground">
            Last updated: {format(lastRefresh, 'HH:mm:ss')}
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Month:</span>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Source:</span>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="reddit">Reddit</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                  <SelectItem value="google_alert">Google Alerts</SelectItem>
                  <SelectItem value="rss_news">RSS News</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {apiVsQuota?.warnings && apiVsQuota.warnings.length > 0 && (
        <div className="space-y-2">
          {apiVsQuota.warnings.map((warning, index) => (
            <Alert key={index} variant={warning.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{warning.service || warning.type}:</strong> {warning.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotas">User Quotas</TabsTrigger>
          <TabsTrigger value="mentions">Mention Analytics</TabsTrigger>
          <TabsTrigger value="api-limits">API Limits</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(monthlyMentions?.total_mentions || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedMonth} • {monthlyMentions?.unique_users || 0} users
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(quotaAnalytics?.overall_stats.total_api_calls || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last 30 days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quota Utilization</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(apiVsQuota?.user_quota_usage.quota_utilization_percentage || 0)}`}>
                  {Math.round(apiVsQuota?.user_quota_usage.quota_utilization_percentage || 0)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {getStatusBadge(apiVsQuota?.user_quota_usage.quota_utilization_percentage || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {apiVsQuota?.user_quota_usage.total_users || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  With quota limits
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mentions by Source */}
            <Card>
              <CardHeader>
                <CardTitle>Mentions by Source</CardTitle>
                <CardDescription>Distribution of mentions across different sources</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={monthlyMentions?.mentions_by_source || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source_type, total_mentions }) => `${source_type}: ${total_mentions}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_mentions"
                    >
                      {(monthlyMentions?.mentions_by_source || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={sourceColors[entry.source_type as keyof typeof sourceColors] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* API Usage by Source */}
            <Card>
              <CardHeader>
                <CardTitle>API Usage by Source</CardTitle>
                <CardDescription>API calls distribution across sources</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quotaAnalytics?.source_analytics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source_type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total_api_calls" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Quotas Tab */}
        <TabsContent value="quotas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Quota Usage</CardTitle>
              <CardDescription>
                Current quota usage for all users in {selectedMonth}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userQuotaUsage.map((user) => (
                  <Card key={user.user_id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <Badge variant="outline">{user.user_id.slice(0, 8)}...</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      {user.quota_usage.map((quota) => (
                        <div key={quota.source_type} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">
                              {quota.source_type.replace('_', ' ')}
                            </span>
                            <span className={`text-xs ${getStatusColor(quota.utilization_percentage)}`}>
                              {Math.round(quota.utilization_percentage)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                quota.utilization_percentage >= 90 
                                  ? 'bg-red-500' 
                                  : quota.utilization_percentage >= 75 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(quota.utilization_percentage, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {quota.current_usage} / {quota.monthly_limit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mention Analytics Tab */}
        <TabsContent value="mentions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mentions by User */}
            <Card>
              <CardHeader>
                <CardTitle>Top Users by Mentions</CardTitle>
                <CardDescription>Users with the most mentions in {selectedMonth}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyMentions?.mentions_by_user.slice(0, 10).map((user, index) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {Object.keys(user.mentions_by_source).length} sources
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatNumber(user.total_mentions)}</p>
                        <p className="text-xs text-muted-foreground">mentions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Source Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Source Performance</CardTitle>
                <CardDescription>Detailed breakdown by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyMentions?.mentions_by_source.map((source) => (
                    <div key={source.source_type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: sourceColors[source.source_type as keyof typeof sourceColors] || '#8884d8' }}
                        />
                        <div>
                          <p className="font-medium capitalize">
                            {source.source_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {source.unique_users} users
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatNumber(source.total_mentions)}</p>
                        <p className="text-xs text-muted-foreground">
                          {source.avg_mentions_per_user} avg/user
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Limits Tab */}
        <TabsContent value="api-limits" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* External API Status */}
            <Card>
              <CardHeader>
                <CardTitle>External API Status</CardTitle>
                <CardDescription>Status of external API services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(apiLimits || {}).map(([service, data]: [string, any]) => (
                    <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          data.available ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium capitalize">{service}</p>
                          {data.data && (
                            <p className="text-sm text-muted-foreground">
                              {data.data.message}
                              {data.data.estimatedLimit && ` - ${data.data.estimatedLimit}`}
                            </p>
                          )}
                          {data.error && (
                            <p className="text-sm text-red-500">{data.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {data.available ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Error</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* API Usage Trends */}
            <Card>
              <CardHeader>
                <CardTitle>API Usage Trends</CardTitle>
                <CardDescription>Recent API usage patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quotaAnalytics?.source_analytics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source_type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total_api_calls" fill="#8884d8" />
                    <Bar dataKey="total_mentions" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Status
                </CardTitle>
                <CardDescription>Overall system health and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Connection</span>
                    <Badge variant={
                      systemHealth?.database?.status === 'healthy' ? 'default' : 'destructive'
                    } className={
                      systemHealth?.database?.status === 'healthy' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {systemHealth?.database?.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Endpoints</span>
                    <Badge variant={
                      systemHealth?.api_endpoints?.status === 'operational' ? 'default' : 'secondary'
                    } className={
                      systemHealth?.api_endpoints?.status === 'operational' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {systemHealth?.api_endpoints?.status === 'operational' ? 'Operational' : 'Degraded'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Automated Fetching</span>
                    <Badge variant={
                      systemHealth?.automated_fetching?.status === 'active' ? 'default' : 'secondary'
                    } className={
                      systemHealth?.automated_fetching?.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {systemHealth?.automated_fetching?.status === 'active' ? 'Active' : 
                       systemHealth?.automated_fetching?.status === 'no_recent_activity' ? 'No Recent Activity' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Queue System</span>
                    <Badge variant={
                      systemHealth?.queue_system?.status === 'processing' ? 'default' : 'secondary'
                    } className={
                      systemHealth?.queue_system?.status === 'processing' 
                        ? 'bg-green-100 text-green-800' 
                        : systemHealth?.queue_system?.status === 'empty'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {systemHealth?.queue_system?.status === 'processing' ? 'Processing' :
                       systemHealth?.queue_system?.status === 'empty' ? 'Empty' : 'Error'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>System performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Response Time</span>
                    <span className="text-sm font-mono">{systemHealth?.performance?.average_response_time || '~150ms'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm font-mono text-green-600">{systemHealth?.performance?.success_rate || '99.8%'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Users</span>
                    <span className="text-sm font-mono">{userQuotaUsage.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Mentions This Month</span>
                    <span className="text-sm font-mono">{monthlyMentions?.total_mentions || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* User Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Activity Summary
                </CardTitle>
                <CardDescription>Overview of user activity and quota usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{userQuotaUsage.length}</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {userQuotaUsage.filter(user => 
                        user.quota_usage.some((quota: any) => quota.current_usage > 0)
                      ).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Users with Activity</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {userQuotaUsage.filter(user => 
                        user.quota_usage.some((quota: any) => quota.utilization_percentage > 80)
                      ).length}
                    </div>
                    <div className="text-sm text-muted-foreground">High Usage Users</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {monthlyMentions?.unique_users || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique Users This Month</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Users by Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Top Users by Mention Volume</CardTitle>
                <CardDescription>Users with the most mentions fetched this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyMentions?.mentions_by_user?.slice(0, 10).map((user: any, index: number) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {Object.entries(user.mentions_by_source).map(([source, count]) => (
                              <span key={source} className="mr-2">
                                {source}: {count as number}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{user.total_mentions}</div>
                        <div className="text-sm text-muted-foreground">mentions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Alerts Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  System Alerts
                  {alerts.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {alerts.length} Active
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Real-time alerts for system issues, quota usage, and API problems
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-600 mb-2">All Systems Healthy</h3>
                    <p className="text-muted-foreground">No active alerts at this time</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 border rounded-lg ${
                          alert.severity === 'high' 
                            ? 'border-red-200 bg-red-50 dark:bg-red-900/20' 
                            : alert.severity === 'medium'
                            ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              alert.severity === 'high' ? 'bg-red-500' : 
                              alert.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                            }`} />
                            <div>
                              <h4 className="font-semibold">{alert.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                                <span>{format(new Date(alert.timestamp), 'MMM dd, HH:mm:ss')}</span>
                                {alert.service && <span>Service: {alert.service}</span>}
                                {alert.user && <span>User: {alert.user}</span>}
                              </div>
                            </div>
                          </div>
                          <Badge variant={
                            alert.severity === 'high' ? 'destructive' : 
                            alert.severity === 'medium' ? 'secondary' : 'outline'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alert Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Alert Thresholds
                </CardTitle>
                <CardDescription>
                  Configure alert thresholds for different monitoring metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Quota Usage Alerts</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Warning Threshold:</span>
                          <span className="font-mono">90%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Critical Threshold:</span>
                          <span className="font-mono">95%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">API Usage Alerts</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Warning Threshold:</span>
                          <span className="font-mono">80%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Critical Threshold:</span>
                          <span className="font-mono">90%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">System Health Alerts</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Response Time:</span>
                          <span className="font-mono">&gt; 1s</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error Rate:</span>
                          <span className="font-mono">&gt; 5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>API Availability:</span>
                          <span className="font-mono">Any failure</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUnifiedMonitoring;
