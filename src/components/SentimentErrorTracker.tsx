import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  AlertTriangle, 
  Bug, 
  RefreshCw,
  Eye,
  RotateCcw,
  Clock,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { createApiUrl } from '@/lib/api';

interface ErrorMention {
  id: string;
  model_used: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  source_name: string;
  content_snippet: string;
  cleaned_text: string | null;
  user_id: string;
}

interface ErrorAnalysis {
  totalErrors: number;
  recentErrors: number;
  errorCategories: {
    openai_api_error: number;
    content_too_long: number;
    empty_content: number;
    parsing_error: number;
    timeout_error: number;
    unknown_error: number;
  };
  recentErrorMentions: ErrorMention[];
  errorRate: number;
}

export function SentimentErrorTracker() {
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const fetchErrorAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch(createApiUrl('/admin/sentiment-diagnostics'));
      if (response.ok) {
        const result = await response.json();
        setErrorAnalysis(result.diagnostics.errorAnalysis);
      } else {
        toast.error('Failed to fetch error analysis');
      }
    } catch (error) {
      console.error('Error fetching error analysis:', error);
      toast.error('Failed to fetch error analysis');
    } finally {
      setLoading(false);
    }
  };

  const resetSpecificError = async (mentionId: string) => {
    try {
      const response = await fetch(createApiUrl('/admin/reset-failed-sentiment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentionIds: [mentionId] })
      });
      
      if (response.ok) {
        toast.success('Error mention reset successfully');
        await fetchErrorAnalysis();
      } else {
        toast.error('Failed to reset error mention');
      }
    } catch (error) {
      console.error('Error resetting mention:', error);
      toast.error('Failed to reset error mention');
    }
  };

  const resetErrorCategory = async (category: string) => {
    try {
      // This would need to be implemented in the backend
      toast.info(`Reset ${category} errors functionality would be implemented here`);
    } catch (error) {
      console.error('Error resetting category:', error);
      toast.error('Failed to reset error category');
    }
  };

  const toggleExpanded = (mentionId: string) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(mentionId)) {
      newExpanded.delete(mentionId);
    } else {
      newExpanded.add(mentionId);
    }
    setExpandedErrors(newExpanded);
  };

  const categorizeError = (mention: ErrorMention): string => {
    const errorMsg = mention.model_used || mention.internal_notes || '';
    if (errorMsg.includes('OpenAI') || errorMsg.includes('API')) {
      return 'openai_api_error';
    } else if (errorMsg.includes('too long') || errorMsg.includes('length')) {
      return 'content_too_long';
    } else if (errorMsg.includes('empty') || errorMsg.includes('no content')) {
      return 'empty_content';
    } else if (errorMsg.includes('parse') || errorMsg.includes('JSON')) {
      return 'parsing_error';
    } else if (errorMsg.includes('timeout')) {
      return 'timeout_error';
    } else {
      return 'unknown_error';
    }
  };

  const getErrorIcon = (category: string) => {
    switch (category) {
      case 'openai_api_error': return '🤖';
      case 'content_too_long': return '📄';
      case 'empty_content': return '📭';
      case 'parsing_error': return '🔍';
      case 'timeout_error': return '⏱️';
      default: return '❓';
    }
  };

  const getErrorColor = (category: string) => {
    switch (category) {
      case 'openai_api_error': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'content_too_long': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'empty_content': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'parsing_error': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'timeout_error': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-red-100 text-red-800 border-red-200';
    }
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

  useEffect(() => {
    fetchErrorAnalysis();
  }, []);

  if (!errorAnalysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading error analysis...
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredErrors = selectedCategory === 'all' 
    ? errorAnalysis.recentErrorMentions 
    : errorAnalysis.recentErrorMentions.filter(mention => categorizeError(mention) === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Error Tracker</h2>
          <p className="text-muted-foreground">
            Detailed analysis and management of sentiment analysis errors
          </p>
        </div>
        <Button onClick={fetchErrorAnalysis} disabled={loading} variant="outline" size="sm">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Error Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{errorAnalysis.totalErrors}</div>
                <div className="text-sm text-muted-foreground">Total Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{errorAnalysis.recentErrors}</div>
                <div className="text-sm text-muted-foreground">Recent (24h)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{errorAnalysis.errorRate}%</div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{Object.keys(errorAnalysis.errorCategories).length}</div>
                <div className="text-sm text-muted-foreground">Error Types</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Error Categories</TabsTrigger>
          <TabsTrigger value="recent">Recent Errors</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Categories</CardTitle>
              <CardDescription>
                Breakdown of errors by type and category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(errorAnalysis.errorCategories).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getErrorIcon(category)}</span>
                      <div>
                        <h4 className="font-medium capitalize">{category.replace('_', ' ')}</h4>
                        <p className="text-sm text-muted-foreground">
                          {count} {count === 1 ? 'error' : 'errors'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getErrorColor(category)}>
                        {count}
                      </Badge>
                      <Button
                        onClick={() => resetErrorCategory(category)}
                        variant="outline"
                        size="sm"
                        disabled={count === 0}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Error Mentions</CardTitle>
                  <CardDescription>
                    Latest mentions that failed sentiment analysis
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">All Categories</option>
                    {Object.keys(errorAnalysis.errorCategories).map(category => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredErrors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No errors found for the selected category
                  </p>
                ) : (
                  filteredErrors.map((mention) => {
                    const category = categorizeError(mention);
                    const isExpanded = expandedErrors.has(mention.id);
                    
                    return (
                      <div key={mention.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getErrorIcon(category)}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{mention.source_name}</h4>
                                <Badge className={getErrorColor(category)}>
                                  {category.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getTimeAgo(mention.updated_at)} • ID: {mention.id}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => toggleExpanded(mention.id)}
                              variant="ghost"
                              size="sm"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <Button
                              onClick={() => resetSpecificError(mention.id)}
                              variant="outline"
                              size="sm"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reset
                            </Button>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            <div>
                              <h5 className="font-medium text-sm mb-2">Error Details</h5>
                              <div className="bg-red-50 p-3 rounded-md">
                                <p className="text-sm font-mono">
                                  {mention.model_used || mention.internal_notes || 'No error details available'}
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-sm mb-2">Content Preview</h5>
                              <div className="bg-gray-50 p-3 rounded-md">
                                <p className="text-sm">
                                  {mention.content_snippet || mention.cleaned_text || 'No content available'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Created:</span>
                                <p className="text-muted-foreground">{formatDate(mention.created_at)}</p>
                              </div>
                              <div>
                                <span className="font-medium">Last Updated:</span>
                                <p className="text-muted-foreground">{formatDate(mention.updated_at)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Management Actions</CardTitle>
              <CardDescription>
                Bulk actions for managing sentiment analysis errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => resetErrorCategory('all')}
                  variant="destructive"
                  className="h-20 flex flex-col gap-2"
                >
                  <RotateCcw className="h-6 w-6" />
                  <span>Reset All Errors</span>
                  <span className="text-xs opacity-70">Reset all {errorAnalysis.totalErrors} error mentions</span>
                </Button>
                
                <Button
                  onClick={() => resetErrorCategory('openai_api_error')}
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                >
                  <RefreshCw className="h-6 w-6" />
                  <span>Reset API Errors</span>
                  <span className="text-xs opacity-70">Reset {errorAnalysis.errorCategories.openai_api_error} OpenAI API errors</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
