import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createApiUrl, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  TestTube, 
  Bug, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity,
  Database,
  Cpu,
  Network,
  ArrowLeft,
  Play,
  StopCircle,
  FileText,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/use-user-role';
import { AdminLayout } from '@/components/ui/admin-layout';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
}

interface DebugInfo {
  endpoint: string;
  description: string;
  method: 'GET' | 'POST';
  parameters?: { [key: string]: any };
}

export default function AdminTestDebugTools() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursorTestParams, setCursorTestParams] = useState({
    userId: '291db40f-ff62-4667-9c32-d5f802f7bfd0',
    keywordId: '02d81c19-0665-4f38-b5ab-aa07d3d111c9',
    testSource: 'youtube'
  });

  // Access control
  if (roleLoading) {
    return (
      <AdminLayout
        title="Test & Debug Tools"
        description="Loading..."
      >
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout
        title="Test & Debug Tools"
        description="Access denied"
      >
        <div className="text-center py-12">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You need admin privileges to access the Test & Debug Tools.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Available test and debug tools
  const testTools = [
    {
      id: 'test-api-usage',
      name: 'Test API Usage Generator',
      description: 'Generate test API usage data for monitoring dashboards',
      endpoint: '/api/admin/test-api-usage',
      method: 'GET' as const,
      category: 'testing',
      icon: Activity,
      rateLimited: true,
      cooldown: 60
    },
    {
      id: 'test-api-tracking',
      name: 'Test API Tracking',
      description: 'Test API calls and verify they are being tracked correctly',
      endpoint: '/api/admin/test-api-tracking',
      method: 'GET' as const,
      category: 'testing',
      icon: Network,
      rateLimited: false
    },
    {
      id: 'test-cursor-continuity',
      name: 'Test Cursor Continuity',
      description: 'Test API cursor pagination and continuity across fetches',
      endpoint: '/api/admin/test-cursor-continuity',
      method: 'POST' as const,
      category: 'testing',
      icon: Database,
      rateLimited: false,
      requiresParams: true
    }
  ];

  const debugTools = [
    {
      id: 'queue-status',
      name: 'Queue Status Debug',
      description: 'View detailed queue status and health metrics',
      endpoint: '/api/admin/queue-status',
      method: 'GET' as const,
      category: 'debugging',
      icon: Activity
    },
    {
      id: 'system-health',
      name: 'System Health Check',
      description: 'Comprehensive system health and performance metrics',
      endpoint: '/api/admin/system-health',
      method: 'GET' as const,
      category: 'debugging',
      icon: Cpu
    },
    {
      id: 'cursor-status',
      name: 'Cursor Status Debug',
      description: 'Detailed cursor status and health information',
      endpoint: '/api/admin/cursor-status',
      method: 'GET' as const,
      category: 'debugging',
      icon: Database
    },
    {
      id: 'cursor-health-check',
      name: 'Cursor Health Check',
      description: 'Run comprehensive cursor health analysis and cleanup',
      endpoint: '/api/admin/cursor-health-check',
      method: 'GET' as const,
      category: 'debugging',
      icon: CheckCircle
    }
  ];

  const runTest = async (tool: any) => {
    const testId = `${tool.id}-${Date.now()}`;
    const newTest: TestResult = {
      id: testId,
      name: tool.name,
      status: 'running',
      startTime: new Date()
    };

    setTestResults(prev => [newTest, ...prev]);
    setLoading(true);

    try {
      let url = createApiUrl(tool.endpoint);
      
      let options: RequestInit = {
        method: tool.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      // Add parameters for POST requests
      if (tool.method === 'POST' && tool.requiresParams) {
        options.body = JSON.stringify(cursorTestParams);
      }

      // Use apiFetch for admin endpoints that require authentication
      const response = tool.endpoint.startsWith('/api/admin/') 
        ? await apiFetch(tool.endpoint.replace('/api', ''), options)
        : await fetch(url, options);
      const result = await response.json();

      const endTime = new Date();
      const duration = endTime.getTime() - newTest.startTime!.getTime();

      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? {
              ...test,
              status: response.ok ? 'success' : 'error',
              endTime,
              duration,
              result: response.ok ? result : null,
              error: response.ok ? null : result.error || `HTTP ${response.status}`
            }
          : test
      ));

      if (response.ok) {
        toast.success(`${tool.name} completed successfully`);
      } else {
        toast.error(`${tool.name} failed: ${result.error || 'Unknown error'}`);
      }

    } catch (error: any) {
      const endTime = new Date();
      const duration = endTime.getTime() - newTest.startTime!.getTime();

      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? {
              ...test,
              status: 'error',
              endTime,
              duration,
              error: error.message
            }
          : test
      ));

      toast.error(`${tool.name} failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Play className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <AdminLayout
      title="Test & Debug Tools"
      description="Comprehensive testing and debugging tools for system troubleshooting"
    >
        <Tabs defaultValue="testing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="testing">Testing Tools</TabsTrigger>
            <TabsTrigger value="debugging">Debug Tools</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
          </TabsList>

          {/* Testing Tools Tab */}
          <TabsContent value="testing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Card key={tool.id} className="relative">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5" />
                        {tool.name}
                        {tool.rateLimited && (
                          <Badge variant="outline" className="text-xs">
                            Rate Limited
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Method:</strong> {tool.method}</div>
                          <div><strong>Endpoint:</strong> {tool.endpoint}</div>
                          {tool.rateLimited && (
                            <div><strong>Cooldown:</strong> {tool.cooldown}s</div>
                          )}
                        </div>
                        
                        {tool.requiresParams && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Test Parameters:</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor={`${tool.id}-userId`} className="text-xs">User ID</Label>
                                <Input
                                  id={`${tool.id}-userId`}
                                  value={cursorTestParams.userId}
                                  onChange={(e) => setCursorTestParams(prev => ({ ...prev, userId: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`${tool.id}-keywordId`} className="text-xs">Keyword ID</Label>
                                <Input
                                  id={`${tool.id}-keywordId`}
                                  value={cursorTestParams.keywordId}
                                  onChange={(e) => setCursorTestParams(prev => ({ ...prev, keywordId: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`${tool.id}-testSource`} className="text-xs">Test Source</Label>
                              <Select
                                value={cursorTestParams.testSource}
                                onValueChange={(value) => setCursorTestParams(prev => ({ ...prev, testSource: value }))}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="youtube">YouTube</SelectItem>
                                <SelectItem value="reddit">Reddit</SelectItem>
                                <SelectItem value="x">X (Twitter)</SelectItem>
                              </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <Button 
                          onClick={() => runTest(tool)}
                          disabled={loading}
                          className="w-full"
                          size="sm"
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          {loading ? 'Running...' : 'Run Test'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Debug Tools Tab */}
          <TabsContent value="debugging" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {debugTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Card key={tool.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5" />
                        {tool.name}
                      </CardTitle>
                      <CardDescription>
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Method:</strong> {tool.method}</div>
                          <div><strong>Endpoint:</strong> {tool.endpoint}</div>
                        </div>
                        
                        <Button 
                          onClick={() => runTest(tool)}
                          disabled={loading}
                          className="w-full"
                          size="sm"
                          variant="outline"
                        >
                          <Bug className="h-4 w-4 mr-2" />
                          {loading ? 'Running...' : 'Debug'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Test Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Test Results History
                  <Badge variant="outline">
                    {testResults.length} tests
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Recent test and debug tool execution results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tests run yet. Use the Testing Tools or Debug Tools tabs to run tests.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testResults.map((result) => (
                      <div key={result.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <span className="font-medium">{result.name}</span>
                            <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                              {result.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {result.startTime && result.endTime && (
                              <span>{formatDuration(result.duration || 0)}</span>
                            )}
                          </div>
                        </div>
                        
                        {result.error && (
                          <Alert variant="destructive" className="mb-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {result.error}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {result.result && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Result:</Label>
                            <Textarea
                              value={JSON.stringify(result.result, null, 2)}
                              readOnly
                              className="min-h-[100px] text-xs font-mono"
                            />
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground mt-2">
                          Started: {result.startTime?.toLocaleString()}
                          {result.endTime && (
                            <> • Ended: {result.endTime.toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </AdminLayout>
  );
}
