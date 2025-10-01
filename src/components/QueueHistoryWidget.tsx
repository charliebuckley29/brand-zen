import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, CheckCircle, AlertCircle, RefreshCw, Youtube, MessageSquare, Twitter, Rss, TrendingUp, BarChart3, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface QueueHistoryEntry {
  id: string;
  fetchCycleId: string;
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

interface Mention {
  id: string;
  source_name: string;
  source_url: string;
  content_snippet: string;
  full_text: string;
  published_at: string;
  sentiment: number | null;
  topics: string[];
  flagged: boolean;
  created_at: string;
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
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [mentionsData, setMentionsData] = useState<Record<string, { loading: boolean; mentions: Mention[]; error?: string }>>({});

  const fetchQueueHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`https://mentions-backend.vercel.app/api/api/user/queue-history?userId=${userId}&limit=${limit}`);
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

  const fetchMentions = async (fetchCycleId: string, sourceType: string) => {
    const key = `${fetchCycleId}-${sourceType}`;
    
    // Set loading state
    setMentionsData(prev => ({
      ...prev,
      [key]: { loading: true, mentions: [] }
    }));

    try {
      const response = await fetch(`https://mentions-backend.vercel.app/api/api/user/fetch-mentions?userId=${userId}&fetchCycleId=${fetchCycleId}&sourceType=${sourceType}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch mentions');
      }

      const data = await response.json();
      
      setMentionsData(prev => ({
        ...prev,
        [key]: { loading: false, mentions: data.mentions || [] }
      }));
    } catch (err: any) {
      setMentionsData(prev => ({
        ...prev,
        [key]: { loading: false, mentions: [], error: 'Queue undergoing maintenance - please try again shortly' }
      }));
    }
  };

  const toggleSourceExpansion = (fetchCycleId: string, sourceType: string) => {
    const key = `${fetchCycleId}-${sourceType}`;
    const newExpanded = new Set(expandedSources);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
      // Fetch mentions if not already loaded
      if (!mentionsData[key]) {
        fetchMentions(fetchCycleId, sourceType);
      }
    }
    
    setExpandedSources(newExpanded);
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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Your Queue History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No queue history yet</p>
            <p className="text-sm">Your automated monitoring will create history here</p>
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
          <div className="space-y-3">
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
                  <div className="space-y-2">
                    {Object.entries(entry.sources).map(([source, sourceData]) => {
                      if (sourceData.status === 'not_attempted') return null;
                      
                      const SourceIcon = getSourceIcon(source);
                      const sourceStatusColor = sourceData.status === 'completed' 
                        ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
                      
                      const key = `${entry.fetchCycleId}-${source}`;
                      const isExpanded = expandedSources.has(key);
                      const mentions = mentionsData[key];
                      
                      return (
                        <div key={source} className={`rounded border ${sourceStatusColor}`}>
                          <button
                            onClick={() => toggleSourceExpansion(entry.fetchCycleId, source)}
                            className="w-full p-3 text-left hover:bg-opacity-80 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <SourceIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">{getSourceDisplayName(source)}</span>
                                <span className="text-xs opacity-75">
                                  {sourceData.mentions} mention{sourceData.mentions !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {sourceData.status === 'completed' && sourceData.mentions > 0 && (
                                  <span className="text-xs opacity-75">Click to view</span>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </button>
                          
                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="border-t border-current border-opacity-20 p-3">
                              {mentions?.loading ? (
                                <div className="flex items-center justify-center py-4">
                                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                  <span className="text-sm">Loading mentions...</span>
                                </div>
                              ) : mentions?.error ? (
                                <div className="text-sm text-red-600 dark:text-red-400">
                                  Error loading mentions: {mentions.error}
                                </div>
                              ) : mentions?.mentions && mentions.mentions.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium mb-2">
                                    {mentions.mentions.length} mention{mentions.mentions.length !== 1 ? 's' : ''} found:
                                  </div>
                                  {mentions.mentions.map((mention) => (
                                    <div key={mention.id} className="p-2 bg-background/50 rounded border text-xs">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <div className="font-medium text-foreground mb-1">
                                            {mention.source_name}
                                          </div>
                                          <div className="text-muted-foreground mb-2">
                                            {mention.content_snippet || mention.full_text}
                                          </div>
                                          <div className="text-muted-foreground">
                                            {formatDistanceToNow(new Date(mention.published_at), { addSuffix: true })}
                                          </div>
                                        </div>
                                        {mention.source_url && (
                                          <a
                                            href={mention.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No mentions found for this source.
                                </div>
                              )}
                            </div>
                          )}
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

