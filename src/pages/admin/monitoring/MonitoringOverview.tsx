import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { AdminDataTable } from '@/components/admin/shared/AdminDataTable';
import { AdminStatsCard } from '@/components/admin/shared/AdminStatsCard';
import { AdminStatusBadge } from '@/components/admin/shared/AdminStatusBadge';
import { 
  BarChart3, 
  Server, 
  Activity, 
  AlertTriangle, 
  Zap,
  Database,
  Globe,
  TrendingUp
} from 'lucide-react';

interface SystemHealth {
  database_status: 'healthy' | 'warning' | 'error';
  api_endpoints_status: 'operational' | 'degraded' | 'down';
  automated_fetching_status: 'active' | 'paused' | 'error';
  queue_system_status: 'processing' | 'idle' | 'error';
  last_updated: string;
}

interface QueueData {
  status: string;
  totalItems: number;
  processingItems: number;
  failedItems: number;
  avgProcessingTime: number;
}

interface ApiHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime: number;
  lastCheck: string;
  errorRate: number;
}

const MonitoringOverview: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database_status: 'healthy',
    api_endpoints_status: 'operational',
    automated_fetching_status: 'active',
    queue_system_status: 'processing',
    last_updated: new Date().toLocaleString()
  });
  const [queueData, setQueueData] = useState<QueueData>({
    status: 'processing',
    totalItems: 0,
    processingItems: 0,
    failedItems: 0,
    avgProcessingTime: 0
  });
  const [apiHealth, setApiHealth] = useState<ApiHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch system health
      const healthResponse = await fetch('/api/admin/system-health');
      const healthData = await healthResponse.json();
      setSystemHealth(healthData);
      
      // Fetch queue status
      const queueResponse = await fetch('/api/admin/queue-status');
      const queueData = await queueResponse.json();
      setQueueData(queueData);
      
      // Fetch API health
      const apiResponse = await fetch('/api/admin/api-health');
      const apiData = await apiResponse.json();
      setApiHealth(apiData.apis || []);
      
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOverallStatus = () => {
    const statuses = [
      systemHealth.database_status,
      systemHealth.api_endpoints_status === 'operational' ? 'healthy' : 'warning',
      systemHealth.automated_fetching_status === 'active' ? 'healthy' : 'warning',
      systemHealth.queue_system_status === 'processing' ? 'healthy' : 'warning'
    ];
    
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  };

  const apiColumns = [
    {
      key: 'name',
      label: 'API Service',
      render: (value: string) => (
        <div className="font-medium">{value}</div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <AdminStatusBadge status={value} />
      )
    },
    {
      key: 'responseTime',
      label: 'Response Time',
      render: (value: number) => (
        <span className="text-sm">{value}ms</span>
      )
    },
    {
      key: 'errorRate',
      label: 'Error Rate',
      render: (value: number) => (
        <span className={`text-sm ${value > 5 ? 'text-red-600' : 'text-green-600'}`}>
          {value}%
        </span>
      )
    },
    {
      key: 'lastCheck',
      label: 'Last Check',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleTimeString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="System Monitoring"
        subtitle="Real-time monitoring of system health and performance"
        status={getOverallStatus()}
        statusText={getOverallStatus() === 'healthy' ? 'All Systems Operational' : 'Issues Detected'}
        onRefresh={fetchMonitoringData}
        isLoading={isLoading}
        lastUpdated={systemHealth.last_updated}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Monitoring' }
        ]}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="System Health"
          value={getOverallStatus() === 'healthy' ? 'Healthy' : 'Issues'}
          status={getOverallStatus()}
          icon={<Server className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="Queue Status"
          value={queueData.totalItems}
          subtitle={`${queueData.processingItems} processing`}
          status={queueData.status === 'processing' ? 'healthy' : 'warning'}
          icon={<Activity className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="API Health"
          value={apiHealth.filter(api => api.status === 'healthy').length}
          subtitle={`${apiHealth.length} total APIs`}
          status={apiHealth.every(api => api.status === 'healthy') ? 'healthy' : 'warning'}
          icon={<Globe className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="Database"
          value={systemHealth.database_status === 'healthy' ? 'Connected' : 'Issues'}
          status={systemHealth.database_status}
          icon={<Database className="w-5 h-5" />}
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="apis">APIs</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Database</span>
                    <AdminStatusBadge status={systemHealth.database_status} />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">API Endpoints</span>
                    <AdminStatusBadge 
                      status={systemHealth.api_endpoints_status === 'operational' ? 'healthy' : 'warning'} 
                      text={systemHealth.api_endpoints_status}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Automated Fetching</span>
                    <AdminStatusBadge 
                      status={systemHealth.automated_fetching_status === 'active' ? 'healthy' : 'warning'} 
                      text={systemHealth.automated_fetching_status}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Queue System</span>
                    <AdminStatusBadge 
                      status={systemHealth.queue_system_status === 'processing' ? 'healthy' : 'warning'} 
                      text={systemHealth.queue_system_status}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Queue Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Queue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Items</span>
                    <span className="text-lg font-bold">{queueData.totalItems}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Processing</span>
                    <span className="text-lg font-bold text-blue-600">{queueData.processingItems}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Failed</span>
                    <span className="text-lg font-bold text-red-600">{queueData.failedItems}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg Processing Time</span>
                    <span className="text-lg font-bold">{queueData.avgProcessingTime}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Core Services</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Database Connection</span>
                      <AdminStatusBadge status={systemHealth.database_status} />
                    </div>
                    <div className="flex justify-between">
                      <span>API Gateway</span>
                      <AdminStatusBadge 
                        status={systemHealth.api_endpoints_status === 'operational' ? 'healthy' : 'warning'} 
                      />
                    </div>
                    <div className="flex justify-between">
                      <span>Automated Fetching</span>
                      <AdminStatusBadge 
                        status={systemHealth.automated_fetching_status === 'active' ? 'healthy' : 'warning'} 
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Queue Processing</span>
                      <span className="text-sm">{queueData.processingItems} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Response Time</span>
                      <span className="text-sm">{queueData.avgProcessingTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error Rate</span>
                      <span className="text-sm text-red-600">
                        {queueData.totalItems > 0 ? Math.round((queueData.failedItems / queueData.totalItems) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apis" className="space-y-6">
          <AdminDataTable
            title="API Health Status"
            data={apiHealth}
            columns={apiColumns}
            isLoading={isLoading}
            onRefresh={fetchMonitoringData}
            emptyMessage="No API data available"
          />
        </TabsContent>

        <TabsContent value="queues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Queue Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{queueData.totalItems}</div>
                  <div className="text-sm text-blue-600">Total Items</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{queueData.processingItems}</div>
                  <div className="text-sm text-green-600">Processing</div>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{queueData.failedItems}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No active alerts</p>
                <p className="text-sm">System is running normally</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringOverview;