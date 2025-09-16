import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Activity, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useToast } from "@/hooks/use-toast";

interface SourceStats {
  google_alerts: number;
  youtube: number;
  reddit: number;
  instagram: number;
  twitter: number;
}

function parseSourceStats(log: string): SourceStats {
  const stats: SourceStats = {
    google_alerts: 0,
    youtube: 0,
    reddit: 0,
    instagram: 0,
    twitter: 0
  };

  if (!log) return stats;

  // Parse patterns like "20 Google Alerts", "5 YouTube", etc.
  const googleMatch = log.match(/(\d+)\s+Google\s+Alerts?/i);
  if (googleMatch) stats.google_alerts = parseInt(googleMatch[1]);

  const youtubeMatch = log.match(/(\d+)\s+YouTube/i);
  if (youtubeMatch) stats.youtube = parseInt(youtubeMatch[1]);

  const redditMatch = log.match(/(\d+)\s+Reddit/i);
  if (redditMatch) stats.reddit = parseInt(redditMatch[1]);

  const instagramMatch = log.match(/(\d+)\s+Instagram/i);
  if (instagramMatch) stats.instagram = parseInt(instagramMatch[1]);

  const twitterMatch = log.match(/(\d+)\s+Twitter/i);
  if (twitterMatch) stats.twitter = parseInt(twitterMatch[1]);

  return stats;
}

interface FetchLog {
  id: string;
  fetch_type: string;
  started_at: string;
  completed_at: string | null;
  successful_keywords: number;
  failed_keywords: number;
  successful_fetches: number;
  log: string;
  created_at: string;
}

export function FetchLogsModal() {
  const [logs, setLogs] = useState<FetchLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);
  const { formatDateTime, formatRelativeTime } = useTimezone();
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_fetch_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
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
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;
      
      setLogs([]);
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

  useEffect(() => {
    // Only fetch when modal opens (when component mounts)
    fetchLogs();
  }, []);

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

  const getStatusIcon = (log: FetchLog) => {
    if (!log.completed_at) {
      return <Activity className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    if (log.failed_keywords > 0) {
      return <XCircle className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = (log: FetchLog) => {
    if (!log.completed_at) return 'In Progress';
    if (log.failed_keywords > 0) return 'Partial Success';
    return 'Completed';
  };

  const getStatusColor = (log: FetchLog) => {
    if (!log.completed_at) return 'bg-yellow-100 text-yellow-800';
    if (log.failed_keywords > 0) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          View Fetch Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fetch Logs
            </div>
            {logs.length > 0 && (
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
                      <strong>{logs.length} log entries</strong> will be removed.
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
        
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-6 w-6 animate-spin mr-2" />
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fetch logs found
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const totalKeywords = log.successful_keywords + log.failed_keywords;
              
              return (
                <Collapsible
                  key={log.id}
                  open={isExpanded}
                  onOpenChange={() => toggleLogExpanded(log.id)}
                  className="border rounded-lg p-4"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {log.fetch_type === 'manual' ? 'Manual' : 'Automated'} Fetch
                            </span>
                            <Badge className={getStatusColor(log)}>
                              {getStatusText(log)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatRelativeTime(log.started_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {totalKeywords > 0 && (
                          <div className="text-right text-sm">
                            <div className="text-green-600 font-medium">
                              {log.successful_keywords} successful
                            </div>
                            {log.failed_keywords > 0 && (
                              <div className="text-red-600">
                                {log.failed_keywords} failed
                              </div>
                            )}
                          </div>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="pt-4 border-t mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-muted-foreground">Start Time</div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(log.started_at)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium text-muted-foreground">End Time</div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.completed_at 
                            ? formatDateTime(log.completed_at)
                            : 'In progress...'
                          }
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium text-muted-foreground">Duration</div>
                        <div>{getFetchDuration(log.started_at, log.completed_at)}</div>
                      </div>
                      
                      <div>
                        <div className="font-medium text-muted-foreground">Type</div>
                        <Badge variant={log.fetch_type === 'manual' ? 'default' : 'secondary'}>
                          {log.fetch_type === 'manual' ? 'Manual' : 'Automated'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-muted/50 rounded-md">
                      <div className="font-medium text-sm mb-2">Results Summary</div>
                      <div className="space-y-2">
                        {/* Keywords Summary */}
                        {totalKeywords > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
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
                          </div>
                        )}
                        
                        {/* Mentions Summary */}
                        {log.successful_fetches > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{log.successful_fetches} mentions fetched</span>
                          </div>
                        )}
                        
                        {/* Source Breakdown */}
                        {log.log && (() => {
                          const sourceStats = parseSourceStats(log.log);
                          const hasSources = Object.values(sourceStats).some(count => count > 0);
                          
                          if (hasSources) {
                            return (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Source Breakdown:</div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {sourceStats.google_alerts > 0 && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      📰 {sourceStats.google_alerts} Google Alerts
                                    </span>
                                  )}
                                  {sourceStats.youtube > 0 && (
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                                      🎥 {sourceStats.youtube} YouTube
                                    </span>
                                  )}
                                  {sourceStats.reddit > 0 && (
                                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                      🔴 {sourceStats.reddit} Reddit
                                    </span>
                                  )}
                                  {sourceStats.instagram > 0 && (
                                    <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded">
                                      📸 {sourceStats.instagram} Instagram
                                    </span>
                                  )}
                                  {sourceStats.twitter > 0 && (
                                    <span className="bg-sky-100 text-sky-800 px-2 py-1 rounded">
                                      🐦 {sourceStats.twitter} Twitter
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Error Details */}
                        {log.log && log.log.includes('Exception') && (
                          <div className="mt-2 pt-2 border-t">
                            <details className="text-xs">
                              <summary className="cursor-pointer text-red-600 hover:text-red-800 font-medium">
                                View Error Details
                              </summary>
                              <pre className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-800 whitespace-pre-wrap">
                                {log.log}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            Refresh Logs
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}