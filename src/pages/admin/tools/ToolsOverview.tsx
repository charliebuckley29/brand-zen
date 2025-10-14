import { useUserRole } from "../../../hooks/use-user-role";
import { AdminLayout } from "../../../components/ui/admin-layout";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../../../components/ui/enhanced-card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  Wrench, 
  TestTube, 
  Bug, 
  FileText,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  Activity,
  Database,
  Terminal,
  Search,
  Download,
  Wifi,
  WifiOff
} from "lucide-react";
import { Link } from "react-router-dom";

export default function ToolsOverview() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <AdminLayout
        title="Tools & Debugging Overview"
        description="Loading tools and debugging interface..."
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
        title="Tools & Debugging Overview"
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

  const toolsSections = [
    {
      id: 'debug',
      title: 'Debug Tools',
      description: 'System debugging and troubleshooting tools',
      icon: Terminal,
      color: 'bg-blue-100 text-blue-600',
      href: '/admin/test-debug',
      status: 'implemented',
      features: ['API Testing', 'System Health Checks', 'Cursor Continuity Tests', 'Performance Monitoring']
    },
    {
      id: 'testing',
      title: 'Testing Tools',
      description: 'Automated testing and validation tools',
      icon: TestTube,
      color: 'bg-green-100 text-green-600',
      href: '/admin/tools/testing',
      status: 'implemented',
      features: ['API Usage Tests', 'Integration Tests', 'Load Testing', 'Test Data Generation']
    },
    {
      id: 'logs',
      title: 'Log Management',
      description: 'System logs, archives, and log analysis',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600',
      href: '/admin/unified-monitoring',
      status: 'implemented',
      features: ['Log Archives', 'Archive Retention', 'Log Search', 'Log Analytics']
    },
    {
      id: 'bug-reports',
      title: 'Bug Reports',
      description: 'Manage and track user bug reports',
      icon: Bug,
      color: 'bg-red-100 text-red-600',
      href: '/admin/bug-reports',
      status: 'implemented',
      features: ['Report Management', 'Assignment Tracking', 'Resolution Workflow', 'User Communication']
    },
    {
      id: 'maintenance',
      title: 'System Maintenance',
      description: 'Database cleanup and system maintenance tools',
      icon: Database,
      color: 'bg-orange-100 text-orange-600',
      href: '/admin/tools/maintenance',
      status: 'needs_backend',
      features: ['Database Cleanup', 'Cache Management', 'Queue Maintenance', 'System Optimization']
    },
    {
      id: 'analytics',
      title: 'Analytics Tools',
      description: 'Advanced analytics and reporting tools',
      icon: Activity,
      color: 'bg-indigo-100 text-indigo-600',
      href: '/admin/tools/analytics',
      status: 'needs_backend',
      features: ['Custom Reports', 'Data Export', 'Performance Analytics', 'Usage Insights']
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
      title="Tools & Debugging Overview"
      description="Testing tools, debugging utilities, and system maintenance"
      actions={
        <Link to="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      }
    >
      {/* Tools Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Tools</p>
                <p className="text-2xl font-bold">4/6</p>
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
                <p className="text-sm font-medium text-muted-foreground">Backend Required</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <WifiOff className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="outlined">
          <EnhancedCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Test Endpoints</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <TestTube className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>

      {/* Tools Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {toolsSections.map((section) => (
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

      {/* Quick Tool Access */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/admin/test-debug">
            <Button variant="outline" className="w-full justify-start">
              <Terminal className="w-4 h-4 mr-2" />
              Debug Tools
            </Button>
          </Link>
          <Link to="/admin/bug-reports">
            <Button variant="outline" className="w-full justify-start">
              <Bug className="w-4 h-4 mr-2" />
              Bug Reports
            </Button>
          </Link>
          <Link to="/admin/unified-monitoring">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Log Archives
            </Button>
          </Link>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Database className="w-4 h-4 mr-2" />
            Maintenance
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
            Current status of backend API endpoints for tools and debugging features
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-800 mb-2">✅ Implemented Endpoints</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• /admin/test-api-usage</li>
                  <li>• /admin/test-cursor-continuity</li>
                  <li>• /admin/test-api-tracking</li>
                  <li>• /admin/test-email-confirmation</li>
                  <li>• /admin/bug-reports/*</li>
                  <li>• /admin/log-archives</li>
                  <li>• /admin/archive-retention</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-red-800 mb-2">❌ Missing Endpoints</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• /admin/maintenance/database-cleanup</li>
                  <li>• /admin/maintenance/cache-management</li>
                  <li>• /admin/analytics/custom-reports</li>
                  <li>• /admin/analytics/data-export</li>
                  <li>• /admin/analytics/performance</li>
                  <li>• /admin/system-optimization</li>
                </ul>
              </div>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    </AdminLayout>
  );
}


