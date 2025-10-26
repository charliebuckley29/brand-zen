import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Settings, HelpCircle } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  status?: 'healthy' | 'warning' | 'error' | 'info';
  statusText?: string;
  onRefresh?: () => void;
  onBack?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  isLoading?: boolean;
  lastUpdated?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  status,
  statusText,
  onRefresh,
  onBack,
  onSettings,
  onHelp,
  isLoading = false,
  lastUpdated,
  breadcrumbs = []
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {crumb.href ? (
                      <a href={crumb.href} className="hover:text-gray-700">
                        {crumb.label}
                      </a>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 && <span>/</span>}
                  </React.Fragment>
                ))}
              </nav>
            )}

            {/* Title and Subtitle */}
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {status && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                  {statusText && (
                    <Badge variant="outline" className="text-xs">
                      {statusText}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {subtitle && (
              <p className="text-gray-600 mt-1">{subtitle}</p>
            )}

            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}

            {onSettings && (
              <Button variant="outline" size="sm" onClick={onSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            )}

            {onHelp && (
              <Button variant="outline" size="sm" onClick={onHelp}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
