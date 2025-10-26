import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

interface AdminStatusBadgeProps {
  status: 'healthy' | 'warning' | 'error' | 'info' | 'active' | 'inactive' | 'pending';
  text?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({
  status,
  text,
  showIcon = true,
  size = 'md'
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="w-3 h-3" />,
          defaultText: 'Healthy'
        };
      case 'warning':
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <AlertTriangle className="w-3 h-3" />,
          defaultText: 'Warning'
        };
      case 'error':
      case 'inactive':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="w-3 h-3" />,
          defaultText: 'Error'
        };
      case 'info':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Info className="w-3 h-3" />,
          defaultText: 'Info'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Info className="w-3 h-3" />,
          defaultText: 'Unknown'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${sizeClasses[size]} flex items-center space-x-1`}
    >
      {showIcon && config.icon}
      <span>{text || config.defaultText}</span>
    </Badge>
  );
};

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'healthy' | 'warning' | 'error' | 'info';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const AdminMetricCard: React.FC<AdminMetricCardProps> = ({
  title,
  value,
  subtitle,
  status,
  trend,
  trendValue,
  icon,
  onClick
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${getStatusColor(status)}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mb-2">
            {subtitle}
          </p>
        )}
        {trend && trendValue && (
          <div className={`text-xs ${getTrendColor(trend)}`}>
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
