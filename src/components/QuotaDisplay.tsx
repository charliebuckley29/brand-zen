import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

export interface QuotaStatus {
  source_type: string;
  monthly_limit: number;
  current_usage: number;
  remaining_quota: number;
  usage_percentage: number;
  can_fetch: boolean;
  usage_month: string;
  api_calls_made: number;
  is_custom_limit: boolean;
}

interface QuotaDisplayProps {
  quotaData: QuotaStatus[];
  showDetails?: boolean;
  className?: string;
}

const sourceDisplayNames: Record<string, string> = {
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'X (Twitter)',
  google_alert: 'Google Alerts',
  rss_news: 'RSS News'
};

const sourceIcons: Record<string, string> = {
  youtube: '📺',
  reddit: '🔴',
  x: '🐦',
  google_alert: '🔔',
  rss_news: '📰'
};

export function QuotaDisplay({ quotaData, showDetails = false, className = '' }: QuotaDisplayProps) {
  const getStatusColor = (percentage: number, canFetch: boolean) => {
    if (!canFetch) return 'bg-red-500';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage: number, canFetch: boolean) => {
    if (!canFetch || percentage >= 90) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (percentage >= 75) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = (percentage: number, canFetch: boolean) => {
    if (!canFetch) return 'Quota Exceeded';
    if (percentage >= 90) return 'Near Limit';
    if (percentage >= 75) return 'Moderate Usage';
    return 'Good';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {quotaData.map((quota) => (
        <Card key={quota.source_type} className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{sourceIcons[quota.source_type]}</span>
                <CardTitle className="text-sm font-medium">
                  {sourceDisplayNames[quota.source_type]}
                </CardTitle>
                {quota.is_custom_limit && (
                  <Badge variant="secondary" className="text-xs">
                    Custom
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(quota.usage_percentage, quota.can_fetch)}
                <span className={`text-xs font-medium ${
                  quota.can_fetch ? 'text-gray-600' : 'text-red-600'
                }`}>
                  {getStatusText(quota.usage_percentage, quota.can_fetch)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Usage Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {quota.current_usage.toLocaleString()} / {quota.monthly_limit.toLocaleString()}
                  </span>
                  <span className="font-medium">
                    {quota.usage_percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={quota.usage_percentage} 
                  className="h-2"
                />
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Remaining:</span>
                  <div className="font-medium">
                    {quota.remaining_quota.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">API Calls:</span>
                  <div className="font-medium">
                    {quota.api_calls_made.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {showDetails && (
                <div className="pt-2 border-t text-xs text-gray-500">
                  <div>Month: {quota.usage_month}</div>
                  <div>Status: {quota.can_fetch ? 'Can fetch' : 'Quota exceeded'}</div>
                </div>
              )}

              {/* Warning Messages */}
              {quota.usage_percentage >= 90 && quota.can_fetch && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      You're approaching your monthly limit for {sourceDisplayNames[quota.source_type]}
                    </span>
                  </div>
                </div>
              )}

              {!quota.can_fetch && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">
                      You've reached your monthly limit for {sourceDisplayNames[quota.source_type]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


