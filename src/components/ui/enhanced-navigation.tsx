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
      {/* Mobile Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
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
                }}
                className={cn(
                  "flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 flex-1",
                  currentView === item.id 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </Button>
            );
          })}
          
          {/* More Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 h-auto py-2 px-3"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs font-medium">More</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm">
          <div className="fixed left-0 top-0 h-full w-72 bg-card border-r shadow-lg">
            <div className="p-4 pt-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Brand Protected</h2>
                <div className="flex items-center gap-2">
                  <NotificationCenter />
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <NavButton key={item.id} item={item} className="w-full text-left justify-start h-12" />
                ))}
              </nav>
              
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
