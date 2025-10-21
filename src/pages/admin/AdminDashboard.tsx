import { useUserRole } from "../../hooks/use-user-role";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../../components/ui/enhanced-card";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Users, Activity, Settings, Wrench, TrendingUp, BarChart3, UserCheck, Shield, AlertTriangle, Brain, Zap, Mail, TestTube, Key, Database, Wifi, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/ui/admin-layout";
import { Grid } from "../../components/ui/layout-system";
import { Badge } from "../../components/ui/badge";
import { LiveQueueStatus } from "../../components/admin/LiveQueueStatus";
import { useRealTimeData } from "../../hooks/useRealTimeData";
import { useNotifications } from "../../hooks/useNotifications";

export default function AdminDashboard() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  
  // Real-time data hooks
  const { data: realTimeData, isConnected, getQueueHealth, getSystemHealth } = useRealTimeData();
  const { getUnreadAlertsCount, getCriticalAlertsCount } = useNotifications();

  if (roleLoading) {
    return (
      <AdminLayout
        title="Admin Dashboard"
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
        title="Admin Dashboard"
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

  const mainSections = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, quotas, moderators, and approvals',
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
      href: '/admin/users',
      features: [
        'User Overview & Analytics',
        'Quota Management',
        'Moderator Management', 
        'User Approvals'
      ]
    },
    {
      id: 'monitoring',
      title: 'System Monitoring',
      description: 'Monitor system health, queues, alerts, and analytics',
      icon: Activity,
      color: 'bg-green-100 text-green-600',
      href: '/admin/monitoring',
      features: [
        'Unified Dashboard',
        'Queue Monitoring',
        'System Alerts',
        'Enhanced Analytics',
        'Automated Recovery'
      ]
    },
    {
      id: 'configuration',
      title: 'Configuration',
      description: 'System settings, integrations, and API management',
      icon: Settings,
      color: 'bg-purple-100 text-purple-600',
      href: '/admin/configuration',
      features: [
        'Integration Settings',
        'API Key Management',
        'System Configuration'
      ]
    },
    {
      id: 'tools',
      title: 'Tools & Debugging',
      description: 'Testing tools, debugging, and system maintenance',
      icon: Wrench,
      color: 'bg-orange-100 text-orange-600',
      href: '/admin/tools',
      features: [
        'Debug Tools',
        'Testing Tools',
        'Log Management',
        'Bug Reports'
      ]
    },
    {
      id: 'misc',
      title: 'Miscellaneous',
      description: 'Additional admin panels and utilities',
      icon: Settings,
      color: 'bg-gray-100 text-gray-600',
      href: '/admin/misc',
      features: [
        'API Limits Panel',
        'Email Delivery Monitoring',
        'System Alerts',
        'Enhanced Analytics',
        'Automated Recovery',
        'Queue Error Monitoring',
        'Test & Debug Tools'
      ]
    }
  ];

  const quickStats = [
    {
      title: 'Total Users',
      value: 'Loading...',
      icon: UserCheck,
      color: 'text-blue-600'
    },
    {
      title: 'System Health',
      value: getSystemHealth() || 'Loading...',
      icon: Shield,
      color: getSystemHealth() === 'healthy' ? 'text-green-600' : 
             getSystemHealth() === 'warning' ? 'text-yellow-600' : 
             getSystemHealth() === 'critical' ? 'text-red-600' : 'text-gray-600'
    },
    {
      title: 'Active Alerts',
      value: getUnreadAlertsCount().toString(),
      icon: AlertTriangle,
      color: getCriticalAlertsCount() > 0 ? 'text-red-600' : 
             getUnreadAlertsCount() > 0 ? 'text-yellow-600' : 'text-green-600'
    },
    {
      title: 'Queue Status',
      value: getQueueHealth() || 'Loading...',
      icon: Activity,
      color: getQueueHealth() === 'healthy' ? 'text-green-600' : 
             getQueueHealth() === 'warning' ? 'text-yellow-600' : 
             getQueueHealth() === 'critical' ? 'text-red-600' : 'text-gray-600'
    }
  ];

  return (
    <AdminLayout 
      title="Admin Dashboard"
      description="Centralized system administration and monitoring"
      actions={
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main App
          </Button>
        </Link>
      }
    >
      {/* Quick Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">System Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <EnhancedCard key={index} variant="outlined" className="text-center">
              <EnhancedCardContent className="pt-6">
                <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.title}</div>
              </EnhancedCardContent>
            </EnhancedCard>
          ))}
        </div>
      </div>

      {/* Real-Time Queue Status */}
      {isConnected && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Live Queue Status</h2>
          <LiveQueueStatus />
        </div>
      )}

      {/* Main Sections */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Administration Sections</h2>
        <Grid columns={2} gap="lg">
          {mainSections.map((section) => (
            <Link key={section.id} to={section.href}>
              <EnhancedCard variant="interactive" hover="lift" className="h-full">
                <EnhancedCardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${section.color} rounded-lg flex items-center justify-center`}>
                      <section.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <EnhancedCardTitle size="lg">{section.title}</EnhancedCardTitle>
                      <EnhancedCardDescription>
                        {section.description}
                      </EnhancedCardDescription>
                    </div>
                  </div>
                </EnhancedCardHeader>
                <EnhancedCardContent>
                  <div className="space-y-2">
                    {section.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </EnhancedCardContent>
              </EnhancedCard>
            </Link>
          ))}
        </Grid>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/admin/monitoring/system">
            <Button variant="outline" className="w-full justify-start">
              <Shield className="w-4 h-4 mr-2" />
              System Health
            </Button>
          </Link>
          <Link to="/admin/monitoring/api">
            <Button variant="outline" className="w-full justify-start">
              <Wifi className="w-4 h-4 mr-2" />
              API Status
            </Button>
          </Link>
          <Link to="/admin/monitoring/alerts">
            <Button variant="outline" className="w-full justify-start">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alerts
            </Button>
          </Link>
          <Link to="/admin/users/quotas">
            <Button variant="outline" className="w-full justify-start">
              <Key className="w-4 h-4 mr-2" />
              User Quotas
            </Button>
          </Link>
          <Link to="/admin/monitoring/queues">
            <Button variant="outline" className="w-full justify-start">
              <BarChart3 className="w-4 h-4 mr-2" />
              Queue Status
            </Button>
          </Link>
          <Link to="/admin/monitoring/sentiment">
            <Button variant="outline" className="w-full justify-start">
              <Brain className="w-4 h-4 mr-2" />
              Sentiment
            </Button>
          </Link>
          <Link to="/admin/configuration/email">
            <Button variant="outline" className="w-full justify-start">
              <Mail className="w-4 h-4 mr-2" />
              Email Config
            </Button>
          </Link>
          <Link to="/admin/tools/debug">
            <Button variant="outline" className="w-full justify-start">
              <TestTube className="w-4 h-4 mr-2" />
              Debug Tools
            </Button>
          </Link>
          <Link to="/admin/configuration/cron">
            <Button variant="outline" className="w-full justify-start">
              <Clock className="w-4 h-4 mr-2" />
              Cron Control
            </Button>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}


