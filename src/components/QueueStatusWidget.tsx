import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createApiUrl } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, CheckCircle, AlertCircle, RefreshCw, Youtube, MessageSquare, Twitter, Rss } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface QueueStatus {
  userId: string;
  queueStatus: 'not_queued' | 'pending' | 'processing' | 'completed';
  position?: number;
  totalInQueue?: number;
  estimatedWaitMinutes?: number;
  sources: {
    youtube: { status: 'pending' | 'processing' | 'completed' | 'not_queued', position?: number };
    reddit: { status: 'pending' | 'processing' | 'completed' | 'not_queued', position?: number };
    x: { status: 'pending' | 'processing' | 'completed' | 'not_queued', position?: number };
    google_alert: { status: 'pending' | 'processing' | 'completed' | 'not_queued', position?: number };
  };
  lastCompleted?: string;
  nextScheduled?: string;
}

interface QueueStatusWidgetProps {
  userId: string;
}

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'youtube': return Youtube;
    case 'reddit': return MessageSquare;
    case 'x': return Twitter;
    case 'google_alert': return Rss;
    default: return Clock;
  };
};

const getSourceDisplayName = (source: string) => {
  switch (source) {
    case 'youtube': return 'YouTube';
    case 'reddit': return 'Reddit';
    case 'x': return 'X (Twitter)';
    case 'google_alert': return 'Google Alerts';
    default: return source;
  };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50 border-green-200';
    case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'not_queued': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'processing': return RefreshCw;
    case 'pending': return Clock;
    case 'not_queued': return AlertCircle;
    default: return AlertCircle;
  };
};

export function QueueStatusWidget({ userId }: QueueStatusWidgetProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(createApiUrl(`/user/queue-status?userId=${userId}`));
      if (!response.ok) {
        throw new Error('Failed to fetch queue status');
      }

      const data = await response.json();
      setQueueStatus(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching queue status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading queue status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 mb-2">Failed to load queue status</p>
            <Button variant="outline" size="sm" onClick={fetchQueueStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!queueStatus) {
    return null;
  }

  const { queueStatus: status, position, totalInQueue, estimatedWaitMinutes, sources, lastCompleted, nextScheduled } = queueStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Your Queue Status
          </div>
          <Button variant="outline" size="sm" onClick={fetchQueueStatus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(() => {
              const StatusIcon = getStatusIcon(status);
              return <StatusIcon className="h-5 w-5" />;
            })()}
            <span className="font-medium">
              {status === 'not_queued' && 'Not in queue'}
              {status === 'pending' && `Position #${position} of ${totalInQueue}`}
              {status === 'processing' && 'Currently processing'}
              {status === 'completed' && 'Recently completed'}
            </span>
          </div>
          <Badge variant={status === 'completed' ? 'default' : status === 'processing' ? 'secondary' : 'outline'}>
            {status === 'not_queued' && 'Not Queued'}
            {status === 'pending' && 'Pending'}
            {status === 'processing' && 'Processing'}
            {status === 'completed' && 'Completed'}
          </Badge>
        </div>

        {/* Wait Time */}
        {status === 'pending' && estimatedWaitMinutes && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Estimated wait: ~{estimatedWaitMinutes} minute{estimatedWaitMinutes !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Source Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Sources being checked:</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(sources).map(([source, sourceStatus]) => {
              const SourceIcon = getSourceIcon(source);
              const StatusIcon = getStatusIcon(sourceStatus.status);
              
              return (
                <div key={source} className={`p-2 rounded-lg border ${getStatusColor(sourceStatus.status)}`}>
                  <div className="flex items-center gap-2">
                    <SourceIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">{getSourceDisplayName(source)}</span>
                    <StatusIcon className="h-3 w-3 ml-auto" />
                  </div>
                  {sourceStatus.position && (
                    <div className="text-xs mt-1 opacity-75">
                      Position #{sourceStatus.position}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Last Completed / Next Scheduled */}
        {(lastCompleted || nextScheduled) && (
          <div className="pt-2 border-t space-y-1">
            {lastCompleted && (
              <div className="text-xs text-muted-foreground">
                Last completed: {formatDistanceToNow(new Date(lastCompleted), { addSuffix: true })}
              </div>
            )}
            {nextScheduled && (
              <div className="text-xs text-muted-foreground">
                Next scheduled: {formatDistanceToNow(new Date(nextScheduled), { addSuffix: true })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

