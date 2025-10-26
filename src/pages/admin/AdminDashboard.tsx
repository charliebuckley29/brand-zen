import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { AdminStatsCard } from '@/components/admin/shared/AdminStatsCard';
import { AdminStatusBadge } from '@/components/admin/shared/AdminStatusBadge';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  BarChart3,
  Server,
  Zap
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  queueStatus: 'processing' | 'idle' | 'error';
  apiStatus: 'operational' | 'degraded' | 'down';
  sentimentProcessing: 'active' | 'paused' | 'error';
  alertsCount: number;
  lastUpdated: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    systemHealth: 'healthy',
    queueStatus: 'processing',
    apiStatus: 'operational',
    sentimentProcessing: 'active',
    alertsCount: 0,
    lastUpdated: new Date().toLocaleString()
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch system health
      const healthResponse = await fetch('/api/admin/system-health');
      const healthData = await healthResponse.json();
      
      // Fetch user stats
      const usersResponse = await fetch('/api/admin/users');
      const usersData = await usersResponse.json();
      
      // Fetch queue status
      const queueResponse = await fetch('/api/admin/queue-status');
      const queueData = await queueResponse.json();
      
      // Fetch alerts
      const alertsResponse = await fetch('/api/admin/alerts/active');
      const alertsData = await alertsResponse.json();

      setStats({
        totalUsers: usersData.total || 0,
        activeUsers: usersData.active || 0,
        systemHealth: healthData.database_status === 'healthy' ? 'healthy' : 'warning',
        queueStatus: queueData.status || 'processing',
        apiStatus: healthData.api_endpoints_status === 'operational' ? 'operational' : 'degraded',
        sentimentProcessing: healthData.automated_fetching_status === 'active' ? 'active' : 'paused',
        alertsCount: alertsData.length || 0,
        lastUpdated: new Date().toLocaleString()
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats(prev => ({ ...prev, systemHealth: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'User Management', href: '/admin/users', icon: Users },
    { label: 'System Monitoring', href: '/admin/monitoring', icon: BarChart3 },
    { label: 'Configuration', href: '/admin/configuration', icon: Settings },
    { label: 'Tools & Debug', href: '/admin/tools', icon: Zap }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Dashboard"
        subtitle="Overview of system status and key metrics"
        status={stats.systemHealth}
        statusText={stats.systemHealth === 'healthy' ? 'All Systems Operational' : 'Issues Detected'}
        onRefresh={fetchDashboardData}
        isLoading={isLoading}
        lastUpdated={stats.lastUpdated}
        breadcrumbs={[{ label: 'Admin' }]}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle={`${stats.activeUsers} active`}
          status="info"
          icon={<Users className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="System Health"
          value={stats.systemHealth === 'healthy' ? 'Healthy' : 'Issues'}
          status={stats.systemHealth}
          icon={<Server className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="Queue Status"
          value={stats.queueStatus === 'processing' ? 'Processing' : 'Idle'}
          status={stats.queueStatus === 'processing' ? 'healthy' : 'warning'}
          icon={<Activity className="w-5 h-5" />}
        />
        
        <AdminStatsCard
          title="Active Alerts"
          value={stats.alertsCount}
          status={stats.alertsCount > 0 ? 'warning' : 'healthy'}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Database</span>
              <AdminStatusBadge status={stats.systemHealth} />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">API Endpoints</span>
              <AdminStatusBadge 
                status={stats.apiStatus === 'operational' ? 'healthy' : 'warning'} 
                text={stats.apiStatus}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Sentiment Processing</span>
              <AdminStatusBadge 
                status={stats.sentimentProcessing === 'active' ? 'healthy' : 'warning'} 
                text={stats.sentimentProcessing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => window.location.href = action.href}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">System health check completed</span>
              </div>
              <span className="text-xs text-gray-500">2 minutes ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Queue processing 15 items</span>
              </div>
              <span className="text-xs text-gray-500">5 minutes ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm">New user registered</span>
              </div>
              <span className="text-xs text-gray-500">10 minutes ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;