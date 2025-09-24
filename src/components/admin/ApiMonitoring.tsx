import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  BarChart3, 
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
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
import { toast } from 'sonner';

interface ApiMonitoringProps {
  onRefresh: () => void;
  loading: boolean;
}

export function ApiMonitoring({ onRefresh, loading }: ApiMonitoringProps) {
  const [apiLimits, setApiLimits] = useState<any>(null);
  const [apiMetrics, setApiMetrics] = useState<any>(null);

  const fetchApiData = async () => {
    try {
      // Fetch API limits
      const limitsResponse = await fetch('https://mentions-backend.vercel.app/api/admin/api-limits');
      const limitsData = await limitsResponse.json();
      setApiLimits(limitsData);

      // Fetch API metrics
      const metricsResponse = await fetch('https://mentions-backend.vercel.app/api/admin/api-metrics');
      const metricsData = await metricsResponse.json();
      setApiMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching API data:', error);
      toast.error('Failed to fetch API monitoring data');
    }
  };

  useEffect(() => {
    fetchApiData();
  }, []);

  const getApiStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getApiStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return AlertCircle;
    }
  };

  const getUsageColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* API Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            API Status Overview
          </CardTitle>
          <CardDescription>
            Real-time API health and rate limit monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={onRefresh} 
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
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {apiLimits && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(apiLimits.apis || {}).map(([apiName, apiData]: [string, any]) => {
                const StatusIcon = getApiStatusIcon(apiData.status);
                return (
                  <div key={apiName} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`h-5 w-5 ${getApiStatusColor(apiData.status)}`} />
                        <span className="font-medium capitalize">{apiName}</span>
                      </div>
                      <Badge variant="default" className={getApiStatusColor(apiData.status)}>
                        {apiData.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span>
                        <span className={getUsageColor(apiData.usage || 0, apiData.limit || 1)}>
                          {apiData.usage || 0} / {apiData.limit || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            getUsageColor(apiData.usage || 0, apiData.limit || 1) === 'text-red-600' ? 'bg-red-500' :
                            getUsageColor(apiData.usage || 0, apiData.limit || 1) === 'text-yellow-600' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(((apiData.usage || 0) / (apiData.limit || 1)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      
                      {apiData.resetTime && (
                        <div className="text-xs text-muted-foreground">
                          Resets: {new Date(apiData.resetTime).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Usage Trends */}
      {apiMetrics && apiMetrics.trends && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              API Usage Trends (Last 24 Hours)
            </CardTitle>
            <CardDescription>
              Hourly API usage patterns and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={apiMetrics.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `Hour: ${value}:00`}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="youtube" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="YouTube"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="reddit" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Reddit"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="x" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    name="X (Twitter)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="google_alert" 
                    stroke="#ff7300" 
                    strokeWidth={2}
                    name="Google Alerts"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Response Times */}
      {apiMetrics && apiMetrics.responseTimes && (
        <Card>
          <CardHeader>
            <CardTitle>API Response Times</CardTitle>
            <CardDescription>
              Average response times by API source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apiMetrics.responseTimes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="api" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}ms`, 'Response Time']} />
                  <Bar dataKey="avgResponseTime" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Error Rates */}
      {apiMetrics && apiMetrics.errorRates && (
        <Card>
          <CardHeader>
            <CardTitle>API Error Rates</CardTitle>
            <CardDescription>
              Error rates by API source (last 24 hours)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={apiMetrics.errorRates}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="errorCount"
                  >
                    {apiMetrics.errorRates.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
