import { useState, useEffect } from 'react';
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from '../../ui/enhanced-card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  User,
  TrendingUp,
  RefreshCw,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react';
import { ErrorDisplay } from './ErrorDisplay';

interface ApiCall {
  id: string;
  api_source: string;
  user_id: string;
  mentions_found: number;
  errors: number;
  processing_time_ms: number;
  status: 'success' | 'failure' | 'no_results';
  timestamp: string;
  profiles: {
    id: string;
    email: string;
    full_name: string;
    company_name: string;
  };
}

interface ApiError {
  id: string;
  level: string;
  message: string;
  api_source: string;
  user_id: string;
  created_at: string;
  details: any;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
    company_name: string;
  };
}

interface ApiMention {
  id: string;
  source: string;
  keyword: string;
  content: string;
  url: string;
  sentiment: string;
  created_at: string;
  profiles: {
    id: string;
    email: string;
    full_name: string;
    company_name: string;
  };
}

interface LiveAnalysisData {
  timeframe: {
    hours: number;
    since: string;
    until: string;
  };
  recentCalls: ApiCall[];
  recentErrors: ApiError[];
  recentMentions: ApiMention[];
  queueStatus: any[];
  summary: {
    totalCalls: number;
    totalErrors: number;
    totalMentions: number;
    uniqueUsers: number;
    successRate: string;
  };
  sources?: {
    [key: string]: {
      calls: ApiCall[];
      errors: ApiError[];
      mentions: ApiMention[];
      queueEntries: any[];
    };
  };
}

interface LiveApiAnalysisProps {
  className?: string;
}

export function LiveApiAnalysis({ className = "" }: LiveApiAnalysisProps) {
  const [data, setData] = useState<LiveAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState(24);
  const [selectedSource, setSelectedSource] = useState<string>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/api-source-live-analysis?timeframe_hours=${timeframe}&limit=100`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch live analysis data');
      }
      
      setData(result.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch live analysis data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeframe]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failure': return 'bg-red-100 text-red-800';
      case 'no_results': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube': return '📺';
      case 'reddit': return '🔴';
      case 'x': return '🐦';
      case 'google_alert': return '🔍';
      case 'rss_news': return '📰';
      default: return '🌐';
    }
  };

  if (loading && !data) {
    return (
      <div className={`space-y-6 ${className}`}>
        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live API Analysis
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading live API analysis...</p>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Live API Analysis - Error
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    );
  }

  if (!data) return null;

  const sources = ['youtube', 'reddit', 'x', 'google_alert', 'rss_news'];
  const filteredCalls = selectedSource === 'all' 
    ? data.recentCalls 
    : data.recentCalls.filter(call => call.api_source === selectedSource);
  
  const filteredErrors = selectedSource === 'all'
    ? data.recentErrors
    : data.recentErrors.filter(error => error.api_source === selectedSource);

  const filteredMentions = selectedSource === 'all'
    ? data.recentMentions
    : data.recentMentions.filter(mention => mention.source === selectedSource);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <EnhancedCard variant="elevated">
        <EnhancedCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <EnhancedCardTitle>Live API Analysis</EnhancedCardTitle>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(parseInt(e.target.value))}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value={1}>Last Hour</option>
                <option value={6}>Last 6 Hours</option>
                <option value={24}>Last 24 Hours</option>
                <option value={72}>Last 3 Days</option>
                <option value={168}>Last Week</option>
              </select>
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </EnhancedCardHeader>
        <EnhancedCardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.summary.totalCalls}</div>
              <div className="text-sm text-muted-foreground">Total Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.summary.successRate}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{data.summary.totalMentions}</div>
              <div className="text-sm text-muted-foreground">Mentions Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.summary.totalErrors}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{data.summary.uniqueUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>

      {/* Source Filter */}
      <EnhancedCard variant="elevated">
        <EnhancedCardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSource === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedSource('all')}
              size="sm"
            >
              All Sources
            </Button>
            {sources.map(source => (
              <Button
                key={source}
                variant={selectedSource === source ? 'default' : 'outline'}
                onClick={() => setSelectedSource(source)}
                size="sm"
              >
                {getSourceIcon(source)} {source.charAt(0).toUpperCase() + source.slice(1)}
              </Button>
            ))}
          </div>
        </EnhancedCardContent>
      </EnhancedCard>

      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calls">Recent API Calls</TabsTrigger>
          <TabsTrigger value="errors">Recent Errors</TabsTrigger>
          <TabsTrigger value="mentions">Recent Mentions</TabsTrigger>
        </TabsList>

        {/* Recent API Calls */}
        <TabsContent value="calls" className="space-y-4">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent API Calls ({filteredCalls.length})
              </EnhancedCardTitle>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="space-y-4">
                {filteredCalls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No API calls found in the last {timeframe} hours
                  </div>
                ) : (
                  filteredCalls.map((call) => (
                    <div key={call.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getSourceIcon(call.api_source)}</span>
                          <span className="font-medium capitalize">{call.api_source}</span>
                          <Badge className={getStatusColor(call.status)}>
                            {call.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(call.timestamp)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{call.profiles.full_name || call.profiles.email}</span>
                          {call.profiles.company_name && (
                            <span className="text-muted-foreground">({call.profiles.company_name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{call.mentions_found} mentions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{call.processing_time_ms}ms</span>
                        </div>
                        {call.errors > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span>{call.errors} errors</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        {/* Recent Errors */}
        <TabsContent value="errors" className="space-y-4">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Errors ({filteredErrors.length})
              </EnhancedCardTitle>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="space-y-4">
                {filteredErrors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No errors found in the last {timeframe} hours
                  </div>
                ) : (
                  filteredErrors.map((error) => (
                    <div key={error.id} className="border border-red-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getSourceIcon(error.api_source)}</span>
                          <span className="font-medium capitalize">{error.api_source}</span>
                          <Badge variant="destructive">{error.level}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(error.created_at)}
                        </div>
                      </div>
                      
                      {error.profiles && (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-4 w-4" />
                          <span>{error.profiles.full_name || error.profiles.email}</span>
                          {error.profiles.company_name && (
                            <span className="text-muted-foreground">({error.profiles.company_name})</span>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <ErrorDisplay error={error.message} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        {/* Recent Mentions */}
        <TabsContent value="mentions" className="space-y-4">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Recent Mentions ({filteredMentions.length})
              </EnhancedCardTitle>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="space-y-4">
                {filteredMentions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No mentions found in the last {timeframe} hours
                  </div>
                ) : (
                  filteredMentions.map((mention) => (
                    <div key={mention.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getSourceIcon(mention.source)}</span>
                          <span className="font-medium capitalize">{mention.source}</span>
                          <Badge variant="outline">{mention.sentiment}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(mention.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-4 w-4" />
                        <span>{mention.profiles.full_name || mention.profiles.email}</span>
                        {mention.profiles.company_name && (
                          <span className="text-muted-foreground">({mention.profiles.company_name})</span>
                        )}
                        <span className="text-muted-foreground">• Keyword: {mention.keyword}</span>
                      </div>
                      
                      <div className="text-sm">
                        <p className="line-clamp-2">{mention.content}</p>
                        {mention.url && (
                          <a 
                            href={mention.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Source
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
