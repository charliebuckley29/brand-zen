import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFetchFrequency } from "@/hooks/useFetchFrequency";

interface AutomationStatusProps {
  className?: string;
}

export function AutomationStatus({ className }: AutomationStatusProps) {
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [isManualFetching, setIsManualFetching] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const { toast } = useToast();
  const { frequency, loading } = useFetchFrequency();

  useEffect(() => {
    // Set up realtime subscription to track mention insertions
    const channel = supabase
      .channel('automation-tracking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mentions'
        },
        () => {
          setLastFetch(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerManualFetch = async () => {
    setIsManualFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('automated-mention-fetch', {
        body: { manual: true }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Manual fetch triggered",
        description: `Processing ${data?.processed_keywords || 0} keywords for new mentions`,
      });

      setLastFetch(new Date());
    } catch (error: any) {
      console.error('Manual fetch error:', error);
      toast({
        title: "Fetch failed",
        description: error.message || "Failed to trigger manual fetch",
        variant: "destructive",
      });
    } finally {
      setIsManualFetching(false);
    }
  };

  const getStatusColor = () => {
    if (!lastFetch) return "secondary";
    
    const now = new Date();
    const timeDiff = now.getTime() - lastFetch.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    // Green if last fetch was within user's frequency + 5min buffer
    if (minutesDiff <= frequency + 5) return "default";
    // Yellow if within 2x user's frequency
    if (minutesDiff <= frequency * 2) return "secondary";
    // Red if more than 2x user's frequency
    return "destructive";
  };

  const getStatusText = () => {
    if (!lastFetch) return "No recent activity";
    
    const now = new Date();
    const timeDiff = now.getTime() - lastFetch.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    
    if (minutesDiff < 1) return "Just now";
    if (minutesDiff < 60) return `${minutesDiff}m ago`;
    
    const hoursDiff = Math.floor(minutesDiff / 60);
    return `${hoursDiff}h ago`;
  };

  const StatusIcon = () => {
    const status = getStatusColor();
    if (status === "default") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "secondary") return <Clock className="h-4 w-4 text-yellow-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
            <CardDescription className="text-xs">
              Automated fetching every {frequency} minutes
            </CardDescription>
          </div>
          <Badge variant={automationEnabled ? "default" : "secondary"}>
            {automationEnabled ? "Active" : "Paused"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon />
            <span className="text-sm text-muted-foreground">
              Last fetch: {getStatusText()}
            </span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={triggerManualFetch}
          disabled={isManualFetching}
          className="w-full"
        >
          {isManualFetching ? (
            <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-2" />
              Fetch Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}