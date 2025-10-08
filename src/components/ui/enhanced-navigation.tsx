import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Settings, 
  FileText, 
  Home, 
  Bell,
  Menu,
  X,
  Shield,
  HelpCircle,
  Key,
  Users,
  Flag,
  Plus
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useUserRole } from "@/hooks/use-user-role";
import { useNotifications } from "@/contexts/NotificationContext";
import { useNavigation } from "@/contexts/NavigationContext";

interface NavigationProps {
  unreadCount?: number;
}

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  isExternal?: boolean;
  url?: string;
}

export function EnhancedNavigation({ unreadCount: propUnreadCount = 0 }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isModerator, isAdmin } = useUserRole();
  const { currentView, setCurrentView } = useNavigation();
  const { unreadCount: contextUnreadCount } = useNotifications();
  
  const unreadCount = contextUnreadCount;

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings
    },
    {
      id: "help",
      label: "Help",
      icon: HelpCircle,
      isExternal: true
    },
    ...(isAdmin ? [{
      id: "admin",
      label: "Admin",
      icon: Key,
      isExternal: true,
      url: '/admin'
    }] : []),
    ...(isModerator ? [{
      id: "moderator",
      label: "Moderator",
      icon: Shield
    }] : [])
  ];

  const NavButton = ({ item, className = "" }: { item: NavItem, className?: string }) => {
    const handleClick = () => {
      if (item.isExternal) {
        if (item.id === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/help';
        }
      } else {
        setCurrentView(item.id);
        setIsMobileMenuOpen(false);
      }
    };

    return (
      <Button
        key={item.id}
        variant={currentView === item.id ? "default" : "ghost"}
        onClick={handleClick}
        className={cn("w-full justify-start", className)}
      >
        <item.icon className="h-4 w-4 mr-2" />
        {item.label}
        {item.badge && item.badge > 0 && (
          <Badge variant="destructive" className="ml-auto">
            {item.badge > 99 ? '99+' : item.badge}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-background border-b z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Brand Protected</h2>
              <p className="text-xs text-muted-foreground">Brand Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm">
          <div className="fixed left-0 top-0 h-full w-80 bg-card border-r shadow-lg">
            <div className="p-4 pt-16">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Navigation</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Navigation - Stacked Vertical Tabs */}
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      onClick={() => {
                        if (item.isExternal) {
                          if (item.id === 'admin') {
                            window.location.href = '/admin';
                          } else {
                            window.location.href = '/help';
                          }
                        } else {
                          setCurrentView(item.id);
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full justify-start h-auto py-3 px-3 text-left",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium">{item.label}</span>
                        {item.id === 'dashboard' && (
                          <span className="text-xs opacity-70 mt-0.5">Main dashboard</span>
                        )}
                        {item.id === 'analytics' && (
                          <span className="text-xs opacity-70 mt-0.5">Charts and insights</span>
                        )}
                        {item.id === 'reports' && (
                          <span className="text-xs opacity-70 mt-0.5">Generate reports</span>
                        )}
                        {item.id === 'settings' && (
                          <span className="text-xs opacity-70 mt-0.5">Account settings</span>
                        )}
                        {item.id === 'moderator' && (
                          <span className="text-xs opacity-70 mt-0.5">User management</span>
                        )}
                        {item.id === 'admin' && (
                          <span className="text-xs opacity-70 mt-0.5">System administration</span>
                        )}
                      </div>
                      {item.badge && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
              
              {/* Mobile Alerts */}
              {unreadCount > 0 && (
                <div className="mt-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <Bell className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {unreadCount > 99 ? '99+' : unreadCount} new mention{unreadCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="mt-8 pt-6 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <NotificationCenter />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-card border-r shadow-sm z-40">
        <div className="p-4 pt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold">Brand Protected</h2>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavButton key={item.id} item={item} className="w-full text-left justify-start h-12" />
            ))}
          </nav>
          
          {/* Desktop Alerts */}
          {unreadCount > 0 && (
            <div className="mt-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount} new mention{unreadCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
