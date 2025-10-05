import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Clock, CheckCircle, AlertCircle, Zap, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserFetchStatus } from "@/hooks/useUserFetchStatus";


interface AutomationStatusProps {
  className?: string;
  onMentionsUpdated?: () => void;
}

export function AutomationStatus({ className, onMentionsUpdated }: AutomationStatusProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const { toast } = useToast();
  const { canFetch, minutesUntilNextFetch, frequency, lastFetchTime, lastFetchStats, loading, automationEnabled, updateAutomationEnabled } = useUserFetchStatus();

  const handleAutomationToggle = async (enabled: boolean) => {
    setIsEnabling(true);
    try {
      await updateAutomationEnabled(enabled);
      
      if (enabled) {
        // Automation is handled automatically by backend queue system
        // Just refresh the mentions display after a short delay
        if (onMentionsUpdated) {
          setTimeout(async () => {
            await onMentionsUpdated();
          }, 2000);
        }

        toast({
          title: "Automation enabled",
          description: `Your mentions will now be fetched automatically every ${frequency} minutes.`,
        });
      } else {
        toast({
          title: "Automation disabled",
          description: "Automatic mention fetching has been turned off.",
        });
      }
    } catch (error: any) {
      console.error('Failed to toggle automation:', error);
      toast({
        title: "Failed to update automation",
        description: error.message || "Could not update automation setting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const getStatusColor = () => {
    if (!lastFetchTime) return "secondary";
    
    const now = new Date();
    const timeDiff = now.getTime() - lastFetchTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    // Green if last fetch was within user's frequency + 5min buffer
    if (minutesDiff <= frequency + 5) return "default";
    // Yellow if within 2x user's frequency
    if (minutesDiff <= frequency * 2) return "secondary";
    // Red if more than 2x user's frequency
    return "destructive";
  };

  const getStatusText = () => {
    if (!lastFetchTime) return "No recent activity";
    
    const now = new Date();
    const timeDiff = now.getTime() - lastFetchTime.getTime();
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

  const getAutomationStatusText = () => {
    if (automationEnabled) {
      return `Fetching every ${frequency} minutes`;
    }
    return "Manual fetching only";
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
              <CardDescription className="text-xs">Loading...</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
            <CardDescription className="text-xs">
              {getAutomationStatusText()}
            </CardDescription>
          </div>
          <Badge variant={automationEnabled ? "default" : "secondary"}>
            {automationEnabled ? "Active" : "Manual"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon />
              <span className="text-sm text-muted-foreground">
                Last fetch: {getStatusText()}
              </span>
            </div>
          </div>
          
          {/* Enhanced fetch details */}
          {lastFetchStats && (
            <div className="space-y-2">
              {/* Mention count */}
              {lastFetchStats.successful_fetches > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>{lastFetchStats.successful_fetches} mentions fetched</span>
                </div>
              )}
              
              
              {/* Error indicator */}
              {lastFetchStats.log && lastFetchStats.log.includes('Exception') && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>Some sources undergoing maintenance</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${automationEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">
              {automationEnabled ? 'Fetching On' : 'Fetching Off'}
            </span>
          </div>
          <Switch 
            checked={automationEnabled}
            onCheckedChange={handleAutomationToggle}
            disabled={isEnabling}
          />
        </div>
        
        {automationEnabled && (
          <p className="text-xs text-muted-foreground text-center">
            {!canFetch && minutesUntilNextFetch > 0 
              ? `Rate limited. Next fetch in ${minutesUntilNextFetch} minutes.`
              : `Next automatic fetch in ${Math.max(0, frequency - Math.floor((Date.now() - (lastFetchTime?.getTime() || 0)) / (1000 * 60)))} minutes.`
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
}