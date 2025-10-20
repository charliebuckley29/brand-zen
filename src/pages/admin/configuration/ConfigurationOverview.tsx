import { useUserRole } from "../../../hooks/use-user-role";
import { AdminLayout } from "../../../components/ui/admin-layout";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../../../components/ui/enhanced-card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  Settings, 
  Key, 
  Mail, 
  Database,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  MessageSquare,
  Zap,
  Shield,
  Globe,
  Wifi,
  WifiOff
} from "lucide-react";
import { Link } from "react-router-dom";

export default function ConfigurationOverview() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <AdminLayout
        title="Configuration Overview"
        description="Loading configuration settings..."
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
        title="Configuration Overview"
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

  const configurationSections = [
    {
      id: 'integrations',
      title: 'Integration Settings',
      description: 'Configure external service integrations',
      icon: Globe,
      color: 'bg-blue-100 text-blue-600',
      href: '/admin/configuration/integrations',
      status: 'implemented',
      features: ['Twilio SMS/WhatsApp', 'SendGrid Email', 'API Keys Management', 'Webhook Configuration']
    },
    {
      id: 'api-keys',
      title: 'API Key Management',
      description: 'Manage API keys for external data sources',
      icon: Key,
      color: 'bg-green-100 text-green-600',
      href: '/admin/api',
      status: 'implemented',
      features: ['API Key Configuration', 'Source Status Monitoring', 'Usage Tracking', 'Key Rotation']
    },
    {
      id: 'email',
      title: 'Email Configuration',
      description: 'Email delivery monitoring and settings',
      icon: Mail,
      color: 'bg-purple-100 text-purple-600',
      href: '/admin/email-delivery',
      status: 'implemented',
      features: ['Delivery Monitoring', 'Template Management', 'Retry Logic', 'Webhook Processing']
    },
    {
      id: 'cron',
      title: 'Cron Management',
      description: 'Control and monitor automated cron job execution',
      icon: Clock,
      color: 'bg-indigo-100 text-indigo-600',
      href: '/admin/configuration/cron',
      status: 'implemented',
      features: ['Runtime Control', 'Execution History', 'Status Monitoring', 'Emergency Stop']
    },
    {
      id: 'system',
      title: 'System Configuration',
      description: 'Global system settings and maintenance',
      icon: Settings,
      color: 'bg-orange-100 text-orange-600',
      href: '/admin/configuration/system',
      status: 'needs_backend',
      features: ['Global Settings', 'Maintenance Mode', 'Feature Flags', 'System Limits']
    },
    {
      id: 'security',
      title: 'Security Settings',
      description: 'Security policies and access control',
      icon: Shield,
      color: 'bg-red-100 text-red-600',
      href: '/admin/configuration/security',
      status: 'needs_backend',
      features: ['Access Policies', 'Rate Limiting', 'Audit Logs', 'Security Monitoring']
    },
    {
      id: 'database',
      title: 'Database Management',
      description: 'Database maintenance and analytics',
      icon: Database,
      color: 'bg-gray-100 text-gray-600',
      href: '/admin/configuration/database',
      status: 'needs_backend',
      features: ['Database Stats', 'Cleanup Tools', 'Performance Monitoring', 'Backup Management']
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'implemented':
        return <Badge variant="default" className="bg-green-100 text-green-800">Implemented</Badge>;
      case 'needs_backend':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Needs Backend</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'needs_backend':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <AdminLayout
      title="Configuration Overview"
      description="System configuration, integrations, and settings management"
      actions={
        <Link to="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      }
    >
      {/* Configuration Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Configured Services</p>
                <p className="text-2xl font-bold">3/6</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Setup</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Backend Required</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <WifiOff className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {configurationSections.map((section) => (
          <Link key={section.id} to={section.href}>
            <EnhancedCard variant="interactive" hover="lift" className="h-full">
              <EnhancedCardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${section.color} rounded-lg flex items-center justify-center`}>
                      <section.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <EnhancedCardTitle size="lg">{section.title}</EnhancedCardTitle>
                      <EnhancedCardDescription>
                        {section.description}
                      </EnhancedCardDescription>
                    </div>
                  </div>
                  {getStatusBadge(section.status)}
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
                {section.status === 'needs_backend' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 text-sm font-medium">
                      <WifiOff className="h-4 w-4" />
                      Backend Implementation Required
                    </div>
                    <p className="text-red-700 text-xs mt-1">
                      Frontend UI is ready but backend API endpoints need to be implemented
                    </p>
                  </div>
                )}
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>
        ))}
      </div>

      {/* Quick Configuration Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/admin/api">
            <Button variant="outline" className="w-full justify-start">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </Button>
          </Link>
          <Link to="/admin/email-delivery">
            <Button variant="outline" className="w-full justify-start">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </Link>
          <Link to="/admin/twilio">
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              Twilio
            </Button>
          </Link>
          <Link to="/admin/configuration/cron">
            <Button variant="outline" className="w-full justify-start">
              <Clock className="w-4 h-4 mr-2" />
              Cron Jobs
            </Button>
          </Link>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Settings className="w-4 h-4 mr-2" />
            System Settings
          </Button>
        </div>
      </div>

      {/* Backend Implementation Status */}
      <EnhancedCard>
        <EnhancedCardHeader>
          <EnhancedCardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Backend Implementation Status
          </EnhancedCardTitle>
          <EnhancedCardDescription>
            Current status of backend API endpoints for configuration features
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-800 mb-2">✅ Implemented Endpoints</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• /admin/api-keys (Twilio, SendGrid)</li>
                  <li>• /admin/twilio-settings</li>
                  <li>• /admin/email-delivery-stats</li>
                  <li>• /admin/webhooks/sendgrid</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-red-800 mb-2">❌ Missing Endpoints</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• /admin/system-settings</li>
                  <li>• /admin/security-policies</li>
                  <li>• /admin/feature-flags</li>
                  <li>• /admin/database-stats</li>
                  <li>• /admin/maintenance-mode</li>
                  <li>• /admin/audit-logs</li>
                </ul>
              </div>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    </AdminLayout>
  );
}


