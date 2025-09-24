import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Clock, 
  Zap, 
  BarChart3, 
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useQueueMonitoring } from '../../hooks/useQueueMonitoring';

export function QueueMonitoring() {
  const {
    queueData,
    loading: queueLoading,
    error: queueError,
    lastRefresh,
    refreshQueueStatus,
    resetAllQueues,
    resetQueueByApiSource,
    getQueueStatusColor,
    getQueueStatusText,
    formatTimeAgo,
    getApiSourceDisplayName,
    getApiSourceIcon
  } = useQueueMonitoring({ autoRefresh: true, refreshInterval: 30000 });

  return (
    <div className="space-y-6">
      {/* Queue Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Queue Status Overview
          </CardTitle>
          <CardDescription>
            Real-time queue monitoring and management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                onClick={refreshQueueStatus} 
                disabled={queueLoading}
                variant="outline"
                size="sm"
              >
                {queueLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button 
                onClick={resetAllQueues}
                variant="destructive"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reset All Failed
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {lastRefresh ? formatTimeAgo(lastRefresh.toISOString()) : 'Never'}
            </div>
          </div>

          {queueError && (
            <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Queue Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{queueError}</p>
            </div>
          )}

          {queueData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {queueData.summary.byStatus.pending}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {queueData.summary.byStatus.processing}
                </div>
                <div className="text-sm text-muted-foreground">Processing</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {queueData.summary.byStatus.completed}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {queueData.summary.byStatus.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue by API Source */}
      {queueData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Queue by API Source
            </CardTitle>
            <CardDescription>
              Breakdown of queue entries by API source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(queueData.summary.byApiSource).map(([apiSource, stats]) => (
                <div key={apiSource} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getApiSourceIcon(apiSource)}</span>
                    <div>
                      <div className="font-medium">{getApiSourceDisplayName(apiSource)}</div>
                      <div className="text-sm text-muted-foreground">
                        Total: {stats.total} | Avg Priority: {stats.averagePriority.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <Badge variant="outline" className="text-xs">
                          {stats.pending} pending
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {stats.processing} processing
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {stats.completed} completed
                        </Badge>
                        {stats.failed > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {stats.failed} failed
                          </Badge>
                        )}
                      </div>
                    </div>
                    {stats.failed > 0 && (
                      <Button
                        onClick={() => resetQueueByApiSource(apiSource)}
                        variant="destructive"
                        size="sm"
                      >
                        Reset Failed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Queue Entries */}
      {queueData && queueData.entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Queue Entries</CardTitle>
            <CardDescription>
              Latest queue activity and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queueData.entries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${getQueueStatusColor(entry.status)}`} />
                    <div>
                      <div className="text-sm font-medium">
                        {getApiSourceDisplayName(entry.api_source)} - User {entry.user_id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Priority: {entry.priority_score} | Queued: {formatTimeAgo(entry.queued_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">
                      {getQueueStatusText(entry.status)}
                    </Badge>
                    {entry.last_served_at && (
                      <span className="text-xs text-muted-foreground">
                        Served: {formatTimeAgo(entry.last_served_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
}

