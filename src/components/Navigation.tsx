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
  X
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  unreadCount?: number;
}

export function Navigation({ currentView, onViewChange, unreadCount = 0 }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    }
  ];

  const NavButton = ({ item, className = "" }: { item: typeof navItems[0], className?: string }) => (
    <Button
      key={item.id}
      variant={currentView === item.id ? "default" : "ghost"}
      onClick={() => {
        onViewChange(item.id);
        setIsMobileMenuOpen(false);
      }}
      className={cn("justify-start", className)}
    >
      <item.icon className="h-4 w-4 mr-2" />
      {item.label}
      {item.badge && (
        <Badge variant="destructive" className="ml-auto">
          {item.badge}
        </Badge>
      )}
    </Button>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-0 top-0 h-full w-64 bg-card border-r p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Brand Monitor</h2>
              <ThemeToggle />
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavButton key={item.id} item={item} className="w-full" />
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-card border-r">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Brand Monitor</h2>
            <ThemeToggle />
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavButton key={item.id} item={item} className="w-full" />
            ))}
          </nav>
        </div>
        
        {/* Alerts Section */}
        {unreadCount > 0 && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {unreadCount} new mention{unreadCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}