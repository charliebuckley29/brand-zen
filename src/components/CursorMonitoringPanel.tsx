import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createApiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, XCircle, Clock, Activity, RefreshCw, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CursorStatus {
  id: string;
  user_id: string;
  keyword_id: string;
  api_source: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  cursor_data: any;
  last_fetched_at: string;
  error_message?: string;
  user_email?: string;
  brand_name?: string;
}

interface CursorHealth {
  total: number;
  active: number;
  completed: number;
  error: number;
  paused: number;
  stale: number;
}

interface CursorIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  count?: number;
  cursors?: any[];
  examples?: any[];
}

interface CursorMonitoringData {
  success: boolean;
  health: CursorHealth;
  issues: CursorIssue[];
  cursors: CursorStatus[];
  timestamp: string;
}

export function CursorMonitoringPanel() {
  const [data, setData] = useState<CursorMonitoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);
  const { toast } = useToast();

  const fetchCursorStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(createApiUrl('/admin/cursor-status'));
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch cursor status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setHealthCheckLoading(true);
    try {
      const response = await fetch(createApiUrl('/admin/cursor-health-check?cleanup=true'));
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Health Check Complete",
          description: `Overall health: ${result.health_report.overall_health}`,
          variant: result.health_report.overall_health === 'healthy' ? 'default' : 'destructive',
        });
        // Refresh cursor status after health check
        await fetchCursorStatus();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run health check",
        variant: "destructive",
      });
    } finally {
      setHealthCheckLoading(false);
    }
  };

  const testCursorContinuity = async () => {
    setTesting(true);
    try {
      const response = await fetch(createApiUrl('/admin/test-cursor-continuity'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '291db40f-ff62-4667-9c32-d5f802f7bfd0', // Test user
          keywordId: '02d81c19-0665-4f38-b5ab-aa07d3d111c9', // Test keyword
          testSource: 'youtube'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Continuity Test Complete",
          description: `Test ${result.testResults.success ? 'PASSED' : 'FAILED'}`,
          variant: result.testResults.success ? 'default' : 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run continuity test",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchCursorStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCursorStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
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

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cursor Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading cursor status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Cursor Monitoring
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={testCursorContinuity} 
                disabled={testing}
                variant="outline"
                size="sm"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testing ? 'Testing...' : 'Test Continuity'}
              </Button>
              <Button 
                onClick={runHealthCheck} 
                disabled={healthCheckLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${healthCheckLoading ? 'animate-spin' : ''}`} />
                Health Check
              </Button>
              <Button onClick={fetchCursorStatus} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Health Overview */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{data.health.total}</div>
                  <div className="text-sm text-muted-foreground">Total Cursors</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{data.health.active}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{data.health.completed}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{data.health.error}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{data.health.stale}</div>
                  <div className="text-sm text-muted-foreground">Stale</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues */}
      {data && data.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Issues Detected ({data.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.issues.map((issue, index) => (
              <Alert key={index} variant={getSeverityColor(issue.severity)}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">{issue.message}</div>
                  {issue.examples && issue.examples.length > 0 && (
                    <div className="mt-2 text-sm">
                      <div className="font-medium">Examples:</div>
                      <ul className="list-disc list-inside mt-1">
                        {issue.examples.slice(0, 3).map((example, idx) => (
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
          </CardContent>
        </Card>
      )}

      {/* Detailed View */}
      {data && (
        <Tabs defaultValue="cursors" className="w-full">
          <TabsList>
            <TabsTrigger value="cursors">All Cursors</TabsTrigger>
            <TabsTrigger value="active">Active Only</TabsTrigger>
            <TabsTrigger value="errors">Errors Only</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cursors">
            <Card>
              <CardHeader>
                <CardTitle>All Cursors ({data.cursors.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Last Fetched</TableHead>
                      <TableHead>Cursor Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.cursors.map((cursor) => (
                      <TableRow key={cursor.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(cursor.status)}
                            <Badge variant={cursor.status === 'active' ? 'default' : 'secondary'}>
                              {cursor.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{cursor.user_email || cursor.user_id}</TableCell>
                        <TableCell>{cursor.brand_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cursor.api_source}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(cursor.last_fetched_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {cursor.cursor_data ? JSON.stringify(cursor.cursor_data).substring(0, 50) + '...' : 'None'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Cursors ({data.cursors.filter(c => c.status === 'active').length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Last Fetched</TableHead>
                      <TableHead>Cursor Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.cursors.filter(c => c.status === 'active').map((cursor) => (
                      <TableRow key={cursor.id}>
                        <TableCell>{cursor.user_email || cursor.user_id}</TableCell>
                        <TableCell>{cursor.brand_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cursor.api_source}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(cursor.last_fetched_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {cursor.cursor_data ? JSON.stringify(cursor.cursor_data).substring(0, 50) + '...' : 'None'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Error Cursors ({data.cursors.filter(c => c.status === 'error').length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Error Message</TableHead>
                      <TableHead>Last Fetched</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.cursors.filter(c => c.status === 'error').map((cursor) => (
                      <TableRow key={cursor.id}>
                        <TableCell>{cursor.user_email || cursor.user_id}</TableCell>
                        <TableCell>{cursor.brand_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cursor.api_source}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={cursor.error_message}>
                            {cursor.error_message || 'No error message'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(cursor.last_fetched_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Last Updated */}
      {data && (
        <div className="text-sm text-muted-foreground text-center">
          Last updated: {new Date(data.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}






