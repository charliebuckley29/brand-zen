import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft,
  Menu,
  X,
  Key,
  Users,
  Settings,
  Wrench,
  Activity,
  Shield,
  ChevronDown,
  ChevronRight,
  UserCheck,
  BarChart3,
  AlertTriangle,
  Brain,
  Zap,
  Bell,
  MessageSquare,
  Mail,
  TestTube,
  Bug,
  FileText,
  Database
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";

interface AdminNavSubItem {
  id: string;
  label: string;
  path: string;
  badge?: number;
  needsBackend?: boolean;
}

interface AdminNavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  description?: string;
  subItems?: AdminNavSubItem[];
}

export function AdminNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['users', 'monitoring', 'configuration', 'tools', 'miscellaneous']);
  const location = useLocation();
  const { isAdmin, isModerator } = useUserRole();

  const adminNavSections: AdminNavSection[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Activity,
      path: "/admin",
      description: "Admin overview"
    },
    {
      id: "users",
      label: "User Management",
      icon: Users,
      path: "/admin/users",
      description: "Users, quotas, moderators",
      subItems: [
        { id: "users-overview", label: "Overview", path: "/admin/users" },
        { id: "users-quotas", label: "Quota Management", path: "/admin/users/quotas" },
        { id: "users-moderators", label: "Moderators", path: "/admin/users/moderators" },
        { id: "users-approvals", label: "Approvals", path: "/admin/users/approvals" }
      ]
    },
    {
      id: "monitoring",
      label: "System Monitoring",
      icon: BarChart3,
      path: "/admin/monitoring",
      description: "Health, queues, analytics",
      subItems: [
        { id: "monitoring-overview", label: "Overview", path: "/admin/monitoring" },
        { id: "monitoring-system", label: "System Health", path: "/admin/monitoring/system" },
        { id: "monitoring-api", label: "API Status", path: "/admin/monitoring/api" },
        { id: "monitoring-users", label: "User Activity", path: "/admin/monitoring/users" },
        { id: "monitoring-alerts", label: "System Alerts", path: "/admin/monitoring/alerts" },
        { id: "monitoring-sentiment", label: "Sentiment Worker", path: "/admin/monitoring/sentiment" },
        { id: "monitoring-queues", label: "Queue Monitoring", path: "/admin/monitoring/queues" },
        { id: "monitoring-archives", label: "Log Archives", path: "/admin/monitoring/archives" },
        { id: "monitoring-retention", label: "Archive Retention", path: "/admin/monitoring/retention" }
      ]
    },
    {
      id: "configuration",
      label: "Configuration",
      icon: Settings,
      path: "/admin/configuration",
      description: "Settings and integrations",
      subItems: [
        { id: "config-overview", label: "Overview", path: "/admin/configuration" },
        { id: "config-cron", label: "Cron Management", path: "/admin/configuration/cron" },
        { id: "config-integrations", label: "Integrations", path: "/admin/twilio" },
        { id: "config-api", label: "API Keys", path: "/admin/api" },
        { id: "config-email", label: "Email Monitoring", path: "/admin/email-delivery" }
      ]
    },
    {
      id: "tools",
      label: "Tools & Debugging",
      icon: Wrench,
      path: "/admin/tools",
      description: "Debug, test, logs",
      subItems: [
        { id: "tools-overview", label: "Overview", path: "/admin/tools" },
        { id: "tools-debug", label: "Debug Tools", path: "/admin/test-debug" },
        { id: "tools-bugs", label: "Bug Reports", path: "/admin/bug-reports" },
        { id: "tools-websocket", label: "WebSocket Debug", path: "/admin/websocket-debug" }
      ]
    },
    {
      id: "miscellaneous",
      label: "Miscellaneous",
      icon: Database,
      path: "/admin/misc",
      description: "Additional admin panels",
      subItems: [
        { id: "misc-overview", label: "Overview", path: "/admin/misc" },
        { id: "misc-api-limits", label: "API Limits Panel", path: "/admin/api-limits" },
        { id: "misc-email-delivery", label: "Email Delivery", path: "/admin/email-delivery" },
        { id: "misc-system-alerts", label: "System Alerts", path: "/admin/system-alerts" },
        { id: "misc-enhanced-analytics", label: "Enhanced Analytics", path: "/admin/enhanced-analytics" },
        { id: "misc-automated-recovery", label: "Automated Recovery", path: "/admin/automated-recovery" },
        { id: "misc-queue-errors", label: "Queue Error Monitoring", path: "/admin/queue-errors" },
        { id: "misc-test-debug", label: "Test & Debug Tools", path: "/admin/test-debug" },
        { id: "misc-unified-monitoring", label: "Unified Monitoring", path: "/admin/unified-monitoring" }
      ]
    }
  ];

  const currentPath = location.pathname;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isPathActive = (path: string) => {
    if (path === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(path);
  };

  const renderNavItem = (section: AdminNavSection, isMobile: boolean = false) => {
    const Icon = section.icon;
    const isActive = isPathActive(section.path);
    const isExpanded = expandedSections.includes(section.id);
    const hasSubItems = section.subItems && section.subItems.length > 0;

    return (
      <div key={section.id}>
        {/* Main Section Item */}
        <div className="flex items-center gap-1">
          <Link 
            to={section.path} 
            className="flex-1"
            onClick={() => isMobile && !hasSubItems && setIsMobileMenuOpen(false)}
          >
            <Button
              variant={isActive && !hasSubItems ? "default" : "ghost"}
              className={cn(
                "w-full justify-start h-auto py-2.5 px-3",
                isActive && !hasSubItems && "bg-primary text-primary-foreground"
              )}
            >
              <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
              <div className="flex flex-col items-start text-left flex-1">
                <span className="font-medium text-sm">{section.label}</span>
                {section.description && (
                  <span className="text-xs opacity-70 mt-0.5">
                    {section.description}
                  </span>
                )}
              </div>
            </Button>
          </Link>
          
          {/* Expand/Collapse Button */}
          {hasSubItems && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-8 p-0"
              onClick={() => toggleSection(section.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Sub Items */}
        {hasSubItems && isExpanded && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-2">
            {section.subItems!.map((subItem) => {
              const isSubActive = currentPath === subItem.path;
              
              return (
                <Link 
                  key={subItem.id} 
                  to={subItem.path}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={isSubActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start h-auto py-2 px-3 text-sm",
                      isSubActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <span className="flex-1 text-left">{subItem.label}</span>
                    {subItem.needsBackend && (
                      <Badge variant="destructive" className="ml-2 text-xs px-1.5 py-0">
                        Backend
                      </Badge>
                    )}
                    {subItem.badge && subItem.badge > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {subItem.badge > 99 ? '99+' : subItem.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-72 bg-card border-r shadow-sm z-40 overflow-y-auto">
        <div className="p-4 pt-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">System Administration</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {adminNavSections.map((section) => renderNavItem(section, false))}
          </nav>

          {/* Back to Main App */}
          <div className="mt-8 pt-6 border-t">
            <Link to="/">
              <Button variant="outline" className="w-full justify-start">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Main App
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-background border-b z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">
                {adminNavSections.find(s => isPathActive(s.path))?.label || 'Dashboard'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm">
          <div className="fixed left-0 top-0 h-full w-80 bg-card border-r shadow-lg overflow-y-auto">
            <div className="p-4 pt-16">
              {/* Close Button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Admin Navigation</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Navigation */}
              <div className="space-y-1">
                {adminNavSections.map((section) => renderNavItem(section, true))}
              </div>

              {/* Back to Main App */}
              <div className="mt-8 pt-6 border-t">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Main App
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}