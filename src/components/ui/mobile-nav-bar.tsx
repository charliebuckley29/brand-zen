import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Flag, 
  Settings as SettingsIcon,
  Plus
} from "lucide-react";

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
}

interface MobileNavBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  badgeCounts: {
    users: number;
    mentions: number;
    brands: number;
  };
  onQuickAction?: () => void;
}

export function MobileNavBar({
  currentTab,
  onTabChange,
  badgeCounts,
  onQuickAction
}: MobileNavBarProps) {
  
  const navItems: NavItem[] = [
    {
      id: "users",
      icon: Users,
      label: "Users",
      count: badgeCounts.users,
      active: currentTab === "users"
    },
    {
      id: "mentions", 
      icon: Flag,
      label: "Mentions",
      count: badgeCounts.mentions,
      active: currentTab === "mentions"
    },
    {
      id: "brands",
      icon: SettingsIcon,
      label: "Brands", 
      count: badgeCounts.brands,
      active: currentTab === "brands"
    }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 flex-1",
                item.active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.count !== undefined && item.count > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {item.count > 99 ? '99+' : item.count}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium truncate w-full text-center">
                {item.label}
              </span>
            </Button>
          );
        })}
        
        {/* Quick Action Button */}
        {onQuickAction && (
          <Button
            onClick={onQuickAction}
            size="sm"
            className="rounded-full h-12 w-12 p-0 bg-primary hover:bg-primary/90 shadow-lg"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Quick action</span>
          </Button>
        )}
      </div>
    </div>
  );
}


