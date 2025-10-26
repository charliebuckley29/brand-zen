import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Users, 
  BarChart3, 
  Settings, 
  Zap,
  ArrowLeft,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface AdminSidebarProps {
  currentPath?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentPath }) => {
  const handleBackToApp = () => {
    window.location.href = '/';
  };

  const adminMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/admin',
      icon: BarChart3,
      description: 'System overview and metrics'
    },
    {
      id: 'users',
      label: 'User Management',
      href: '/admin/users',
      icon: Users,
      description: 'Manage users, roles, and permissions'
    },
    {
      id: 'monitoring',
      label: 'System Monitoring',
      href: '/admin/monitoring',
      icon: Activity,
      description: 'Queue status, API health, and alerts'
    },
    {
      id: 'configuration',
      label: 'Configuration',
      href: '/admin/configuration',
      icon: Settings,
      description: 'System settings and preferences'
    },
    {
      id: 'tools',
      label: 'Admin Tools',
      href: '/admin/tools',
      icon: Zap,
      description: 'Debug tools and utilities'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return currentPath === '/admin' || currentPath === '/admin/';
    }
    return currentPath?.startsWith(href);
  };

  return (
    <div className="w-64 bg-background border-r h-full flex flex-col">
      {/* Header with Return to App Button */}
      <div className="p-4 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackToApp}
          className="w-full flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Main App</span>
        </Button>
      </div>

      {/* Admin Panel Title */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Admin Panel</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          System administration and monitoring
        </p>
      </div>

      {/* Admin Menu Items */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-2">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Button
                key={item.id}
                variant={active ? "default" : "ghost"}
                className={`w-full justify-start h-auto p-3 ${
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => window.location.href = item.href}
              >
                <div className="flex items-start space-x-3 w-full">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-xs mt-1 ${
                      active ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Footer with System Status */}
      <div className="p-4 border-t">
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">System Status</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Healthy
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
