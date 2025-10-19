import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RealTimeIndicator } from './RealTimeIndicator';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { cn } from '@/lib/utils';

export function LiveQueueStatus() {
  const { 
    data, 
    isConnected, 
    lastUpdate, 
    connectionAttempts, 
    error, 
    reconnect,
    getQueueHealth 
  } = useRealTimeData();

  const queueStatus = data.queueStatus;
  const queueHealth = getQueueHealth();

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthBadgeVariant = (health: string) => {
    switch (health) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  if (!queueStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Queue Status
            <RealTimeIndicator 
              isConnected={isConnected} 
              isConnecting={false} 
              lastUpdate={lastUpdate}
              connectionAttempts={connectionAttempts}
              error={error}
              onReconnect={reconnect}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-muted-foreground mb-2">Loading queue status...</div>
              {!isConnected && (
                <div className="text-sm text-red-500">
                  Connection required for live updates
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = queueStatus.total || 0;
  const completed = queueStatus.completed || 0;
  const failed = queueStatus.failed || 0;
  const pending = queueStatus.pending || 0;
  const processing = queueStatus.processing || 0;

  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const failureRate = total > 0 ? (failed / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Queue Status
            <Badge variant={getHealthBadgeVariant(queueHealth)}>
              {queueHealth}
            </Badge>
          </div>
          <RealTimeIndicator 
            isConnected={isConnected} 
            isConnecting={false} 
            lastUpdate={lastUpdate}
            connectionAttempts={connectionAttempts}
            error={error}
            onReconnect={reconnect}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", pending > 0 ? "text-yellow-600" : "text-gray-600")}>
                {pending}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", processing > 0 ? "text-blue-600" : "text-gray-600")}>
                {processing}
              </div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", completed > 0 ? "text-green-600" : "text-gray-600")}>
                {completed}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", failed > 0 ? "text-red-600" : "text-gray-600")}>
                {failed}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Progress Bars */}
          {total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span>{completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
              
              {failed > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Failure Rate</span>
                    <span>{failureRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={failureRate} className="h-2" />
                </>
              )}
            </div>
          )}

          {/* Health Status */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Queue Health: <span className={cn("font-medium", getHealthColor(queueHealth))}>
                {queueHealth}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(queueStatus.lastUpdated).toLocaleTimeString()}
            </div>
          </div>

          {/* Recent Activity */}
          {queueStatus.recentActivity && queueStatus.recentActivity.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-sm font-medium mb-2">Recent Activity</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {queueStatus.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="truncate">
                      {activity.apiSource} - {activity.status}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(activity.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
