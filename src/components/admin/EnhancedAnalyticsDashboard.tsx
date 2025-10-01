import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import {
  RefreshCw, TrendingUp, TrendingDown, Activity, BarChart3, Brain, Target, 
  AlertTriangle, CheckCircle, XCircle, Clock, Loader2, Info, Search, Filter,
  Zap, Gauge, LineChart, PieChart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface SystemHealthScore {
  overall: number;
  components: {
    queueHealth: number;
    apiPerformance: number;
    errorRate: number;
    recoverySuccess: number;
    alertResponse: number;
  };
  trends: {
    queueHealth: 'improving' | 'stable' | 'declining';
    apiPerformance: 'improving' | 'stable' | 'declining';
    errorRate: 'improving' | 'stable' | 'declining';
  };
  recommendations: string[];
  lastUpdated: string;
}

interface PredictiveInsight {
  type: 'failure_prediction' | 'capacity_warning' | 'performance_degradation' | 'trend_analysis';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  predictedTime?: string;
  recommendedAction: string;
  metadata?: any;
}

interface TrendAnalysis {
  metric: string;
  period: 'hour' | 'day' | 'week' | 'month';
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  changePercentage: number;
  dataPoints: Array<{ timestamp: string; value: number }>;
  forecast?: Array<{ timestamp: string; predictedValue: number; confidence: number }>;
}

interface PerformanceBenchmark {
  apiSource: string;
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  performance: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  improvement: number;
  historicalAverage: number;
  bestPerformance: number;
  worstPerformance: number;
}

export function EnhancedAnalyticsDashboard() {
  const [healthScore, setHealthScore] = useState<SystemHealthScore | null>(null);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis[]>([]);
  const [benchmarks, setBenchmarks] = useState<PerformanceBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('health_score');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('day');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const baseUrl = 'https://brandprotected.com/api';

    try {
      // Fetch all analytics data in parallel
      const [healthResponse, insightsResponse, trendsResponse, benchmarksResponse] = await Promise.all([
        fetch(`${baseUrl}/api/admin/analytics/health-score`),
        fetch(`${baseUrl}/api/admin/analytics/predictive-insights`),
        fetch(`${baseUrl}/api/admin/analytics/trends?metric=${selectedMetric}&period=${selectedPeriod}`),
        fetch(`${baseUrl}/api/admin/analytics/benchmarks`)
      ]);

      const [healthResult, insightsResult, trendsResult, benchmarksResult] = await Promise.all([
        healthResponse.json(),
        insightsResponse.json(),
        trendsResponse.json(),
        benchmarksResponse.json()
      ]);

      if (healthResult.success) {
        setHealthScore(healthResult.data);
      } else {
        throw new Error(healthResult.error || 'Failed to fetch health score');
      }

      if (insightsResult.success) {
        setPredictiveInsights(insightsResult.data);
      } else {
        throw new Error(insightsResult.error || 'Failed to fetch predictive insights');
      }

      if (trendsResult.success) {
        setTrendAnalysis(trendsResult.data);
      } else {
        throw new Error(trendsResult.error || 'Failed to fetch trend analysis');
      }

      if (benchmarksResult.success) {
        setBenchmarks(benchmarksResult.data);
      } else {
        throw new Error(benchmarksResult.error || 'Failed to fetch benchmarks');
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("Error fetching analytics data:", err);
      setError(err.message);
      toast({
        title: "Error fetching analytics data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, selectedPeriod, toast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'average': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'volatile': return <Activity className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading && !healthScore) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Predictive insights, trend analysis, and performance benchmarking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {formatDistanceToNow(lastRefresh)} ago
            </span>
          )}
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error loading analytics data</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* System Health Score Overview */}
      {healthScore && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Health Score</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getHealthScoreColor(healthScore.overall)}`}>
                {healthScore.overall}
              </div>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHealthScoreBg(healthScore.overall)} ${getHealthScoreColor(healthScore.overall)}`}>
                {healthScore.overall >= 80 ? 'Excellent' : 
                 healthScore.overall >= 60 ? 'Good' : 
                 healthScore.overall >= 40 ? 'Fair' : 'Poor'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {formatDistanceToNow(parseISO(healthScore.lastUpdated))} ago
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore.components.queueHealth)}`}>
                {healthScore.components.queueHealth}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(healthScore.trends.queueHealth)}
                <span className="text-xs text-muted-foreground capitalize">
                  {healthScore.trends.queueHealth}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Performance</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore.components.apiPerformance)}`}>
                {healthScore.components.apiPerformance}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(healthScore.trends.apiPerformance)}
                <span className="text-xs text-muted-foreground capitalize">
                  {healthScore.trends.apiPerformance}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore.components.errorRate)}`}>
                {healthScore.components.errorRate}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(healthScore.trends.errorRate)}
                <span className="text-xs text-muted-foreground capitalize">
                  {healthScore.trends.errorRate}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recovery Success</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore.components.recoverySuccess)}`}>
                {healthScore.components.recoverySuccess}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Automated recovery rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {healthScore && healthScore.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              System Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthScore.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-800">{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Predictive Insights</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="benchmarks">Performance Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Predictive Insights
              </CardTitle>
              <CardDescription>
                AI-powered predictions and early warning system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictiveInsights.map((insight, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{insight.title}</h3>
                            <Badge className={getSeverityColor(insight.severity)}>
                              {insight.severity}
                            </Badge>
                            <Badge variant="outline">
                              {insight.confidence}% confidence
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                          <div className="text-sm">
                            <strong>Recommended Action:</strong> {insight.recommendedAction}
                          </div>
                          {insight.predictedTime && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Predicted time: {formatDistanceToNow(parseISO(insight.predictedTime))} from now
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {predictiveInsights.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No predictive insights available</p>
                    <p className="text-sm">The system is monitoring for patterns and will generate insights as data becomes available.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Trend Analysis Controls */}
          <div className="flex items-center gap-4">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="health_score">Health Score</option>
              <option value="error_rate">Error Rate</option>
              <option value="avg_processing_time_seconds">Processing Time</option>
              <option value="total_queues">Total Queues</option>
            </select>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last Day</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Trend Analysis
              </CardTitle>
              <CardDescription>
                Historical trends and forecasting for {selectedMetric}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendAnalysis.map((trend, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{trend.metric.replace('_', ' ').toUpperCase()}</h3>
                        <p className="text-sm text-muted-foreground">
                          {trend.period} trend analysis
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(trend.trend)}
                        <Badge variant="outline">
                          {trend.changePercentage > 0 ? '+' : ''}{trend.changePercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Trend:</strong> <span className="capitalize">{trend.trend}</span>
                      </div>
                      <div className="text-sm">
                        <strong>Change:</strong> {trend.changePercentage > 0 ? '+' : ''}{trend.changePercentage.toFixed(1)}% over the {trend.period}
                      </div>
                      <div className="text-sm">
                        <strong>Data Points:</strong> {trend.dataPoints.length}
                      </div>
                      
                      {trend.forecast && trend.forecast.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-2">Forecast</h4>
                          <div className="space-y-1">
                            {trend.forecast.map((forecast, fIndex) => (
                              <div key={fIndex} className="text-sm text-blue-700">
                                {formatDistanceToNow(parseISO(forecast.timestamp))} from now: 
                                <strong> {forecast.predictedValue.toFixed(1)}</strong> 
                                ({forecast.confidence}% confidence)
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {trendAnalysis.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No trend data available</p>
                    <p className="text-sm">Trend analysis will be available as more data is collected.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Benchmarks
              </CardTitle>
              <CardDescription>
                Compare current performance against historical benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {benchmarks.map((benchmark, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{benchmark.apiSource.toUpperCase()}</h3>
                        <p className="text-sm text-muted-foreground">
                          {benchmark.metric.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(benchmark.performance)}>
                          {benchmark.performance}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Current</div>
                        <div className={`text-lg font-bold ${getPerformanceColor(benchmark.performance)}`}>
                          {benchmark.currentValue.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Benchmark</div>
                        <div className="text-lg font-bold">
                          {benchmark.benchmarkValue.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Best</div>
                        <div className="text-lg font-bold text-green-600">
                          {benchmark.bestPerformance.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Improvement</div>
                        <div className={`text-lg font-bold ${benchmark.improvement > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {benchmark.improvement > 0 ? '+' : ''}{benchmark.improvement.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {benchmarks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No benchmark data available</p>
                    <p className="text-sm">Benchmarks will be available after collecting sufficient historical data.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
