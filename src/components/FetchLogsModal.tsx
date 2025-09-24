import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Activity, Trash2, RefreshCw, AlertTriangle, Users, Database, Search, Bug } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useToast } from "@/hooks/use-toast";

interface FetchLog {
  id: string;
  fetch_type: string;
  started_at: string;
  completed_at: string | null;
  successful_keywords: number;
  failed_keywords: number;
  successful_fetches: number;
  log: string;
  results_summary?: {
    totalFetched: number;
    totalInserted: number;
    totalDuplicates: number;
    sourceBreakdown: {
      google_alerts: number;
      youtube: number;
      reddit: number;
      instagram: number;
      x: number;
    };
    sourceAttempts: {
      [key: string]: {
        attempted: boolean;
        succeeded: boolean;
        failed: boolean;
        skipped: boolean;
        quotaExceeded?: boolean;
        reason: string;
      };
    };
    timestamp: string;
  };
  created_at: string;
}

interface DetailedFetchLog {
  fetchHistory: FetchLog[];
  automationLogs: any[];
  queueStatus: any[];
  summary: {
    totalFetches: number;
    recentLogs: number;
    queueEntries: number;
    lastFetch: string | null;
    sourcesInQueue: string[];
    recentErrors: number;
    logsByType: Array<{
      eventType: string;
      count: number;
      latest: string;
    }>;
  };
}

export function FetchLogsModal() {
  const [detailedLogs, setDetailedLogs] = useState<DetailedFetchLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);
  const { formatDateTime, formatRelativeTime } = useTimezone();
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const backendUrl = 'https://mentions-backend.vercel.app';
      const response = await fetch(`${backendUrl}/api/debug/detailed-fetch-logs`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch detailed logs: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Debug: Log the received data structure
      console.log('Received fetch logs data:', data);
      
      // Ensure the data has the expected structure - backend wraps data in 'analysis' object
      const analysis = data?.analysis || data; // Fallback to direct data if no analysis wrapper
      const normalizedData = {
        fetchHistory: analysis?.fetchHistory || [],
        automationLogs: analysis?.automationLogs || [],
        queueStatus: analysis?.queueStatus || [],
        summary: {
          totalFetches: analysis?.summary?.totalFetches || 0,
          recentLogs: analysis?.summary?.recentLogs || 0,
          queueEntries: analysis?.summary?.queueEntries || 0,
          lastFetch: analysis?.summary?.lastFetch || null,
          sourcesInQueue: analysis?.summary?.sourcesInQueue || [],
          recentErrors: analysis?.summary?.recentErrors || 0,
          logsByType: analysis?.summary?.logsByType || []
        }
      };
      
      // Debug: Log the normalized data structure
      console.log('Normalized fetch logs data:', normalizedData);
      console.log('Fetch history entries:', normalizedData.fetchHistory);
      
      setDetailedLogs(normalizedData);
    } catch (error) {
      console.error('Error fetching detailed logs:', error);
      toast({
        title: "Failed to load fetch logs",
        description: "Could not retrieve detailed fetch information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    setClearing(true);
    try {
      const { error } = await supabase
        .from('user_fetch_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      setDetailedLogs(null);
      toast({
        title: "Fetch logs cleared",
        description: "All fetch logs have been successfully removed.",
      });
    } catch (error: any) {
      console.error('Error clearing logs:', error);
      toast({
        title: "Error clearing logs",
        description: error.message || "Failed to clear fetch logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  // Helper function to get source status from logs
  const getSourceStatus = (fetchLog: FetchLog, sourceName: string) => {
    // If we have detailed results_summary, use it
    if (fetchLog.results_summary?.sourceAttempts) {
      const sourceAttempt = fetchLog.results_summary.sourceAttempts[sourceName];
      if (!sourceAttempt) return 'not_attempted';
      
      // ✅ FIX: Handle quota exceeded as a distinct status
      if (sourceAttempt.quotaExceeded) return 'quota_exceeded';
      if (sourceAttempt.succeeded) return 'success';
      if (sourceAttempt.failed) return 'failed';
      if (sourceAttempt.skipped) return 'skipped';
      return 'unknown';
    }
    
    // Fallback: Since we don't have detailed breakdown, show as attempted if fetch was successful
    if (fetchLog.completed_at && fetchLog.successful_fetches > 0) {
      return 'success';
    } else if (fetchLog.completed_at && fetchLog.failed_keywords > 0) {
      return 'failed';
    } else if (!fetchLog.completed_at) {
      return 'running';
    }
    
    return 'not_attempted';
  };

  // Helper function to get source count
  const getSourceCount = (fetchLog: FetchLog, sourceName: string) => {
    // If we have detailed results_summary, use it
    if (fetchLog.results_summary?.sourceBreakdown) {
    return fetchLog.results_summary.sourceBreakdown[sourceName] || 0;
    }
    
    // Fallback: Distribute total successful_fetches across sources
    // This is a rough estimate since we don't have exact breakdown
    if (fetchLog.successful_fetches > 0) {
      return Math.floor(fetchLog.successful_fetches / 5); // Assume 5 sources
    }
    
    return 0;
  };

  // Helper function to get source icon
  const getSourceIcon = (sourceName: string) => {
    switch (sourceName) {
      case 'google_alerts': return '🔍';
      case 'youtube': return '📺';
      case 'reddit': return '🤖';
      case 'x': return '🐦';
      case 'instagram': return '📷';
      default: return '📡';
    }
  };

  // Helper function to get user-friendly source name
  const getSourceDisplayName = (sourceName: string) => {
    switch (sourceName) {
      case 'google_alerts': return 'Google Alerts';
      case 'youtube': return 'YouTube';
      case 'reddit': return 'Reddit';
      case 'x': return 'X (Twitter)';
      default: return sourceName;
    }
  };

  // Helper function to get user-friendly status message
  const getStatusMessage = (status: string, count: number) => {
    switch (status) {
      case 'success':
        return count > 0 ? `Found ${count} new mention${count !== 1 ? 's' : ''}` : 'No new mentions found';
      case 'quota_exceeded':
        return 'Monthly limit reached - will resume next month';
      case 'failed':
        return 'Temporarily unavailable - will retry later';
      case 'skipped':
        return 'Skipped this check';
      default:
        return 'Status unknown';
    }
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'quota_exceeded': return 'text-orange-600';
      case 'failed': return 'text-red-600';
      case 'skipped': return 'text-yellow-600';
      case 'not_attempted': return 'text-gray-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Helper function to group logs by fetch cycle
  const groupLogsByFetchCycle = (logs: any[]) => {
    const cycles: any[] = [];
    let currentCycle: any = null;
    
    // Sort logs by timestamp
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    for (const log of sortedLogs) {
      if (log.event_type === 'fetch.begin') {
        // Start new cycle
        if (currentCycle) {
          // Calculate duration for previous cycle
          if (currentCycle.endTime) {
            const start = new Date(currentCycle.startTime);
            const end = new Date(currentCycle.endTime);
            currentCycle.duration = `${Math.round((end.getTime() - start.getTime()) / 1000)}s`;
          }
          cycles.push(currentCycle);
        }
        currentCycle = {
          startTime: log.created_at,
          endTime: null,
          duration: null,
          apiResults: [],
          logs: [log]
        };
      } else if (currentCycle) {
        currentCycle.logs.push(log);
        
        // Mark end of cycle
        if (log.event_type === 'fetch.complete') {
          currentCycle.endTime = log.created_at;
        }
        
        // Process API results
        if (log.event_type === 'fetch.api_final_result' && log.data) {
          const apiResult = {
            source: log.data.apiSource,
            status: log.data.quotaExceeded ? 'quota_exceeded' : (log.data.success ? 'success' : 'failed'),
            processed: log.data.processed || 0,
            error: log.data.hasError ? 'API call failed' : null,
            reason: log.data.quotaExceeded ? 'Quota exceeded - no new content available' : 
                   (log.data.skipped > 0 ? 'Skipped due to quota/rate limits' : null)
          };
          currentCycle.apiResults.push(apiResult);
        } else if (log.event_type === 'process-api.youtube.start' || 
                   log.event_type === 'process-api.reddit.start' ||
                   log.event_type === 'process-api.x.start' ||
                   log.event_type === 'process-api.google_alert.start') {
          // Track API start
          const source = log.event_type.split('.')[1];
          const existingResult = currentCycle.apiResults.find(r => r.source === source);
          if (!existingResult) {
            currentCycle.apiResults.push({
              source: source,
              status: 'running',
              processed: 0,
              error: null,
              reason: null
            });
          }
        } else if (log.event_type === 'process-api.youtube.success' ||
                   log.event_type === 'process-api.reddit.success' ||
                   log.event_type === 'process-api.x.success' ||
                   log.event_type === 'process-api.google_alert.success') {
          // Update API success
          const source = log.event_type.split('.')[1];
          const existingResult = currentCycle.apiResults.find(r => r.source === source);
          if (existingResult) {
            existingResult.status = 'success';
            existingResult.processed = log.data?.processed || 0;
          }
        } else if (log.event_type === 'process-api.youtube.error' ||
                   log.event_type === 'process-api.reddit.error' ||
                   log.event_type === 'process-api.x.error' ||
                   log.event_type === 'process-api.google_alert.error') {
          // Update API error
          const source = log.event_type.split('.')[1];
          const existingResult = currentCycle.apiResults.find(r => r.source === source);
          if (existingResult) {
            existingResult.status = 'failed';
            existingResult.error = log.message || 'Unknown error';
          }
        } else if (log.event_type === 'process-api.youtube.quota_exceeded' ||
                   log.event_type === 'process-api.reddit.quota_exceeded' ||
                   log.event_type === 'process-api.x.quota_exceeded' ||
                   log.event_type === 'process-api.google_alert.quota_exceeded') {
          // Update API quota exceeded
          const source = log.event_type.split('.')[1];
          const existingResult = currentCycle.apiResults.find(r => r.source === source);
          if (existingResult) {
            existingResult.status = 'quota_exceeded';
            existingResult.reason = 'Quota exceeded - no new content available';
          }
        }
      }
    }
    
    // Add the last cycle
    if (currentCycle) {
      // Calculate duration for last cycle
      if (currentCycle.endTime) {
        const start = new Date(currentCycle.startTime);
        const end = new Date(currentCycle.endTime);
        currentCycle.duration = `${Math.round((end.getTime() - start.getTime()) / 1000)}s`;
      }
      cycles.push(currentCycle);
    }
    
    return cycles.reverse(); // Most recent first
  };


  const toggleLogExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getFetchDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'In progress...';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    return `${Math.round(durationMs / 1000)}s`;
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          View Fetch Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Monitoring Activity
            </div>
            {detailedLogs?.fetchHistory && detailedLogs.fetchHistory.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={clearing}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {clearing ? "Clearing..." : "Clear All"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Fetch Logs?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all fetch logs from the system.
                      <br /><br />
                      <strong>{detailedLogs?.fetchHistory?.length || 0} log entries</strong> will be removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={clearLogs}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Clear All Logs
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="sr-only">
          View your brand monitoring activity and detailed technical logs for debugging.
        </DialogDescription>
        
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-6 w-6 animate-spin mr-2" />
              Loading monitoring activity...
            </div>
          ) : !detailedLogs || (!detailedLogs.fetchHistory?.length && !detailedLogs.automationLogs?.length) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No monitoring activity yet</p>
              <p className="text-sm">Your automated monitoring will show activity here</p>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="debug" className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Technical Details
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="flex-1 overflow-y-auto space-y-4 mt-4">
                {/* User-Friendly Overview */}
                {(() => {
                  const recentCycles = detailedLogs.automationLogs ? groupLogsByFetchCycle(detailedLogs.automationLogs).slice(0, 5) : [];
                  const totalMentions = recentCycles.reduce((sum, cycle) => 
                    sum + cycle.apiResults.reduce((cycleSum, result) => cycleSum + (result.processed || 0), 0), 0
                  );
                  const quotaExceededCount = recentCycles.reduce((count, cycle) => 
                    count + cycle.apiResults.filter(r => r.status === 'quota_exceeded').length, 0
                  );
                  
                  return (
                    <div className="space-y-6">
                      {/* Summary Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Monitoring Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">{totalMentions}</div>
                              <div className="text-sm text-green-700">New mentions found</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">{recentCycles.length}</div>
                              <div className="text-sm text-blue-700">Recent checks</div>
                            </div>
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">{quotaExceededCount}</div>
                              <div className="text-sm text-orange-700">Sources at limit</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Recent Activity */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Recent Activity
                        </h3>
                        <div className="space-y-4">
                          {recentCycles.map((cycle, cycleIndex) => (
                            <Card key={cycleIndex} className="border-l-4 border-l-green-500">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <div>
                                      <div className="font-semibold">
                                        {new Date(cycle.startTime).toLocaleDateString()} at {new Date(cycle.startTime).toLocaleTimeString()}
                                      </div>
                                      <p className="text-sm text-muted-foreground font-normal">
                                        {formatDistanceToNow(new Date(cycle.startTime), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    Completed
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              
                              <CardContent className="pt-0">
                                {/* Source Results */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                                  {cycle.apiResults.map((apiResult, apiIndex) => (
                                    <div key={apiIndex} className={`p-3 rounded-lg border ${
                                      apiResult.status === 'success' ? 'bg-green-50 border-green-200' :
                                      apiResult.status === 'quota_exceeded' ? 'bg-orange-50 border-orange-200' :
                                      apiResult.status === 'failed' ? 'bg-red-50 border-red-200' :
                                      'bg-gray-50 border-gray-200'
                                    }`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{getSourceIcon(apiResult.source)}</span>
                                        <span className="text-sm font-medium">
                                          {getSourceDisplayName(apiResult.source)}
                                        </span>
                                      </div>
                                      <div className={`text-sm ${getStatusColor(apiResult.status)}`}>
                                        {getStatusMessage(apiResult.status, apiResult.processed || 0)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Summary */}
                                <div className="p-3 bg-muted/30 rounded-lg">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">
                                      Total: {cycle.apiResults.reduce((sum, r) => sum + (r.processed || 0), 0)} mentions found
                                    </span>
                                    <span className="text-muted-foreground">
                                      {cycle.duration || 'N/A'} duration
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Quota Information */}
                      {quotaExceededCount > 0 && (
                        <Card className="border-orange-200 bg-orange-50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-800">
                              <AlertTriangle className="h-5 w-5" />
                              Monthly Limits
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm text-orange-700 space-y-2">
                              <p><strong>{quotaExceededCount} source{quotaExceededCount !== 1 ? 's' : ''}</strong> have reached their monthly limit.</p>
                              <p>✅ <strong>Good news:</strong> Your monitoring is working correctly! Other sources continue to work normally.</p>
                              <p>🔄 <strong>What happens next:</strong> Limits reset monthly, or you can upgrade your plan for higher limits.</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
              
              <TabsContent value="debug" className="flex-1 overflow-y-auto space-y-4 mt-4">
                {/* Technical Debug Information */}
                <div className="space-y-6">
              {/* System Health Summary */}
              {detailedLogs.summary && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
                    <Activity className="h-5 w-5" />
                    System Health Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-blue-800">Total Fetches</div>
                      <div className="text-2xl font-bold text-blue-600">{detailedLogs.summary.totalFetches}</div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-800">Recent Logs</div>
                      <div className="text-2xl font-bold text-blue-600">{detailedLogs.summary.recentLogs}</div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-800">Queue Entries</div>
                      <div className="text-2xl font-bold text-blue-600">{detailedLogs.summary.queueEntries}</div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-800">Recent Errors</div>
                      <div className={`text-2xl font-bold ${detailedLogs.summary.recentErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {detailedLogs.summary.recentErrors}
                      </div>
                    </div>
                  </div>
                  {detailedLogs.summary.lastFetch && (
                    <div className="mt-3 text-xs text-blue-700">
                      Last fetch: {new Date(detailedLogs.summary.lastFetch).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Quota Insights */}
              {detailedLogs.automationLogs && detailedLogs.automationLogs.length > 0 && (() => {
                const recentCycles = groupLogsByFetchCycle(detailedLogs.automationLogs).slice(0, 3);
                const quotaExceededCount = recentCycles.reduce((count, cycle) => 
                  count + cycle.apiResults.filter(r => r.status === 'quota_exceeded').length, 0
                );
                const totalApiCalls = recentCycles.reduce((count, cycle) => 
                  count + cycle.apiResults.length, 0
                );
                
                if (quotaExceededCount > 0) {
                  return (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="h-5 w-5" />
                        Quota Usage Insights
                      </h3>
                      <div className="space-y-3">
                        <div className="text-sm text-orange-700">
                          <strong>{quotaExceededCount} out of {totalApiCalls}</strong> API calls in recent cycles hit quota limits.
                        </div>
                        <div className="text-xs text-orange-600 space-y-1">
                          <div>💡 <strong>What this means:</strong> Your automated fetching is working correctly, but some APIs have reached their monthly limits.</div>
                          <div>✅ <strong>Good news:</strong> Other APIs continue working normally - no cascade failures!</div>
                          <div>🔄 <strong>Next steps:</strong> Quotas reset monthly, or consider upgrading your plan for higher limits.</div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Fetch Cycles Section */}
              {detailedLogs.automationLogs && detailedLogs.automationLogs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Fetch Cycles
                  </h3>
                  {(() => {
                    // Group logs by fetch cycle
                    const fetchCycles = groupLogsByFetchCycle(detailedLogs.automationLogs);
                    return fetchCycles.slice(0, 5).map((cycle, cycleIndex) => (
                      <Card key={cycleIndex} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    Fetch Cycle {cycleIndex + 1}
                                  </span>
                                  <Badge variant="default">
                                    Completed
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground font-normal">
                                  {new Date(cycle.startTime).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLogExpanded(`cycle-${cycleIndex}`)}
                            >
                              {expandedLogs.has(`cycle-${cycleIndex}`) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          {/* API Results Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                            {cycle.apiResults.map((apiResult, apiIndex) => (
                              <div key={apiIndex} className={`p-3 rounded-lg border ${
                                apiResult.status === 'success' ? 'bg-green-50 border-green-200' :
                                apiResult.status === 'failed' ? 'bg-red-50 border-red-200' :
                                apiResult.status === 'quota_exceeded' ? 'bg-orange-50 border-orange-200' :
                                apiResult.status === 'skipped' ? 'bg-yellow-50 border-yellow-200' :
                                'bg-gray-50 border-gray-200'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{getSourceIcon(apiResult.source)}</span>
                                  <span className="text-sm font-medium capitalize">
                                    {apiResult.source.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="text-xs">
                                  <div className="font-semibold">
                                    {apiResult.processed || 0} mentions
                                  </div>
                                  <div className="capitalize opacity-75">
                                    {apiResult.status}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Summary Stats */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              <div>
                                <div className="text-sm font-medium">{cycle.apiResults.length} APIs</div>
                                <div className="text-xs text-muted-foreground">
                                  {cycle.apiResults.filter(r => r.status === 'success').length} successful
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-500" />
                              <div>
                                <div className="text-sm font-medium">
                                  {cycle.apiResults.reduce((sum, r) => sum + (r.processed || 0), 0)} Mentions
                                </div>
                                <div className="text-xs text-muted-foreground">Total fetched</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-purple-500" />
                              <div>
                                <div className="text-sm font-medium">
                                  {cycle.duration || 'N/A'}
                                </div>
                                <div className="text-xs text-muted-foreground">Duration</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expanded Details */}
                          {expandedLogs.has(`cycle-${cycleIndex}`) && (
                            <div className="mt-4 space-y-4">
                              {/* Quota Exceeded Details */}
                              {cycle.apiResults.some(r => r.status === 'quota_exceeded') && (
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                  <h5 className="text-sm font-medium text-orange-800 mb-2">Quota Exceeded:</h5>
                                  <div className="space-y-1">
                                    {cycle.apiResults.filter(r => r.status === 'quota_exceeded').map((result, idx) => (
                                      <div key={idx} className="text-xs text-orange-700">
                                        <span className="font-medium capitalize">{result.source.replace('_', ' ')}:</span> {result.reason || 'Monthly quota limit reached'}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 text-xs text-orange-600">
                                    💡 <strong>Note:</strong> Quota exceeded means the API worked correctly but you've reached your monthly limit. Other APIs continue working normally.
                                  </div>
                                </div>
                              )}

                              {/* Error Details */}
                              {cycle.apiResults.some(r => r.status === 'failed' || r.error) && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <h5 className="text-sm font-medium text-red-800 mb-2">Error Details:</h5>
                                  <div className="space-y-1">
                                    {cycle.apiResults.filter(r => r.status === 'failed' || r.error).map((result, idx) => (
                                      <div key={idx} className="text-xs text-red-700">
                                        <span className="font-medium capitalize">{result.source.replace('_', ' ')}:</span> {result.error || 'Unknown error'}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* No Results Analysis */}
                              {cycle.apiResults.every(r => r.processed === 0) && !cycle.apiResults.some(r => r.status === 'quota_exceeded') && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <h5 className="text-sm font-medium text-yellow-800 mb-2">No Mentions Found:</h5>
                                  <div className="text-xs text-yellow-700">
                                    All APIs completed successfully but found 0 mentions. This could be due to:
                                    <ul className="mt-1 ml-4 list-disc">
                                      <li>Search terms not matching any recent content</li>
                                      <li>Content not available in the specified time range</li>
                                      <li>API configuration issues</li>
                                      <li>All sources have reached their quota limits</li>
                                    </ul>
                                  </div>
                                </div>
                              )}
                              
                              {/* Detailed Logs */}
                              <div className="p-4 bg-muted/30 rounded-lg">
                                <details className="text-sm">
                                  <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Detailed Processing Logs
                                  </summary>
                                  <div className="mt-2 pt-2 border-t">
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {cycle.logs.map((log: any, logIndex: number) => (
                                        <div key={logIndex} className="text-xs bg-background p-2 rounded border">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-blue-600">
                                              {log.event_type}
                                            </span>
                                            <span className="text-muted-foreground">
                                              {new Date(log.created_at).toLocaleTimeString()}
                                            </span>
                                          </div>
                                          <p className="text-muted-foreground mb-1">{log.message}</p>
                                          {log.data && (
                                            <pre className="text-xs bg-muted p-1 rounded whitespace-pre-wrap">
                                              {JSON.stringify(log.data, null, 2)}
                                            </pre>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </details>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ));
                  })()}
                </div>
              )}

              {/* Fetch History Section */}
              {detailedLogs.fetchHistory && detailedLogs.fetchHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Fetch History
                  </h3>
                  <div className="space-y-4">
                    {detailedLogs.fetchHistory.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const sources = ['google_alerts', 'youtube', 'reddit', 'x'];
              
              return (
                <Card key={log.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {log.completed_at ? (
                          log.failed_keywords > 0 ? (
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )
                        ) : (
                          <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {log.fetch_type === 'manual' ? 'Manual' : 'Automated'} Fetch Cycle
                            </span>
                            <Badge variant={log.completed_at ? (log.failed_keywords > 0 ? "secondary" : "default") : "outline"}>
                              {log.completed_at ? (log.failed_keywords > 0 ? 'Partial Success' : 'Completed') : 'In Progress'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-normal">
                            {formatRelativeTime(log.started_at)} • {log.completed_at ? getFetchDuration(log.started_at, log.completed_at) : 'Running...'}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLogExpanded(log.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  
                  {/* Source Status Grid */}
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      {sources.map((source) => {
                        const status = getSourceStatus(log, source);
                        const count = getSourceCount(log, source);
                        const icon = getSourceIcon(source);
                        
                        return (
                          <div key={source} className={`p-3 rounded-lg border ${getStatusColor(status)}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{icon}</span>
                              <span className="text-sm font-medium capitalize">
                                {source.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-xs">
                              <div className="font-semibold">
                                {count > 0 ? `${count} mentions` : 'No mentions'}
                              </div>
                              <div className="capitalize opacity-75">
                                {status.replace('_', ' ')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium">{log.successful_keywords + log.failed_keywords} Keywords</div>
                          <div className="text-xs text-muted-foreground">
                            {log.successful_keywords} successful, {log.failed_keywords} failed
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium">{log.successful_fetches} Mentions</div>
                          <div className="text-xs text-muted-foreground">Total fetched</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        <div>
                          <div className="text-sm font-medium">
                            {log.completed_at ? getFetchDuration(log.started_at, log.completed_at) : 'Running...'}
                          </div>
                          <div className="text-xs text-muted-foreground">Duration</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Timing Details
                            </h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Started: {formatDateTime(log.started_at)}</div>
                              {log.completed_at && (
                                <div>Completed: {formatDateTime(log.completed_at)}</div>
                              )}
                              <div>Duration: {getFetchDuration(log.started_at, log.completed_at)}</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Processing Results
                            </h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{log.successful_keywords} keywords processed successfully</span>
                              </div>
                              {log.failed_keywords > 0 && (
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span>{log.failed_keywords} keywords failed</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span>{log.successful_fetches} mentions fetched total</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Raw Logs */}
                        {log.log && log.log.trim() !== '' && (
                          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                            <details className="text-sm">
                              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Raw Log Data
                              </summary>
                              <div className="mt-2 pt-2 border-t">
                                <pre className="text-xs bg-background p-3 rounded border whitespace-pre-wrap overflow-x-auto max-h-48">
                                  {log.log}
                                </pre>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
                  })}
                  </div>
                </div>
              )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {detailedLogs && detailedLogs.summary && (
              <>
                {detailedLogs.summary.totalFetches || 0} total fetches • 
                {(detailedLogs.summary.recentErrors || 0) > 0 && (
                  <span className="text-red-600 ml-1">{detailedLogs.summary.recentErrors} errors</span>
                )}
              </>
            )}
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}





