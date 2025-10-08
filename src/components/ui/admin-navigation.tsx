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
  Database,
  Bug,
  MessageSquare,
  Activity,
  BarChart3,
  TestTube,
  Mail,
  AlertTriangle,
  Zap,
  Bell,
  Brain,
  Shield
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";

interface AdminNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  description?: string;
}

export function AdminNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, isModerator } = useUserRole();

  const adminNavItems: AdminNavItem[] = [
    {
      id: "dashboard",
      label: "Admin Dashboard",
      icon: Activity,
      path: "/admin",
      description: "Overview and quick access"
    },
    {
      id: "api",
      label: "API Management",
      icon: Key,
      path: "/admin/api",
      description: "Quota limits and API keys"
    },
    {
      id: "moderators",
      label: "User Management",
      icon: Users,
      path: "/admin/moderators",
      description: "Manage users and roles"
    },
    {
      id: "bug-reports",
      label: "Bug Reports",
      icon: Bug,
      path: "/admin/bug-reports",
      description: "User feedback and issues"
    },
    {
      id: "twilio",
      label: "Notifications",
      icon: MessageSquare,
      path: "/admin/twilio",
      description: "SMS and WhatsApp alerts"
    },
    {
      id: "monitoring",
      label: "System Monitoring",
      icon: BarChart3,
      path: "/admin/unified-monitoring",
      description: "System health and performance"
    },
    {
      id: "queue-errors",
      label: "Queue Monitoring",
      icon: AlertTriangle,
      path: "/admin/queue-errors",
      description: "Queue health and errors"
    },
    {
      id: "recovery",
      label: "Auto Recovery",
      icon: Zap,
      path: "/admin/automated-recovery",
      description: "Automated system recovery"
    },
    {
      id: "alerts",
      label: "System Alerts",
      icon: Bell,
      path: "/admin/system-alerts",
      description: "Real-time alerts and notifications"
    },
    {
      id: "analytics",
      label: "Enhanced Analytics",
      icon: Brain,
      path: "/admin/enhanced-analytics",
      description: "Predictive insights and benchmarking"
    },
    {
      id: "email-delivery",
      label: "Email Monitoring",
      icon: Mail,
      path: "/admin/email-delivery",
      description: "Email delivery tracking"
    },
    {
      id: "test-debug",
      label: "Test & Debug",
      icon: TestTube,
      path: "/admin/test-debug",
      description: "Testing and debugging tools"
    }
  ];

  const currentPath = location.pathname;
  const currentItem = adminNavItems.find(item => item.path === currentPath);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-72 bg-card border-r shadow-sm z-40">
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
          <nav className="space-y-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              
              return (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start h-auto py-3 px-3",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <div className="flex flex-col items-start text-left">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs opacity-70 mt-0.5">
                        {item.description}
                      </span>
                    </div>
                    {item.badge && item.badge > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
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
              {currentItem && (
                <p className="text-xs text-muted-foreground">{currentItem.label}</p>
              )}
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
          <div className="fixed left-0 top-0 h-full w-80 bg-card border-r shadow-lg">
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

              {/* Mobile Navigation - Stacked Tabs */}
              <div className="space-y-2">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  
                  return (
                    <Link key={item.id} to={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start h-auto py-3 px-3 text-left",
                          isActive && "bg-primary text-primary-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs opacity-70 mt-0.5">
                            {item.description}
                          </span>
                        </div>
                        {item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="ml-auto">
                            {item.badge > 99 ? '99+' : item.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                })}
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
