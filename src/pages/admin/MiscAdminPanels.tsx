import { useUserRole } from "../../hooks/use-user-role";
import { AdminLayout } from "../../components/ui/admin-layout";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../../components/ui/enhanced-card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { 
  ArrowLeft,
  Activity,
  AlertTriangle,
  BarChart3,
  Zap,
  Mail,
  Settings,
  TestTube,
  Database,
  Wifi,
  Archive,
  TrendingUp,
  Shield,
  Key,
  Bug,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

export default function MiscAdminPanels() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <AdminLayout
        title="Miscellaneous Admin Panels"
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
        title="Miscellaneous Admin Panels"
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

  const miscPanels = [
    {
      id: 'api-limits',
      title: 'API Limits Panel',
      description: 'Monitor and manage API rate limits and quotas',
      icon: Key,
      color: 'bg-blue-100 text-blue-600',
      href: '/admin/api-limits',
      status: 'implemented',
      features: ['Rate Limit Monitoring', 'Quota Management', 'Usage Analytics']
    },
    {
      id: 'email-delivery',
      title: 'Email Delivery Monitoring',
      description: 'Monitor email delivery status and failures',
      icon: Mail,
      color: 'bg-green-100 text-green-600',
      href: '/admin/email-delivery',
      status: 'implemented',
      features: ['Delivery Status', 'Failure Analysis', 'Email Logs']
    },
    {
      id: 'system-alerts',
      title: 'System Alerts',
      description: 'View and manage system-wide alerts and notifications',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600',
      href: '/admin/system-alerts',
      status: 'implemented',
      features: ['Alert Management', 'Notification Rules', 'Escalation Policies']
    },
    {
      id: 'enhanced-analytics',
      title: 'Enhanced Analytics',
      description: 'Advanced analytics and performance insights',
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600',
      href: '/admin/enhanced-analytics',
      status: 'implemented',
      features: ['Performance Metrics', 'Trend Analysis', 'Predictive Insights']
    },
    {
      id: 'automated-recovery',
      title: 'Automated Recovery',
      description: 'Monitor and manage automated recovery systems',
      icon: Zap,
      color: 'bg-orange-100 text-orange-600',
      href: '/admin/automated-recovery',
      status: 'implemented',
      features: ['Recovery Status', 'Action History', 'Recovery Rules']
    },
    {
      id: 'queue-errors',
      title: 'Queue Error Monitoring',
      description: 'Monitor source queues, view errors, and reset failed queues',
      icon: Activity,
      color: 'bg-yellow-100 text-yellow-600',
      href: '/admin/queue-errors',
      status: 'implemented',
      features: ['Queue Status', 'Error Logs', 'Retry Analytics', 'Queue Reset']
    },
    {
      id: 'test-debug',
      title: 'Test & Debug Tools',
      description: 'Testing tools and debugging utilities',
      icon: TestTube,
      color: 'bg-gray-100 text-gray-600',
      href: '/admin/test-debug',
      status: 'implemented',
      features: ['Debug Tools', 'Testing Utilities', 'System Diagnostics']
    },
    {
      id: 'unified-monitoring',
      title: 'Unified Monitoring',
      description: 'Alternative unified monitoring dashboard',
      icon: BarChart3,
      color: 'bg-indigo-100 text-indigo-600',
      href: '/admin/unified-monitoring',
      status: 'implemented',
      features: ['System Overview', 'Health Metrics', 'Performance Data']
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'implemented':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'needs_backend':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Needs Backend</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <AdminLayout
      title="Miscellaneous Admin Panels"
      description="Additional admin panels and utilities not in main sections"
      actions={
        <div className="flex gap-2">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <EnhancedCard variant="outlined">
          <EnhancedCardHeader>
            <EnhancedCardTitle>Additional Admin Panels</EnhancedCardTitle>
            <EnhancedCardDescription>
              These admin panels are available but not included in the main dashboard sections. 
              They provide specialized functionality for specific system components.
            </EnhancedCardDescription>
          </EnhancedCardHeader>
        </EnhancedCard>

        {/* Panels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {miscPanels.map((panel) => (
            <EnhancedCard key={panel.id} variant="outlined" className="hover:shadow-md transition-shadow">
              <EnhancedCardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${panel.color}`}>
                    <panel.icon className="h-6 w-6" />
                  </div>
                  {getStatusBadge(panel.status)}
                </div>
                <EnhancedCardTitle className="text-lg">{panel.title}</EnhancedCardTitle>
                <EnhancedCardDescription>{panel.description}</EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Features:</h4>
                    <ul className="text-sm space-y-1">
                      {panel.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2">
                    <Link to={panel.href}>
                      <Button className="w-full" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Panel
                      </Button>
                    </Link>
                  </div>
                </div>
              </EnhancedCardContent>
            </EnhancedCard>
          ))}
        </div>

        {/* Quick Access */}
        <EnhancedCard variant="outlined">
          <EnhancedCardHeader>
            <EnhancedCardTitle>Quick Access</EnhancedCardTitle>
            <EnhancedCardDescription>
              Direct links to commonly used admin functions
            </EnhancedCardDescription>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/admin/queue-errors">
                <Button variant="outline" size="sm" className="w-full">
                  <Activity className="w-4 h-4 mr-2" />
                  Queue Errors
                </Button>
              </Link>
              <Link to="/admin/api-limits">
                <Button variant="outline" size="sm" className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  API Limits
                </Button>
              </Link>
              <Link to="/admin/email-delivery">
                <Button variant="outline" size="sm" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Status
                </Button>
              </Link>
              <Link to="/admin/test-debug">
                <Button variant="outline" size="sm" className="w-full">
                  <TestTube className="w-4 h-4 mr-2" />
                  Debug Tools
                </Button>
              </Link>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    </AdminLayout>
  );
}
