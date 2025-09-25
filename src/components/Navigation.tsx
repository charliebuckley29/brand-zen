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
  Key
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useUserRole } from "@/hooks/use-user-role";
import { useNotifications } from "@/contexts/NotificationContext";
import { useNavigation } from "@/contexts/NavigationContext";

interface NavigationProps {
  // Navigation state is now managed by NavigationContext
  unreadCount?: number; // Keep as optional since we're using context
}

export function Navigation({ unreadCount: propUnreadCount = 0 }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isModerator, isAdmin } = useUserRole();
  const { currentView, setCurrentView } = useNavigation();
  
  // Get unread count directly from context as well for comparison
  const { unreadCount: contextUnreadCount } = useNotifications();
  
  // Use context unread count to ensure real-time updates
  const unreadCount = contextUnreadCount;

  // Use context unread count to ensure real-time updates

  const navItems = [
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
      label: "Help & Support",
      icon: HelpCircle,
      isExternal: true
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      icon: Shield,
      isExternal: true,
      url: '/privacy'
    },
    ...(isAdmin ? [{
      id: "admin",
      label: "Admin Panel",
      icon: Key,
      isExternal: true,
      url: '/admin'
    }] : []),
    ...(isModerator ? [{
      id: "moderator",
      label: "Moderator Panel",
      icon: Shield
    }] : [])
  ];

  const NavButton = ({ item, className = "" }: { item: typeof navItems[0], className?: string }) => {
    const handleClick = () => {
      if (item.isExternal) {
        if (item.id === 'admin') {
          window.location.href = '/admin';
        } else if (item.id === 'privacy') {
          window.location.href = '/privacy';
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
        className={cn("justify-start", className)}
      >
        <item.icon className="h-4 w-4 mr-2" />
        {item.label}
        {item.badge && (
          <Badge variant="destructive" className="ml-auto">
            {item.badge > 99 ? '99+' : item.badge}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-10 w-10 p-0 relative"
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
        
        {/* Mobile notification badge */}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
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
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-card border-r">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Brand Protected</h2>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavButton key={item.id} item={item} className="w-full" />
            ))}
          </nav>
        </div>
        
        {/* Desktop Alerts Section */}
        {unreadCount > 0 && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount} new mention{unreadCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}