import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Activity, TrendingUp, AlertTriangle, RefreshCw, Clock, Zap, BarChart3, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface ApiUsageData {
  timeSeries: Array<{
    timestamp: string;
    calls: number;
    errors: number;
    bySource: Record<string, { calls: number; errors: number }>;
  }>;
  bySource: Record<string, {
    source: string;
    totalCalls: number;
    errorCalls: number;
    uniqueUsers: number;
    endpoints: string[];
    lastUsed: string;
    errorRate: number;
  }>;
  totals: {
    totalCalls: number;
    errorCalls: number;
    errorRate: number;
    uniqueUsers: number;
    uniqueSources: number;
    averageCallsPerRequest: number;
  };
  warnings: Array<{
    type: 'warning' | 'error';
    source: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    details?: any;
  }>;
}

interface ApiLimitsData {
  limits: Record<string, {
    available: boolean;
    data: any;
    error: string | null;
  }>;
  warnings: Array<{
    service: string;
    type: 'warning' | 'error';
    message: string;
    severity: 'low' | 'medium' | 'high';
    details?: any;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AdminApiLimitsPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [usageData, setUsageData] = useState<ApiUsageData | null>(null);
  const [limitsData, setLimitsData] = useState<ApiLimitsData | null>(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, timeframe, source]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usageResponse, limitsResponse] = await Promise.all([
        fetch(`/api/admin/api-usage?timeframe=${timeframe}${source ? `&source=${source}` : ''}`),
        fetch('/api/admin/api-limits')
      ]);

      if (usageResponse.ok) {
        const usageResult = await usageResponse.json();
        setUsageData(usageResult.data);
      }

      if (limitsResponse.ok) {
        const limitsResult = await limitsResponse.json();
        setLimitsData(limitsResult);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch API data:', error);
    } finally {
      setLoading(false);
    }
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

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
              <h1 className="text-3xl font-bold">API Limits & Usage</h1>
              <p className="text-muted-foreground">
                Monitor API usage across all services and track limits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-sm text-muted-foreground">
                Last updated: {format(lastUpdated, 'HH:mm:ss')}
              </div>
            )}
            <Button onClick={fetchData} disabled={loading} size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sources</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="reddit">Reddit</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="apify">Apify</SelectItem>
              <SelectItem value="scraperapi">ScraperAPI</SelectItem>
              <SelectItem value="lobstr">Lobstr</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Warnings */}
        {(usageData?.warnings.length || limitsData?.warnings.length) && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Warnings & Alerts
            </h3>
            <div className="grid gap-2">
              {usageData?.warnings.map((warning, index) => (
                <Alert key={`usage-${index}`} variant={getSeverityColor(warning.severity)}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{warning.source}:</strong> {warning.message}
                  </AlertDescription>
                </Alert>
              ))}
              {limitsData?.warnings.map((warning, index) => (
                <Alert key={`limits-${index}`} variant={getSeverityColor(warning.severity)}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{warning.service}:</strong> {warning.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {usageData && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageData.totals.totalCalls.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {usageData.totals.uniqueUsers} unique users
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageData.totals.errorRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {usageData.totals.errorCalls} error calls
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageData.totals.uniqueSources}</div>
                <p className="text-xs text-muted-foreground">
                  API services in use
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Calls/Request</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageData.totals.averageCallsPerRequest.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  Per API request
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sources">By Source</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="limits">Service Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Usage by Source Chart */}
              {usageData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Usage by Source</CardTitle>
                    <CardDescription>Total API calls by service</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(usageData.bySource).map(([source, data]) => ({
                            name: source,
                            value: data.totalCalls
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(usageData.bySource).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Error Rate by Source */}
              {usageData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Error Rate by Source</CardTitle>
                    <CardDescription>Error percentage by API service</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(usageData.bySource).map(([source, data]) => ({
                        source,
                        errorRate: data.errorRate,
                        totalCalls: data.totalCalls
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="source" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="errorRate" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4">
            {usageData && (
              <div className="grid gap-4">
                {Object.entries(usageData.bySource).map(([source, data]) => (
                  <Card key={source}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="capitalize">{source}</CardTitle>
                          <CardDescription>
                            {data.totalCalls.toLocaleString()} total calls • {data.errorRate.toFixed(1)}% error rate
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={data.errorRate > 10 ? 'destructive' : 'default'}>
                            {data.errorRate.toFixed(1)}% errors
                          </Badge>
                          <Badge variant="outline">
                            {data.uniqueUsers} users
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Total Calls</div>
                          <div className="text-2xl font-bold">{data.totalCalls.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Error Calls</div>
                          <div className="text-2xl font-bold text-red-500">{data.errorCalls.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Last Used</div>
                          <div className="text-sm">{format(new Date(data.lastUsed), 'MMM dd, HH:mm')}</div>
                        </div>
                      </div>
                      {data.endpoints.length > 0 && (
                        <div className="mt-4">
                          <div className="text-sm font-medium text-muted-foreground mb-2">Endpoints</div>
                          <div className="flex flex-wrap gap-1">
                            {data.endpoints.map((endpoint, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {endpoint}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            {usageData && (
              <Card>
                <CardHeader>
                  <CardTitle>API Usage Timeline</CardTitle>
                  <CardDescription>API calls over time by source</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={usageData.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                      />
                      <Legend />
                      {Object.keys(usageData.bySource).map((source, index) => (
                        <Line
                          key={source}
                          type="monotone"
                          dataKey={`bySource.${source}.calls`}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          name={source}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="limits" className="space-y-4">
            {limitsData && (
              <div className="grid gap-4">
                {Object.entries(limitsData.limits).map(([service, limitData]) => (
                  <Card key={service}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="capitalize">{service}</CardTitle>
                          <CardDescription>
                            {limitData.available ? 'Service available' : 'Service unavailable'}
                          </CardDescription>
                        </div>
                        <Badge variant={limitData.available ? 'default' : 'destructive'}>
                          {limitData.available ? 'Active' : 'Error'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {limitData.available && limitData.data ? (
                        <div className="space-y-4">
                          {service === 'apify' && (
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <div className="text-sm font-medium text-muted-foreground">Compute Units Used</div>
                                <div className="text-2xl font-bold">{limitData.data.computeUnitsUsed}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-muted-foreground">Compute Units Limit</div>
                                <div className="text-2xl font-bold">{limitData.data.computeUnitsLimit}</div>
                              </div>
                              <div className="md:col-span-2">
                                <div className="text-sm font-medium text-muted-foreground mb-2">Usage</div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${limitData.data.usagePercentage > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(limitData.data.usagePercentage, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {limitData.data.usagePercentage.toFixed(1)}% used
                                </div>
                              </div>
                            </div>
                          )}
                          {service === 'scraperapi' && (
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <div className="text-sm font-medium text-muted-foreground">Credits Remaining</div>
                                <div className="text-2xl font-bold">{limitData.data.creditsRemaining}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-muted-foreground">Plan</div>
                                <div className="text-2xl font-bold">{limitData.data.plan}</div>
                              </div>
                            </div>
                          )}
                          {(service === 'reddit' || service === 'youtube' || service === 'openai') && (
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Status</div>
                              <div className="text-lg font-bold text-green-600">{limitData.data.status}</div>
                              <div className="text-sm text-muted-foreground mt-1">{limitData.data.message}</div>
                              {limitData.data.estimatedLimit && (
                                <div className="text-sm text-muted-foreground">
                                  Estimated limit: {limitData.data.estimatedLimit}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-red-500">
                          Error: {limitData.error || 'Service unavailable'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
