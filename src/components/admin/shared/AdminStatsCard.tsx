import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'healthy' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AdminStatsCard: React.FC<AdminStatsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  status,
  icon,
  className = '',
  onClick
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'warning': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'error': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'info': return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
      default: return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'neutral': return <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
      default: return null;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up': return 'text-green-600 dark:text-green-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      case 'neutral': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${getStatusColor(status)} ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-gray-400 dark:text-gray-500">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {subtitle}
          </p>
        )}
        {trend && trendValue && (
          <div className={`flex items-center space-x-1 text-xs ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
