import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { createApiUrl } from '@/lib/api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Activity, 
  RefreshCw, 
  Clock, 
  Zap, 
  BarChart3, 
  CheckCircle,
  Loader2,
  ExternalLink,
  Calendar,
  User,
  Tag,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface SentimentData {
  success: boolean;
  queueStatus: {
    pendingAnalysis: number;
    emptyMentions: number;
    totalPending: number;
    recentAnalyzed: number;
    totalAnalyzed: number;
    sentimentDistribution: {
      positive?: number;
      negative?: number;
      neutral?: number;
      unknown?: number;
    };
  };
  pendingMentions: Array<{
    id: string;
    user_id: string;
    source_type: string;
    source_name: string;
    source_url: string;
    created_at: string;
    content_snippet: string;
    full_text: string | null;
    cleaned_text: string | null;
    published_at: string;
    model_used: string | null;
    summary: string | null;
    topics: string[] | null;
    flagged: boolean;
    escalation_type: string | null;
  }>;
  emptyMentions: Array<{
    id: string;
    user_id: string;
    source_type: string;
    source_name: string;
    source_url: string;
    created_at: string;
    content_snippet: string;
    full_text: string | null;
    cleaned_text: string | null;
    published_at: string;
    model_used: string | null;
    summary: string | null;
    topics: string[] | null;
    flagged: boolean;
    escalation_type: string | null;
  }>;
  recentAnalyzed: Array<{
    id: string;
    user_id: string;
    source_type: string;
    source_name: string;
    source_url: string;
    sentiment: number | null;
    created_at: string;
    updated_at: string;
    model_used: string;
    content_snippet: string;
    full_text: string | null;
    cleaned_text: string | null;
    summary: string | null;
    topics: string[] | null;
    flagged: boolean;
    escalation_type: string | null;
    published_at: string;
  }>;
  timestamp: string;
}

export function SentimentWorkerMonitoring() {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [expandedPending, setExpandedPending] = useState<Set<string>>(new Set());
  const [expandedAnalyzed, setExpandedAnalyzed] = useState<Set<string>>(new Set());

  const toggleExpandedPending = (id: string) => {
    const newExpanded = new Set(expandedPending);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPending(newExpanded);
  };

  const toggleExpandedAnalyzed = (id: string) => {
    const newExpanded = new Set(expandedAnalyzed);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAnalyzed(newExpanded);
  };

  const getSentimentColor = (sentiment: number | null) => {
    if (sentiment === null) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (sentiment === -1) return 'bg-muted text-muted-foreground';
    if (sentiment === 50) return 'bg-warning/10 text-warning border-warning/20';
    if (sentiment <= 49) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (sentiment >= 51) return 'bg-success/10 text-success border-success/20';
    return 'bg-muted';
  };

  const getSentimentLabel = (sentiment: number | null) => {
    if (sentiment === null) return 'Pending';
    if (sentiment === -1) return 'Unknown';
    if (sentiment === 50) return 'Neutral';
    if (sentiment <= 49) return 'Negative';
    if (sentiment >= 51) return 'Positive';
    return 'Unknown';
  };

  const getSentimentEmoji = (sentiment: number | null) => {
    if (sentiment === null) return '⏳';
    if (sentiment === -1) return '❓';
    if (sentiment === 50) return '🟡';
    if (sentiment <= 49) return '🔴';
    if (sentiment >= 51) return '🟢';
    return '❓';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const fetchSentimentData = async () => {
    setSentimentLoading(true);
    try {
      const response = await fetch(createApiUrl('/debug/check-sentiment-queue'));
      if (response.ok) {
        const result = await response.json();
        setSentimentData(result);
      } else {
        console.warn('Sentiment queue endpoint not available');
        setSentimentData(null);
      }
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
      // Don't show toast for CORS or network errors, just log
      setSentimentData(null);
    } finally {
      setSentimentLoading(false);
    }
  };

  const triggerSentimentWorker = async () => {
    try {
      const response = await fetch(createApiUrl('/mentions/sentiment-worker-unified'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          batchSize: 10,
          maxConcurrent: 3,
          maxProcessingTime: 60000, // 1 minute
          skipEmpty: true,
          parallelProcessing: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          const stats = result.stats;
          const message = `Sentiment processing complete: ${stats.totalProcessed} processed, ${stats.totalSkipped} skipped, ${stats.totalErrors} errors`;
          toast.success(message);
          await fetchSentimentData();
        } else {
          toast.error('Sentiment worker failed');
        }
      } else {
        console.warn('Unified sentiment worker endpoint not available');
        toast.error('Unified sentiment worker endpoint not available');
      }
    } catch (error) {
      console.error('Error triggering sentiment worker:', error);
      toast.error('Failed to trigger sentiment worker');
    }
  };

  const resetFailedSentiment = async () => {
    try {
      const response = await fetch(createApiUrl('/admin/reset-failed-sentiment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          toast.success(`Reset ${result.resetCount} failed sentiment mentions back to pending`);
          await fetchSentimentData();
        } else {
          toast.error('Failed to reset failed sentiment mentions');
        }
      } else {
        console.warn('Reset failed sentiment endpoint not available');
        toast.error('Reset failed sentiment endpoint not available');
      }
    } catch (error) {
      console.error('Error resetting failed sentiment:', error);
      toast.error('Failed to reset failed sentiment mentions');
    }
  };

  useEffect(() => {
    fetchSentimentData();
    
    const interval = setInterval(() => {
      fetchSentimentData();
    }, 30000); // 30 seconds

    // Update timestamps every 10 seconds for real-time "time ago" display
    const timestampInterval = setInterval(() => {
      // Force re-render to update "time ago" displays
      setSentimentData(prev => prev ? { ...prev } : null);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(timestampInterval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Sentiment Worker Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sentiment Worker Status
          </CardTitle>
          <CardDescription>
            Monitor the AI sentiment analysis queue and processing status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={fetchSentimentData} 
                disabled={sentimentLoading}
                variant="outline"
                size="sm"
              >
                {sentimentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button 
                onClick={triggerSentimentWorker}
                variant="default"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Trigger Worker
              </Button>
              <Button 
                onClick={resetFailedSentiment}
                variant="destructive"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Failed
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {sentimentData ? new Date().toLocaleTimeString() : 'Never'}
            </div>
          </div>

          {sentimentData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${sentimentData.queueStatus.pendingAnalysis > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <span className="text-sm font-medium">Queue Status</span>
                <Badge variant="default">
                  {sentimentData.queueStatus.pendingAnalysis > 0 ? 'Pending' : 'Empty'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pending Analysis</span>
                <Badge variant="outline">{sentimentData.queueStatus.pendingAnalysis}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Empty Mentions</span>
                <Badge variant="outline">{sentimentData.queueStatus.emptyMentions}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Activity</span>
                <Badge variant="outline">{sentimentData.queueStatus.recentAnalyzed} mentions</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Mentions Queue */}
      {sentimentData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Mentions Queue
            </CardTitle>
            <CardDescription>
              {sentimentData.queueStatus.pendingAnalysis} mentions with content waiting for sentiment analysis
              {sentimentData.queueStatus.emptyMentions > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  • {sentimentData.queueStatus.emptyMentions} empty mentions skipped
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sentimentData.queueStatus.pendingAnalysis > 0 ? (
              <div className="space-y-3">
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {sentimentData.pendingMentions.map((mention) => {
                    const isExpanded = expandedPending.has(mention.id);
                    return (
                      <div key={mention.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-2 w-2 bg-yellow-500 rounded-full mt-2" />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {mention.source_type}
                                </Badge>
                                {mention.flagged && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Flagged
                                  </Badge>
                                )}
                                {mention.escalation_type && mention.escalation_type !== 'none' && (
                                  <Badge variant="destructive" className="text-xs">
                                    {mention.escalation_type.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm font-medium text-foreground">
                                {mention.source_name}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(mention.created_at)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {mention.user_id.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {mention.source_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(mention.source_url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandedPending(mention.id)}
                            >
                              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-foreground">
                          {truncateText(mention.content_snippet || mention.full_text || 'No content available')}
                        </div>

                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="font-medium text-muted-foreground mb-1">Full Content:</div>
                                <div className="text-foreground bg-muted/50 p-3 rounded text-xs max-h-32 overflow-y-auto">
                                  {mention.full_text || mention.content_snippet || 'No content available'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="font-medium text-muted-foreground mb-1">Published:</div>
                                  <div className="text-foreground">{formatDate(mention.published_at)}</div>
                                </div>
                                <div>
                                  <div className="font-medium text-muted-foreground mb-1">Model Used:</div>
                                  <div className="text-foreground">{mention.model_used || 'Not specified'}</div>
                                </div>
                                {mention.summary && (
                                  <div>
                                    <div className="font-medium text-muted-foreground mb-1">Summary:</div>
                                    <div className="text-foreground text-xs">{mention.summary}</div>
                                  </div>
                                )}
                                {mention.topics && mention.topics.length > 0 && (
                                  <div>
                                    <div className="font-medium text-muted-foreground mb-1">Topics:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {mention.topics.map((topic, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          <Tag className="h-3 w-3 mr-1" />
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No mentions pending sentiment analysis</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty Mentions (Skipped) */}
      {sentimentData && sentimentData.queueStatus.emptyMentions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Empty Mentions (Skipped)
            </CardTitle>
            <CardDescription>
              {sentimentData.queueStatus.emptyMentions} mentions skipped due to missing content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {sentimentData.emptyMentions.map((mention) => (
                  <div key={mention.id} className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-2 w-2 bg-orange-500 rounded-full" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {mention.source_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-orange-600">
                              No Content
                            </Badge>
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {mention.source_name}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(mention.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {mention.user_id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </div>
                      {mention.source_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(mention.source_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Analyzed Mentions */}
      {sentimentData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recently Analyzed Mentions
            </CardTitle>
            <CardDescription>
              {sentimentData.queueStatus.recentAnalyzed} mentions analyzed in the last 24 hours
              {sentimentData.recentAnalyzed.length > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  • Latest: {getTimeAgo(sentimentData.recentAnalyzed[0].updated_at)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{sentimentData.queueStatus.pendingAnalysis}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sentimentData.queueStatus.sentimentDistribution.positive || 0}</div>
                <div className="text-sm text-muted-foreground">Positive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{sentimentData.queueStatus.sentimentDistribution.negative || 0}</div>
                <div className="text-sm text-muted-foreground">Negative</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{sentimentData.queueStatus.sentimentDistribution.neutral || 0}</div>
                <div className="text-sm text-muted-foreground">Neutral</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{sentimentData.queueStatus.sentimentDistribution.unknown || 0}</div>
                <div className="text-sm text-muted-foreground">Unknown</div>
              </div>
            </div>

            {sentimentData.recentAnalyzed.length > 0 ? (
              <div className="space-y-3">
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {sentimentData.recentAnalyzed.map((mention) => {
                    const isExpanded = expandedAnalyzed.has(mention.id);
                    return (
                      <div key={mention.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`h-2 w-2 rounded-full mt-2 ${
                              mention.sentiment === null ? 'bg-yellow-500' :
                              mention.sentiment === -1 ? 'bg-gray-500' :
                              mention.sentiment >= 51 ? 'bg-green-500' :
                              mention.sentiment <= 49 ? 'bg-red-500' : 'bg-blue-500'
                            }`} />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {mention.source_type}
                                </Badge>
                                <Badge variant="outline" className={`text-xs ${getSentimentColor(mention.sentiment)}`}>
                                  {getSentimentEmoji(mention.sentiment)} {getSentimentLabel(mention.sentiment)}
                                </Badge>
                                {mention.flagged && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Flagged
                                  </Badge>
                                )}
                                {mention.escalation_type && mention.escalation_type !== 'none' && (
                                  <Badge variant="destructive" className="text-xs">
                                    {mention.escalation_type.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm font-medium text-foreground">
                                {mention.source_name}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span className="font-medium text-green-600">{getTimeAgo(mention.updated_at)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(mention.updated_at)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {mention.user_id.substring(0, 8)}...
                                </div>
                                <div className="flex items-center gap-1">
                                  <Activity className="h-3 w-3" />
                                  {mention.model_used}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {mention.source_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(mention.source_url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandedAnalyzed(mention.id)}
                            >
                              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-foreground">
                          {truncateText(mention.content_snippet || mention.full_text || 'No content available')}
                        </div>

                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="font-medium text-muted-foreground mb-1">Full Content:</div>
                                <div className="text-foreground bg-muted/50 p-3 rounded text-xs max-h-32 overflow-y-auto">
                                  {mention.full_text || mention.content_snippet || 'No content available'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="font-medium text-muted-foreground mb-1">Published:</div>
                                  <div className="text-foreground">{formatDate(mention.published_at)}</div>
                                </div>
                                <div>
                                  <div className="font-medium text-muted-foreground mb-1">Analyzed:</div>
                                  <div className="text-foreground">{formatDate(mention.updated_at)}</div>
                                  <div className="text-xs text-green-600 font-medium">{getTimeAgo(mention.updated_at)}</div>
                                </div>
                                {mention.summary && (
                                  <div>
                                    <div className="font-medium text-muted-foreground mb-1">Summary:</div>
                                    <div className="text-foreground text-xs">{mention.summary}</div>
                                  </div>
                                )}
                                {mention.topics && mention.topics.length > 0 && (
                                  <div>
                                    <div className="font-medium text-muted-foreground mb-1">Topics:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {mention.topics.map((topic, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          <Tag className="h-3 w-3 mr-1" />
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>No mentions analyzed in the last 24 hours</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


