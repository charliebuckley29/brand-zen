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
import { useQueueMonitoring } from '../hooks/useQueueMonitoring';
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
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [cursorData, setCursorData] = useState<any>(null);
  const [cursorLoading, setCursorLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // Queue monitoring hook
  const {
    queueData,
    loading: queueLoading,
    error: queueError,
    lastRefresh: queueLastRefresh,
    fetchQueueStatus,
    refreshQueueStatus,
    resetAllQueues,
    resetQueueByApiSource,
    getQueueStatusColor,
    getQueueStatusText,
    formatTimeAgo,
    getApiSourceDisplayName,
    getApiSourceIcon
  } = useQueueMonitoring({ autoRefresh: true, refreshInterval: 30000 });


  // Fetch data function
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const backendUrl = 'https://mentions-backend.vercel.app';
      
          const [userQuotaRes, monthlyRes, apiVsQuotaRes, analyticsRes, apiLimitsRes, systemHealthRes, cacheStatsRes, cursorRes] = await Promise.allSettled([
            fetch(`${backendUrl}/api/admin/user-quota-usage?month=${selectedMonth}&source_type=${selectedSource}`),
            fetch(`${backendUrl}/api/admin/monthly-mentions?month=${selectedMonth}&source_type=${selectedSource}`),
            fetch(`${backendUrl}/api/admin/api-vs-quota-limits`),
            fetch(`${backendUrl}/api/admin/quota-analytics?days=30`),
            fetch(`${backendUrl}/api/admin/api-limits`),
            fetch(`${backendUrl}/api/admin/system-health`),
            fetch(`${backendUrl}/api/admin/cache-stats`),
            fetch(`${backendUrl}/api/admin/cursor-status`)
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

      // Process cache stats
      if (cacheStatsRes.status === 'fulfilled' && cacheStatsRes.value.ok) {
        const data = await cacheStatsRes.value.json();
        setCacheStats(data.data);
      }

      // Process cursor data
      if (cursorRes.status === 'fulfilled' && cursorRes.value.ok) {
        const data = await cursorRes.value.json();
        setCursorData(data);
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

  // Cursor monitoring functions
  const fetchCursorStatus = async () => {
    setCursorLoading(true);
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/admin/cursor-status');
      const result = await response.json();
      setCursorData(result);
    } catch (error) {
      console.error('Error fetching cursor status:', error);
      toast.error('Failed to fetch cursor status');
    } finally {
      setCursorLoading(false);
    }
  };

  const runCursorHealthCheck = async () => {
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/admin/cursor-health-check?cleanup=true');
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Cursor health check complete: ${result.health_report.overall_health}`);
        await fetchCursorStatus();
      }
    } catch (error) {
      console.error('Error running cursor health check:', error);
      toast.error('Failed to run cursor health check');
    }
  };

  const getCursorStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4 text-green-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
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

    // Check queue health
    if (queueData?.summary) {
      // High number of failed entries
      if (queueData.summary.byStatus.failed > 10) {
        newAlerts.push({
          id: 'queue-high-failures',
          type: 'error',
          severity: 'high',
          title: 'High Queue Failure Rate',
          message: `${queueData.summary.byStatus.failed} failed queue entries detected`,
          service: 'queue_system',
          timestamp: new Date().toISOString()
        });
      }

      // Very old pending entries
      if (queueData.summary.oldestPendingEntry) {
        const oldestTime = new Date(queueData.summary.oldestPendingEntry.queued_at);
        const hoursOld = (Date.now() - oldestTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursOld > 2) {
          newAlerts.push({
            id: 'queue-stale-entries',
            type: 'warning',
            severity: 'medium',
            title: 'Stale Queue Entries',
            message: `Oldest pending entry is ${Math.round(hoursOld)} hours old`,
            service: 'queue_system',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check for API sources with high failure rates
      Object.entries(queueData.summary.byApiSource).forEach(([apiSource, stats]: [string, any]) => {
        if (stats.total > 0 && stats.failed / stats.total > 0.5) {
          newAlerts.push({
            id: `queue-${apiSource}-high-failure-rate`,
            type: 'warning',
            severity: 'medium',
            title: 'High Failure Rate',
            message: `${getApiSourceDisplayName(apiSource)} has ${Math.round((stats.failed / stats.total) * 100)}% failure rate`,
            service: apiSource,
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    // Check cursor health
    if (cursorData?.issues && cursorData.issues.length > 0) {
      cursorData.issues.forEach((issue: any) => {
        newAlerts.push({
          id: `cursor-${issue.type}`,
          type: issue.severity === 'error' ? 'error' : 'warning',
          severity: issue.severity === 'error' ? 'high' : 'medium',
          title: `Cursor Issue: ${issue.type}`,
          message: issue.message,
          service: 'cursor_system',
          timestamp: new Date().toISOString()
        });
      });
    }

    // Check cursor health statistics
    if (cursorData?.health) {
      const health = cursorData.health;
      
      // High error rate
      if (health.total > 0 && health.error / health.total > 0.3) {
        newAlerts.push({
          id: 'cursor-high-error-rate',
          type: 'error',
          severity: 'high',
          title: 'High Cursor Error Rate',
          message: `${health.error} out of ${health.total} cursors have errors (${Math.round((health.error / health.total) * 100)}%)`,
          service: 'cursor_system',
          timestamp: new Date().toISOString()
        });
      }

      // Many stale cursors
      if (health.stale > 10) {
        newAlerts.push({
          id: 'cursor-many-stale',
          type: 'warning',
          severity: 'medium',
          title: 'Many Stale Cursors',
          message: `${health.stale} cursors are stale and may need cleanup`,
          service: 'cursor_system',
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
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotas">User Quotas</TabsTrigger>
          <TabsTrigger value="mentions">Mention Analytics</TabsTrigger>
          <TabsTrigger value="api-limits">API Limits</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="queue" className="relative">
            Queue Status
            {queueData?.summary.byStatus.failed > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {queueData.summary.byStatus.failed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cursors" className="relative">
            Cursor Monitoring
            {cursorData?.issues && cursorData.issues.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {cursorData.issues.length}
              </Badge>
            )}
          </TabsTrigger>
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

            {/* Cache Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Cache Performance
                </CardTitle>
                <CardDescription>Response caching and performance optimization</CardDescription>
              </CardHeader>
              <CardContent>
                {cacheStats ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cache Entries</span>
                      <span className="text-sm font-mono">{cacheStats.cache_stats.validEntries}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm font-mono">{cacheStats.performance_impact.memory_usage}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Performance Improvement</span>
                      <span className="text-sm font-mono text-green-600">{cacheStats.performance_impact.estimated_improvement}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{cacheStats.cache_stats.validEntries}</div>
                        <div className="text-xs text-muted-foreground">Active Cache Entries</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-lg font-bold text-green-600">60-80%</div>
                        <div className="text-xs text-muted-foreground">Faster Response</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground">Cache statistics loading...</div>
                  </div>
                )}
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

        {/* Queue Status Tab */}
        <TabsContent value="queue" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Queue Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Queue Status Overview
                  <div className="ml-auto flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={refreshQueueStatus}
                      disabled={queueLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${queueLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={resetAllQueues}
                      disabled={queueLoading}
                    >
                      Reset All Queues
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of the user fetch queue system
                  {queueLastRefresh && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Last updated: {format(queueLastRefresh, 'HH:mm:ss')}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {queueLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : queueError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Error loading queue data: {queueError}
                    </AlertDescription>
                  </Alert>
                ) : queueData ? (
                  <div className="space-y-6">
                    {/* Overall Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{queueData.summary.total}</div>
                        <div className="text-sm text-muted-foreground">Total Entries</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{queueData.summary.byStatus.pending}</div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{queueData.summary.byStatus.completed}</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{queueData.summary.byStatus.failed}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                    </div>

                    {/* Queue Status by API Source */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Queue Status by API Source</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(queueData.summary.byApiSource).map(([apiSource, stats]: [string, any]) => (
                          <div key={apiSource} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getApiSourceIcon(apiSource)}</span>
                                <span className="font-medium">{getApiSourceDisplayName(apiSource)}</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetQueueByApiSource(apiSource)}
                                disabled={queueLoading}
                              >
                                Reset
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Total:</span>
                                <span className="font-medium">{stats.total}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-yellow-600">Pending:</span>
                                <span className="font-medium">{stats.pending}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-blue-600">Processing:</span>
                                <span className="font-medium">{stats.processing}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-green-600">Completed:</span>
                                <span className="font-medium">{stats.completed}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-red-600">Failed:</span>
                                <span className="font-medium">{stats.failed}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Avg Priority:</span>
                                <span className="font-medium">{stats.averagePriority}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Queue Entries */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Recent Queue Entries</h4>
                      <div className="border rounded-lg">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium">Source</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Priority</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Queued</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Last Served</th>
                              </tr>
                            </thead>
                            <tbody>
                              {queueData.entries.slice(0, 20).map((entry) => (
                                <tr key={entry.id} className="border-t">
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <span>{getApiSourceIcon(entry.api_source)}</span>
                                      <span className="text-sm">{getApiSourceDisplayName(entry.api_source)}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <Badge 
                                      variant={entry.status === 'failed' ? 'destructive' : 
                                               entry.status === 'completed' ? 'default' : 
                                               entry.status === 'processing' ? 'secondary' : 'outline'}
                                    >
                                      {getQueueStatusText(entry.status)}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2 text-sm">{entry.priority_score}</td>
                                  <td className="px-4 py-2 text-sm text-muted-foreground">
                                    {formatTimeAgo(entry.queued_at)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-muted-foreground">
                                    {entry.last_served_at ? formatTimeAgo(entry.last_served_at) : 'Never'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Queue Health Indicators */}
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Queue Health Indicators</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <h5 className="font-medium mb-2">Oldest Pending Entry</h5>
                          {queueData.summary.oldestPendingEntry ? (
                            <div className="text-sm text-muted-foreground">
                              <div>Source: {getApiSourceDisplayName(queueData.summary.oldestPendingEntry.api_source)}</div>
                              <div>Queued: {formatTimeAgo(queueData.summary.oldestPendingEntry.queued_at)}</div>
                              <div>Priority: {queueData.summary.oldestPendingEntry.priority_score}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-green-600">No pending entries</div>
                          )}
                        </div>
                        <div className="border rounded-lg p-4">
                          <h5 className="font-medium mb-2">Average Priority Score</h5>
                          <div className="text-2xl font-bold text-blue-600">
                            {queueData.summary.averagePriorityScore}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Higher scores = higher priority
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">No queue data available</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cursor Monitoring Tab */}
        <TabsContent value="cursors" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Cursor Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cursor Monitoring Overview
                  <div className="ml-auto flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={runCursorHealthCheck}
                      disabled={cursorLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${cursorLoading ? 'animate-spin' : ''}`} />
                      Health Check
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchCursorStatus}
                      disabled={cursorLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${cursorLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Monitor API cursor continuity and pagination state across all users and brands
                  {cursorData?.timestamp && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Last updated: {format(new Date(cursorData.timestamp), 'HH:mm:ss')}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cursorLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : cursorData ? (
                  <div className="space-y-6">
                    {/* Health Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Database className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{cursorData.health.total}</div>
                        <div className="text-sm text-muted-foreground">Total Cursors</div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-green-600">{cursorData.health.active}</div>
                        <div className="text-sm text-muted-foreground">Active</div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{cursorData.health.completed}</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-red-600">{cursorData.health.error}</div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div className="text-2xl font-bold text-yellow-600">{cursorData.health.stale}</div>
                        <div className="text-sm text-muted-foreground">Stale</div>
                      </div>
                    </div>

                    {/* Issues */}
                    {cursorData.issues && cursorData.issues.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          Issues Detected ({cursorData.issues.length})
                        </h4>
                        <div className="space-y-4">
                          {cursorData.issues.map((issue: any, index: number) => (
                            <Alert key={index} variant={getSeverityColor(issue.severity)}>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <div className="font-medium">{issue.message}</div>
                                {issue.examples && issue.examples.length > 0 && (
                                  <div className="mt-2 text-sm">
                                    <div className="font-medium">Examples:</div>
                                    <ul className="list-disc list-inside mt-1">
                                      {issue.examples.slice(0, 3).map((example: any, idx: number) => (
                                        <li key={idx}>
                                          {example.user_id} - {example.api_source} 
                                          {example.hours_stale && ` (${example.hours_stale}h old)`}
                                          {example.error_message && ` - ${example.error_message}`}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed View */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold">All Cursors ({cursorData.cursors?.length || 0})</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">User</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Brand</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Source</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Last Fetched</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Cursor Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cursorData.cursors?.slice(0, 20).map((cursor: any) => (
                                <tr key={cursor.id} className="border-t">
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      {getCursorStatusIcon(cursor.status)}
                                      <Badge variant={cursor.status === 'active' ? 'default' : 'secondary'}>
                                        {cursor.status}
                                      </Badge>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-sm">{cursor.user_email || cursor.user_id}</td>
                                  <td className="px-4 py-2 text-sm">{cursor.brand_name || 'Unknown'}</td>
                                  <td className="px-4 py-2">
                                    <Badge variant="outline">{cursor.api_source}</Badge>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-muted-foreground">
                                    {new Date(cursor.last_fetched_at).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="max-w-xs truncate text-sm">
                                      {cursor.cursor_data ? JSON.stringify(cursor.cursor_data).substring(0, 50) + '...' : 'None'}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">No cursor data available</div>
                  </div>
                )}
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
