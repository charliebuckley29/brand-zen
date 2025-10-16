import { useUserRole } from "../../../hooks/use-user-role";
import { AdminLayout } from "../../../components/ui/admin-layout";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../../../components/ui/enhanced-card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Zap,
  BarChart3,
  Eye,
  Settings,
  Database,
  Globe,
  MessageSquare,
  Rss,
  Youtube,
  Twitter,
  AlertCircle,
  Info,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { createApiUrl } from "../../../lib/api";

interface ApiSourceHealth {
  source: string;
  healthy: boolean;
  responseTime: number;
  quotaUsed?: number;
  lastChecked: string;
  error?: string;
  details?: {
    apiVersion?: string;
    quotaRemaining?: string;
    quotaReset?: string;
    contentType?: string;
    note?: string;
  };
}

interface ApiSourceAnalytics {
  source: string;
  timeRange: {
    hours: number;
    startTime: string;
    endTime: string;
  };
  performance: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    averageResponseTime: number;
  };
  results: {
    totalMentions: number;
    averageMentionsPerCall: number;
    noResultsCalls: number;
    highResultCalls: number;
  };
  errors: {
    totalErrors: number;
    errorTypes: Record<string, number>;
    recentErrors: any[];
  };
  trends: {
    hourlyBreakdown: any[];
    peakHours: string[];
    lowActivityHours: string[];
  };
}

interface QueueAnalytics {
  processing: {
    totalProcessed: number;
    averageProcessingTime: number;
    fastestProcessing: number;
    slowestProcessing: number;
    processingTimeDistribution: Record<string, number>;
  };
  bySource: Record<string, {
    totalProcessed: number;
    successRate: number;
    averageProcessingTime: number;
    mentionsFound: number;
    errorRate: number;
  }>;
  users: {
    totalActiveUsers: number;
    averageProcessingPerUser: number;
    topUsers: Array<{userId: string, processed: number}>;
  };
  efficiency: {
    queueUtilization: number;
    processingThroughput: number;
    bottleneckSources: string[];
  };
}

interface DashboardData {
  overview: {
    totalApiCalls: number;
    totalMentionsFound: number;
    overallSuccessRate: number;
    averageResponseTime: number;
    activeSources: number;
    totalSources: number;
    lastUpdated: string;
  };
  health: {
    overall: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      score: number;
      healthySources: number;
      totalSources: number;
      issues: string[];
    };
    sources: ApiSourceHealth[];
    issues: string[];
  };
  analytics: {
    last24Hours: ApiSourceAnalytics[];
    performanceComparison: Record<string, any>;
    queueAnalytics: QueueAnalytics;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    source: string;
    message: string;
    timestamp: string;
    actionable: boolean;
  }>;
  recommendations: string[];
}

export default function ApiHealthMonitoringPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'analytics' | 'alerts'>('overview');

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const response = await fetch(createApiUrl('/admin/api-source-dashboard'));
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        console.error('Failed to fetch dashboard data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchDashboardData(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (roleLoading || loading) {
    return (
      <AdminLayout
        title="API Health Monitoring"
        description="Loading API health monitoring data..."
      >
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading API health data...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout
        title="API Health Monitoring"
        description="Access denied"
      >
        <div className="text-center py-12">
          <EnhancedCard variant="elevated" className="w-full max-w-md mx-auto">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="text-center">Access Denied</EnhancedCardTitle>
              <EnhancedCardDescription className="text-center">
                You need admin privileges to access this page.
              </EnhancedCardDescription>
            </EnhancedCardHeader>
          </EnhancedCard>
        </div>
      </AdminLayout>
    );
  }

  const getHealthStatus = (status: string) => {
    switch (status) {
      case 'healthy': return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Healthy' };
      case 'degraded': return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, label: 'Degraded' };
      case 'unhealthy': return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, label: 'Unhealthy' };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock, label: 'Unknown' };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube': return Youtube;
      case 'reddit': return MessageSquare;
      case 'x': return Twitter;
      case 'google_alert': return AlertCircle;
      case 'rss_news': return Rss;
      default: return Globe;
    }
  };

  const healthStatus = getHealthStatus(dashboardData?.health.overall.status || 'unknown');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'health', label: 'Health Status', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
  ];

  return (
    <AdminLayout
      title="API Health Monitoring"
      description="Real-time monitoring of API source health, performance, and analytics"
      actions={
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchDashboardData(true)} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link to="/admin/monitoring">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitoring
            </Button>
          </Link>
        </div>
      }
    >
      {/* Header with Overall Health */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Health</p>
                <p className="text-2xl font-bold">{healthStatus.label}</p>
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.health.overall.score.toFixed(1)}% ({dashboardData?.health.overall.healthySources}/{dashboardData?.health.overall.totalSources} sources)
                </p>
              </div>
              <div className={`p-3 rounded-lg ${healthStatus.bg}`}>
                <healthStatus.icon className={`h-6 w-6 ${healthStatus.color}`} />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">API Calls (24h)</p>
                <p className="text-2xl font-bold">{dashboardData?.overview.totalApiCalls.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.overview.overallSuccessRate ? (dashboardData.overview.overallSuccessRate * 100).toFixed(1) : 0}% success rate
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mentions Found</p>
                <p className="text-2xl font-bold">{dashboardData?.overview.totalMentionsFound.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {dashboardData?.overview.totalApiCalls ? (dashboardData.overview.totalMentionsFound / dashboardData.overview.totalApiCalls).toFixed(1) : 0} per call
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{dashboardData?.alerts.length || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.alerts.filter(a => a.severity === 'HIGH').length || 0} high priority
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* API Source Status Grid */}
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>API Source Status</EnhancedCardTitle>
              <EnhancedCardDescription>
                Real-time health status of all API sources
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData?.health.sources.map((source) => {
                  const SourceIcon = getSourceIcon(source.source);
                  const sourceStatus = getHealthStatus(source.healthy ? 'healthy' : 'unhealthy');
                  
                  return (
                    <div key={source.source} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <SourceIcon className="w-5 h-5" />
                          <span className="font-medium capitalize">{source.source}</span>
                        </div>
                        <div className={`p-1 rounded ${sourceStatus.bg}`}>
                          <sourceStatus.icon className={`w-4 h-4 ${sourceStatus.color}`} />
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Response Time:</span>
                          <span className={source.responseTime > 5000 ? 'text-red-600' : 'text-green-600'}>
                            {source.responseTime}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Checked:</span>
                          <span>{new Date(source.lastChecked).toLocaleTimeString()}</span>
                        </div>
                        {source.quotaUsed && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Quota Used:</span>
                            <span>{source.quotaUsed}</span>
                          </div>
                        )}
                        {source.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                            {source.error}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>

          {/* Performance Overview */}
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>Performance Overview</EnhancedCardTitle>
              <EnhancedCardDescription>
                Key performance metrics across all API sources
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {(dashboardData?.overview.overallSuccessRate * 100 || 0).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round(dashboardData?.overview.averageResponseTime || 0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Average Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {dashboardData?.analytics.queueAnalytics.efficiency.processingThroughput.toFixed(1) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Processing Throughput (per hour)</div>
                </div>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>

          {/* Recent Recommendations */}
          {dashboardData?.recommendations && dashboardData.recommendations.length > 0 && (
            <EnhancedCard>
              <EnhancedCardHeader>
                <EnhancedCardTitle>Recommendations</EnhancedCardTitle>
                <EnhancedCardDescription>
                  Actionable insights to improve system performance
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-3">
                  {dashboardData.recommendations.slice(0, 5).map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </EnhancedCardContent>
            </EnhancedCard>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>Detailed Health Status</EnhancedCardTitle>
              <EnhancedCardDescription>
                Comprehensive health information for each API source
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="space-y-4">
                {dashboardData?.health.sources.map((source) => {
                  const SourceIcon = getSourceIcon(source.source);
                  const sourceStatus = getHealthStatus(source.healthy ? 'healthy' : 'unhealthy');
                  
                  return (
                    <div key={source.source} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <SourceIcon className="w-6 h-6" />
                          <div>
                            <h3 className="font-semibold capitalize">{source.source}</h3>
                            <p className="text-sm text-muted-foreground">
                              Last checked: {new Date(source.lastChecked).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge className={source.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {source.healthy ? 'Healthy' : 'Unhealthy'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Response Time:</span>
                          <div className="font-medium">{source.responseTime}ms</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quota Used:</span>
                          <div className="font-medium">{source.quotaUsed || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">API Version:</span>
                          <div className="font-medium">{source.details?.apiVersion || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quota Remaining:</span>
                          <div className="font-medium">{source.details?.quotaRemaining || 'N/A'}</div>
                        </div>
                      </div>
                      
                      {source.error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-800 font-medium mb-1">
                            <XCircle className="w-4 h-4" />
                            Error Details
                          </div>
                          <p className="text-sm text-red-700">{source.error}</p>
                        </div>
                      )}
                      
                      {source.details?.note && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                            <Info className="w-4 h-4" />
                            Note
                          </div>
                          <p className="text-sm text-blue-700">{source.details.note}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>API Source Analytics</EnhancedCardTitle>
              <EnhancedCardDescription>
                Performance metrics and usage statistics for each API source
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="space-y-6">
                {dashboardData?.analytics.last24Hours.map((source) => {
                  const SourceIcon = getSourceIcon(source.source);
                  
                  return (
                    <div key={source.source} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <SourceIcon className="w-6 h-6" />
                        <h3 className="font-semibold capitalize">{source.source}</h3>
                        <Badge variant="outline">
                          {source.timeRange.hours}h period
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {source.performance.totalCalls}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Calls</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {(source.performance.successRate * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Success Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {source.results.totalMentions}
                          </div>
                          <div className="text-xs text-muted-foreground">Mentions Found</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {Math.round(source.performance.averageResponseTime)}ms
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Response</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Failed Calls:</span>
                          <span className="ml-2 font-medium">{source.performance.failedCalls}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">No Results:</span>
                          <span className="ml-2 font-medium">{source.results.noResultsCalls}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">High Results (>10):</span>
                          <span className="ml-2 font-medium">{source.results.highResultCalls}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Mentions/Call:</span>
                          <span className="ml-2 font-medium">{source.results.averageMentionsPerCall.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>

          {/* Queue Analytics */}
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>Queue Processing Analytics</EnhancedCardTitle>
              <EnhancedCardDescription>
                Queue processing performance and efficiency metrics
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {dashboardData?.analytics.queueAnalytics.processing.totalProcessed || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Processed (24h)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round((dashboardData?.analytics.queueAnalytics.processing.averageProcessingTime || 0) / 1000)}s
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {dashboardData?.analytics.queueAnalytics.users.totalActiveUsers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <EnhancedCard>
            <EnhancedCardHeader>
              <EnhancedCardTitle>Active Alerts</EnhancedCardTitle>
              <EnhancedCardDescription>
                Current system alerts and notifications
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              {dashboardData?.alerts && dashboardData.alerts.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.alerts.map((alert) => {
                    const SourceIcon = getSourceIcon(alert.source);
                    return (
                      <div key={alert.id} className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <SourceIcon className="w-5 h-5 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{alert.message}</h4>
                                <Badge className={getSeverityColor(alert.severity)}>
                                  {alert.severity}
                                </Badge>
                              </div>
                              <p className="text-sm opacity-75">
                                {alert.source} • {new Date(alert.timestamp).toLocaleString()}
                              </p>
                              {alert.actionable && (
                                <div className="mt-2">
                                  <Button size="sm" variant="outline">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Take Action
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs opacity-75">{alert.type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-green-800 mb-2">All Systems Healthy</h3>
                  <p className="text-green-600">No active alerts at this time.</p>
                </div>
              )}
            </EnhancedCardContent>
          </EnhancedCard>
        </div>
      )}

      {/* Footer with Last Updated */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        Last updated: {dashboardData?.overview.lastUpdated ? new Date(dashboardData.overview.lastUpdated).toLocaleString() : 'Never'}
        <span className="mx-2">•</span>
        Auto-refresh: 30s
      </div>
    </AdminLayout>
  );
}
