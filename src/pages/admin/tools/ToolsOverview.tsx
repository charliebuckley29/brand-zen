import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { AdminDataTable } from '@/components/admin/shared/AdminDataTable';
import { AdminStatsCard } from '@/components/admin/shared/AdminStatsCard';
import { AdminStatusBadge } from '@/components/admin/shared/AdminStatusBadge';
import { 
  Wrench, 
  FileText, 
  Archive, 
  RefreshCw,
  Play,
  Square,
  Download,
  Upload,
  Terminal,
  Database,
  AlertTriangle
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  source: string;
}

interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'running' | 'completed' | 'failed';
  lastRun?: string;
}

const ToolsOverview: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([
    {
      id: '1',
      name: 'Clear Failed Queues',
      description: 'Remove all failed items from processing queues',
      status: 'available'
    },
    {
      id: '2',
      name: 'Reset User Quotas',
      description: 'Reset all user quotas to default values',
      status: 'available'
    },
    {
      id: '3',
      name: 'Archive Old Data',
      description: 'Move data older than 90 days to archive',
      status: 'available'
    },
    {
      id: '4',
      name: 'Restart Sentiment Processing',
      description: 'Restart the sentiment analysis pipeline',
      status: 'available'
    }
  ]);
  const [debugOutput, setDebugOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchToolsData();
  }, []);

  const fetchToolsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch recent logs
      const logsResponse = await fetch('/api/admin/logs/recent');
      const logsData = await logsResponse.json();
      setLogs(logsData.logs || []);
      
    } catch (error) {
      console.error('Error fetching tools data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeRecoveryAction = async (actionId: string) => {
    try {
      setRecoveryActions(prev => 
        prev.map(action => 
          action.id === actionId 
            ? { ...action, status: 'running' as const }
            : action
        )
      );

      const response = await fetch(`/api/admin/recovery/${actionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      setRecoveryActions(prev => 
        prev.map(action => 
          action.id === actionId 
            ? { 
                ...action, 
                status: result.success ? 'completed' as const : 'failed' as const,
                lastRun: new Date().toISOString()
              }
            : action
        )
      );

      // Add to debug output
      setDebugOutput(prev => 
        prev + `\n[${new Date().toLocaleTimeString()}] ${result.message}\n`
      );

    } catch (error) {
      console.error('Error executing recovery action:', error);
      setRecoveryActions(prev => 
        prev.map(action => 
          action.id === actionId 
            ? { ...action, status: 'failed' as const }
            : action
        )
      );
    }
  };

  const runSystemDiagnostics = async () => {
    try {
      setDebugOutput('Running system diagnostics...\n');
      
      const response = await fetch('/api/admin/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      setDebugOutput(prev => 
        prev + `\n[${new Date().toLocaleTimeString()}] Diagnostics completed\n` +
        `Database: ${result.database ? 'OK' : 'ERROR'}\n` +
        `APIs: ${result.apis ? 'OK' : 'ERROR'}\n` +
        `Queues: ${result.queues ? 'OK' : 'ERROR'}\n` +
        `Storage: ${result.storage ? 'OK' : 'ERROR'}\n`
      );

    } catch (error) {
      console.error('Error running diagnostics:', error);
      setDebugOutput(prev => 
        prev + `\n[${new Date().toLocaleTimeString()}] Diagnostics failed: ${error}\n`
      );
    }
  };

  const logColumns = [
    {
      key: 'timestamp',
      label: 'Time',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleTimeString()}
        </span>
      )
    },
    {
      key: 'level',
      label: 'Level',
      render: (value: string) => (
        <AdminStatusBadge 
          status={value === 'error' ? 'error' : value === 'warning' ? 'warning' : 'info'}
          text={value.toUpperCase()}
        />
      )
    },
    {
      key: 'source',
      label: 'Source',
      render: (value: string) => (
        <span className="text-sm font-mono">{value}</span>
      )
    },
    {
      key: 'message',
      label: 'Message',
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Tools"
        subtitle="Debugging, maintenance, and system recovery tools"
        onRefresh={fetchToolsData}
        isLoading={isLoading}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Tools' }
        ]}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Recent Logs"
          value={logs.length}
          subtitle="Last 24 hours"
          status="info"
          icon={<FileText className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="Recovery Actions"
          value={recoveryActions.filter(a => a.status === 'available').length}
          subtitle={`${recoveryActions.length} total actions`}
          status="info"
          icon={<RefreshCw className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="System Health"
          value="Healthy"
          status="healthy"
          icon={<Database className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="Active Alerts"
          value="0"
          status="healthy"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="debug">Debug Console</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={runSystemDiagnostics}
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Run System Diagnostics
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('logs')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Recent Logs
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('recovery')}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recovery Actions
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('debug')}
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Debug Console
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Database</span>
                  <AdminStatusBadge status="healthy" text="Connected" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">API Endpoints</span>
                  <AdminStatusBadge status="healthy" text="Operational" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Queue System</span>
                  <AdminStatusBadge status="healthy" text="Processing" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Storage</span>
                  <AdminStatusBadge status="healthy" text="Available" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5" />
                  <span>Debug Console</span>
                </span>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setDebugOutput('')}>
                    Clear
                  </Button>
                  <Button size="sm" variant="outline" onClick={runSystemDiagnostics}>
                    <Play className="w-4 h-4 mr-2" />
                    Run Diagnostics
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={debugOutput}
                onChange={(e) => setDebugOutput(e.target.value)}
                placeholder="Debug output will appear here..."
                className="min-h-[400px] font-mono text-sm"
                readOnly
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <AdminDataTable
            title="Recent Logs"
            data={logs}
            columns={logColumns}
            isLoading={isLoading}
            onRefresh={fetchToolsData}
            emptyMessage="No logs available"
          />
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5" />
                <span>Recovery Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recoveryActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{action.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                      {action.lastRun && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last run: {new Date(action.lastRun).toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <AdminStatusBadge 
                        status={
                          action.status === 'running' ? 'warning' :
                          action.status === 'completed' ? 'healthy' :
                          action.status === 'failed' ? 'error' : 'info'
                        }
                        text={action.status}
                      />
                      
                      {action.status === 'available' && (
                        <Button 
                          size="sm"
                          onClick={() => executeRecoveryAction(action.id)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Run
                        </Button>
                      )}
                      
                      {action.status === 'running' && (
                        <Button size="sm" disabled>
                          <Square className="w-4 h-4 mr-2" />
                          Running...
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ToolsOverview;