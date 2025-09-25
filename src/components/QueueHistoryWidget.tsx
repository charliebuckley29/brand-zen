import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, CheckCircle, AlertCircle, RefreshCw, Youtube, MessageSquare, Twitter, Rss, TrendingUp, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface QueueHistoryEntry {
  id: string;
  queuedAt: string;
  completedAt?: string;
  status: 'completed' | 'failed' | 'partial';
  sources: {
    youtube: { status: 'completed' | 'failed' | 'not_attempted', mentions: number };
    reddit: { status: 'completed' | 'failed' | 'not_attempted', mentions: number };
    x: { status: 'completed' | 'failed' | 'not_attempted', mentions: number };
    google_alert: { status: 'completed' | 'failed' | 'not_attempted', mentions: number };
  };
  totalMentions: number;
  duration?: string;
}

interface QueueHistoryResponse {
  queueEntries: QueueHistoryEntry[];
  totalEntries: number;
  summary: {
    totalMentions: number;
    successfulFetches: number;
    failedFetches: number;
    averageMentionsPerFetch: number;
  };
}

interface QueueHistoryWidgetProps {
  userId: string;
  limit?: number;
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
    case 'completed': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
    case 'failed': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
    case 'partial': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
    default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'failed': return AlertCircle;
    case 'partial': return AlertCircle;
    default: return AlertCircle;
  };
};

export function QueueHistoryWidget({ userId, limit = 5 }: QueueHistoryWidgetProps) {
  const [history, setHistory] = useState<QueueHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`https://mentions-backend.vercel.app/api/user/queue-history?userId=${userId}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch queue history');
      }

      const data = await response.json();
      console.log('Queue history data received:', data);
      setHistory(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching queue history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueHistory();
  }, [userId, limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Your Queue History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading queue history...
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
            Your Queue History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 mb-2">Failed to load queue history</p>
            <Button variant="outline" size="sm" onClick={fetchQueueHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.queueEntries.length === 0) {
    // Show sample data for testing scrollable functionality
    const sampleHistory = {
      queueEntries: [
        {
          id: 'sample-1',
          queuedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
          status: 'completed' as const,
          sources: {
            youtube: { status: 'completed' as const, mentions: 3 },
            reddit: { status: 'completed' as const, mentions: 2 },
            x: { status: 'not_attempted' as const, mentions: 0 },
            google_alert: { status: 'completed' as const, mentions: 1 }
          },
          totalMentions: 6,
          duration: '45s'
        },
        {
          id: 'sample-2',
          queuedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
          status: 'partial' as const,
          sources: {
            youtube: { status: 'completed' as const, mentions: 1 },
            reddit: { status: 'failed' as const, mentions: 0 },
            x: { status: 'completed' as const, mentions: 4 },
            google_alert: { status: 'not_attempted' as const, mentions: 0 }
          },
          totalMentions: 5,
          duration: '32s'
        },
        {
          id: 'sample-3',
          queuedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
          status: 'completed' as const,
          sources: {
            youtube: { status: 'completed' as const, mentions: 2 },
            reddit: { status: 'completed' as const, mentions: 3 },
            x: { status: 'completed' as const, mentions: 1 },
            google_alert: { status: 'completed' as const, mentions: 2 }
          },
          totalMentions: 8,
          duration: '58s'
        }
      ],
      totalEntries: 3,
      summary: {
        totalMentions: 19,
        successfulFetches: 2,
        failedFetches: 0,
        averageMentionsPerFetch: 6
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Your Queue History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{sampleHistory.summary.totalMentions}</div>
              <div className="text-sm text-green-700 dark:text-green-300">Total mentions</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sampleHistory.summary.successfulFetches}</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Successful fetches</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{sampleHistory.summary.failedFetches}</div>
              <div className="text-sm text-red-700 dark:text-red-300">Failed fetches</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{sampleHistory.summary.averageMentionsPerFetch}</div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Avg per fetch</div>
            </div>
          </div>

          {/* Sample Queue Entries */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Sample Queue History (for testing scrollable functionality)</h4>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {sampleHistory.queueEntries.map((entry) => (
                <div key={entry.id} className={`p-4 rounded-lg border ${getStatusColor(entry.status)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const StatusIcon = getStatusIcon(entry.status);
                        return <StatusIcon className="h-5 w-5" />;
                      })()}
                      <div>
                        <div className="font-medium">
                          {entry.status === 'completed' && 'Completed successfully'}
                          {entry.status === 'failed' && 'Failed to complete'}
                          {entry.status === 'partial' && 'Partially completed'}
                        </div>
                        <div className="text-sm opacity-75">
                          {formatDistanceToNow(new Date(entry.queuedAt), { addSuffix: true })}
                          {entry.duration && ` • ${entry.duration} duration`}
                        </div>
                      </div>
                    </div>
                    <Badge variant={entry.status === 'completed' ? 'default' : entry.status === 'partial' ? 'secondary' : 'destructive'}>
                      {entry.totalMentions} mention{entry.totalMentions !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Source Results */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(entry.sources).map(([source, sourceData]) => {
                      if (sourceData.status === 'not_attempted') return null;
                      
                      const SourceIcon = getSourceIcon(source);
                      const sourceStatusColor = sourceData.status === 'completed' 
                        ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
                      
                      return (
                        <div key={source} className={`p-2 rounded border ${sourceStatusColor}`}>
                          <div className="flex items-center gap-2">
                            <SourceIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{getSourceDisplayName(source)}</span>
                          </div>
                          <div className="text-xs mt-1">
                            {sourceData.mentions} mention{sourceData.mentions !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">This is sample data for testing. Real queue history will appear here once you have automated monitoring activity.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { queueEntries, summary } = history;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Your Queue History
          </div>
          <Button variant="outline" size="sm" onClick={fetchQueueHistory}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.totalMentions}</div>
            <div className="text-sm text-green-700 dark:text-green-300">Total mentions</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.successfulFetches}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Successful fetches</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.failedFetches}</div>
            <div className="text-sm text-red-700 dark:text-red-300">Failed fetches</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.averageMentionsPerFetch}</div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Avg per fetch</div>
          </div>
        </div>

        {/* Queue Entries */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Full Queue History</h4>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {queueEntries.map((entry) => (
            <div key={entry.id} className={`p-4 rounded-lg border ${getStatusColor(entry.status)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {(() => {
                    const StatusIcon = getStatusIcon(entry.status);
                    return <StatusIcon className="h-5 w-5" />;
                  })()}
                  <div>
                    <div className="font-medium">
                      {entry.status === 'completed' && 'Completed successfully'}
                      {entry.status === 'failed' && 'Failed to complete'}
                      {entry.status === 'partial' && 'Partially completed'}
                    </div>
                    <div className="text-sm opacity-75">
                      {formatDistanceToNow(new Date(entry.queuedAt), { addSuffix: true })}
                      {entry.duration && ` • ${entry.duration} duration`}
                    </div>
                  </div>
                </div>
                <Badge variant={entry.status === 'completed' ? 'default' : entry.status === 'partial' ? 'secondary' : 'destructive'}>
                  {entry.totalMentions} mention{entry.totalMentions !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Source Results */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(entry.sources).map(([source, sourceData]) => {
                  if (sourceData.status === 'not_attempted') return null;
                  
                  const SourceIcon = getSourceIcon(source);
                  const sourceStatusColor = sourceData.status === 'completed' 
                    ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
                  
                  return (
                    <div key={source} className={`p-2 rounded border ${sourceStatusColor}`}>
                      <div className="flex items-center gap-2">
                        <SourceIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{getSourceDisplayName(source)}</span>
                      </div>
                      <div className="text-xs mt-1">
                        {sourceData.mentions} mention{sourceData.mentions !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

