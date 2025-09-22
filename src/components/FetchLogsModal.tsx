import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Activity, Trash2, RefreshCw, AlertTriangle, Users, Database } from "lucide-react";
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
      
      // Ensure the data has the expected structure
      const normalizedData = {
        fetchHistory: data?.fetchHistory || [],
        automationLogs: data?.automationLogs || [],
        queueStatus: data?.queueStatus || [],
        summary: {
          totalFetches: data?.summary?.totalFetches || 0,
          recentLogs: data?.summary?.recentLogs || 0,
          queueEntries: data?.summary?.queueEntries || 0,
          lastFetch: data?.summary?.lastFetch || null,
          sourcesInQueue: data?.summary?.sourcesInQueue || [],
          recentErrors: data?.summary?.recentErrors || 0,
          logsByType: data?.summary?.logsByType || []
        }
      };
      
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
    if (!fetchLog.results_summary?.sourceAttempts) return 'unknown';
    
    const sourceAttempt = fetchLog.results_summary.sourceAttempts[sourceName];
    if (!sourceAttempt) return 'not_attempted';
    
    if (sourceAttempt.succeeded) return 'success';
    if (sourceAttempt.failed) return 'failed';
    if (sourceAttempt.skipped) return 'skipped';
    
    return 'unknown';
  };

  // Helper function to get source count
  const getSourceCount = (fetchLog: FetchLog, sourceName: string) => {
    if (!fetchLog.results_summary?.sourceBreakdown) return 0;
    return fetchLog.results_summary.sourceBreakdown[sourceName] || 0;
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

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'skipped': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'not_attempted': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
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
              <Database className="h-5 w-5" />
              Detailed Fetch Logs
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
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-6 w-6 animate-spin mr-2" />
              Loading detailed logs...
            </div>
          ) : !detailedLogs || !detailedLogs.fetchHistory || detailedLogs.fetchHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No fetch logs found</p>
              <p className="text-sm">Automated fetching will create logs here</p>
            </div>
          ) : (
            detailedLogs.fetchHistory.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const sources = ['google_alerts', 'youtube', 'reddit', 'x', 'instagram'];
              
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
                      <CollapsibleContent className="mt-4 space-y-4">
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
                      </CollapsibleContent>
                    )}
                  </CardContent>
                </Card>
              );
            })
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
