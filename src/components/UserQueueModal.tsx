import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Search, Bug, Clock, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QueueStatusWidget } from "./QueueStatusWidget";
import { QueueHistoryWidget } from "./QueueHistoryWidget";
import { formatDistanceToNow } from "date-fns";

interface UserQueueModalProps {
  userId: string;
}

interface TechnicalData {
  rawQueueData: any[];
  systemStats: any;
  fetchLogs: any[];
}

export function UserQueueModal({ userId }: UserQueueModalProps) {
  const [open, setOpen] = useState(false);
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [loadingTechnical, setLoadingTechnical] = useState(false);
  const { toast } = useToast();

  const fetchTechnicalData = async () => {
    try {
      setLoadingTechnical(true);
      
      // Fetch raw queue data
      const queueResponse = await fetch(`https://mentions-backend.vercel.app/api/admin/queue-status`);
      const queueData = queueResponse.ok ? await queueResponse.json() : null;
      
      // Fetch system stats
      const statsResponse = await fetch(`https://mentions-backend.vercel.app/api/admin/system-health`);
      const statsData = statsResponse.ok ? await statsResponse.json() : null;
      
      // Fetch detailed fetch logs
      const logsResponse = await fetch(`https://mentions-backend.vercel.app/api/debug/detailed-fetch-logs`);
      const logsData = logsResponse.ok ? await logsResponse.json() : null;
      
      setTechnicalData({
        rawQueueData: queueData || [],
        systemStats: statsData || {},
        fetchLogs: logsData?.analysis?.fetchLogs || logsData?.fetchLogs || []
      });
    } catch (error) {
      console.error('Error fetching technical data:', error);
    } finally {
      setLoadingTechnical(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTechnicalData();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          My Queue Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            My Queue Activity
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="sr-only">
          View your personal queue status and monitoring activity history.
        </DialogDescription>
        
        <div className="flex-1">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                My Activity
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Technical Details
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="flex-1 space-y-6 mt-4">
              {/* User-Centric Overview */}
              <div className="space-y-6">
                {/* Current Queue Status */}
                <QueueStatusWidget userId={userId} />
                
                {/* Queue History */}
                <QueueHistoryWidget userId={userId} limit={50} />
              </div>
            </TabsContent>
            
            <TabsContent value="technical" className="flex-1 space-y-4 mt-4">
              {/* Technical Debug Information */}
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Bug className="h-5 w-5" />
                    Technical Debug Information
                  </h3>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                    <p>This section contains technical details for debugging purposes.</p>
                    <p>For user-friendly monitoring information, use the "My Activity" tab.</p>
                  </div>
                </div>

                {/* Raw Queue Data */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Raw Queue Data
                    </h4>
                    <Button variant="outline" size="sm" onClick={fetchTechnicalData} disabled={loadingTechnical}>
                      <RefreshCw className={`h-4 w-4 ${loadingTechnical ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    {loadingTechnical ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        Loading technical data...
                      </div>
                    ) : technicalData?.rawQueueData ? (
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(technicalData.rawQueueData, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No raw queue data available. Click refresh to load.
                      </p>
                    )}
                  </div>
                </div>

                {/* System Statistics */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    System Statistics
                  </h4>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    {technicalData?.systemStats ? (
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(technicalData.systemStats, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No system statistics available.
                      </p>
                    )}
                  </div>
                </div>

                {/* Detailed Fetch Logs */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Detailed Fetch Logs
                  </h4>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    {technicalData?.fetchLogs && technicalData.fetchLogs.length > 0 ? (
                      <div className="space-y-3">
                        {technicalData.fetchLogs.slice(0, 20).map((log: any, index: number) => (
                          <div key={index} className="p-3 bg-background/50 rounded border text-xs">
                            <div className="font-medium text-foreground mb-1">
                              {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                            </div>
                            <div className="text-muted-foreground space-y-1">
                              <div>Type: {log.fetch_type}</div>
                              <div>Keywords: {log.successful_keywords} successful, {log.failed_keywords} failed</div>
                              <div>Fetches: {log.successful_fetches} successful, {log.failed_fetches} failed</div>
                              {log.results_summary && (
                                <div className="mt-2">
                                  <div className="font-medium">Results Summary:</div>
                                  <pre className="text-xs opacity-75 mt-1">
                                    {JSON.stringify(log.results_summary, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {technicalData.fetchLogs.length > 20 && (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            Showing first 20 of {technicalData.fetchLogs.length} logs
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No detailed fetch logs available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

