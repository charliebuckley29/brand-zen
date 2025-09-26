import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Activity, 
  RefreshCw, 
  Clock, 
  Zap, 
  BarChart3, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface SentimentData {
  success: boolean;
  queueStatus: {
    pendingAnalysis: number;
    recentAnalyzed: number;
    totalAnalyzed: number;
    sentimentDistribution: {
      positive?: number;
      negative?: number;
      unknown?: number;
    };
  };
  pendingMentions: Array<{
    id: string;
    user_id: string;
    source_type: string;
    created_at: string;
    content_snippet: string;
  }>;
  recentAnalyzed: Array<{
    id: string;
    user_id: string;
    source_type: string;
    sentiment: number | null;
    created_at: string;
    model_used: string;
  }>;
  timestamp: string;
}

export function SentimentWorkerMonitoring() {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  const fetchSentimentData = async () => {
    setSentimentLoading(true);
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/debug/check-sentiment-queue');
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
      const response = await fetch('https://mentions-backend.vercel.app/api/mentions/sentiment-worker-continuous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          batchSize: 10,
          maxProcessingTime: 60000, // 1 minute
          maxBatches: 5
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          toast.success(`Sentiment worker completed: ${result.stats.totalProcessed} mentions processed`);
          await fetchSentimentData();
        } else {
          toast.error('Sentiment worker failed');
        }
      } else {
        console.warn('Sentiment worker endpoint not available');
        toast.error('Sentiment worker endpoint not available');
      }
    } catch (error) {
      console.error('Error triggering sentiment worker:', error);
      toast.error('Failed to trigger sentiment worker');
    }
  };

  const resetFailedSentiment = async () => {
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/admin/reset-failed-sentiment', {
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

    return () => clearInterval(interval);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${sentimentData.queueStatus.pendingAnalysis > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <span className="text-sm font-medium">Queue Status</span>
                <Badge variant="default">
                  {sentimentData.queueStatus.pendingAnalysis > 0 ? 'Pending' : 'Empty'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pending Mentions</span>
                <Badge variant="outline">{sentimentData.queueStatus.pendingAnalysis}</Badge>
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

      {/* Queue Details */}
      {sentimentData && (
        <Card>
          <CardHeader>
            <CardTitle>Queue Details</CardTitle>
            <CardDescription>
              Current mentions waiting for sentiment analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sentimentData.queueStatus.pendingAnalysis > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-4">
                  {sentimentData.queueStatus.pendingAnalysis} mentions pending analysis
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {sentimentData.pendingMentions.slice(0, 10).map((mention) => (
                    <div key={mention.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                        <div>
                          <div className="text-sm font-medium">{mention.source_type}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(mention.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {mention.content_snippet ? 'Has Text' : 'No Text'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {sentimentData.pendingMentions.length > 10 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      ... and {sentimentData.pendingMentions.length - 10} more
                    </div>
                  )}
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

      {/* Recent Activity */}
      {sentimentData && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity (Last 24 Hours)</CardTitle>
            <CardDescription>
              Sentiment analysis activity and distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                <div className="text-2xl font-bold text-gray-600">{sentimentData.queueStatus.sentimentDistribution.unknown || 0}</div>
                <div className="text-sm text-muted-foreground">Unknown</div>
              </div>
            </div>

            {sentimentData.recentAnalyzed.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recently Processed</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {sentimentData.recentAnalyzed.slice(0, 5).map((mention) => (
                    <div key={mention.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${
                          mention.sentiment === null ? 'bg-yellow-500' :
                          mention.sentiment === 1 ? 'bg-green-500' :
                          mention.sentiment === 0 ? 'bg-red-500' :
                          mention.sentiment === -1 ? 'bg-gray-500' : 'bg-blue-500'
                        }`} />
                        <span>{mention.source_type}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(mention.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


