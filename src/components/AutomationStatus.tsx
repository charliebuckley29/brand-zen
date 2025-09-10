import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserFetchStatus } from "@/hooks/useUserFetchStatus";

interface AutomationStatusProps {
  className?: string;
  onMentionsUpdated?: () => void;
}

export function AutomationStatus({ className, onMentionsUpdated }: AutomationStatusProps) {
  const [isManualFetching, setIsManualFetching] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const { toast } = useToast();
  const { canFetch, minutesUntilNextFetch, frequency, lastFetchTime, loading } = useUserFetchStatus();

  const triggerManualFetch = async () => {
    if (!canFetch) {
      toast({
        title: "Rate limit exceeded",
        description: `Please wait ${minutesUntilNextFetch} more minutes before fetching again.`,
        variant: "destructive",
      });
      return;
    }

    setIsManualFetching(true);
    try {
      console.log('AutomationStatus: Starting manual fetch...');
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Try the automated-mention-fetch function for this user only
      const { data: automatedData, error: automatedError } = await supabase.functions.invoke('automated-mention-fetch', { 
        body: { 
          check_frequencies: false, 
          manual: true,
          user_id: user.id
        } 
      });
      
      if (automatedError) {
        if (automatedError.message?.includes('Rate limit exceeded')) {
          toast({
            title: "Rate limit exceeded",
            description: automatedError.message,
            variant: "destructive",
          });
          return;
        }
        throw automatedError;
      }
      
      console.log('AutomationStatus: Manual fetch successful:', automatedData);
      
      // Update mentions display if callback provided
      if (onMentionsUpdated) {
        setTimeout(async () => {
          await onMentionsUpdated();
        }, 2000);
      }

      toast({
        title: "Fetch completed",
        description: `Successfully fetched mentions for ${automatedData?.successful_fetches || 0} keywords.`,
      });

    } catch (error: any) {
      console.error('AutomationStatus: Manual fetch error:', error);
      toast({
        title: "Fetch failed",
        description: error.message || "Could not fetch new mentions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsManualFetching(false);
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

  const getButtonText = () => {
    if (isManualFetching) return "Fetching...";
    if (!canFetch) return `Wait ${minutesUntilNextFetch}m`;
    return "Fetch Now";
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
          disabled={isManualFetching || !canFetch}
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
              {getButtonText()}
            </>
          )}
        </Button>
        
        {!canFetch && minutesUntilNextFetch > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Rate limited. Next fetch available in {minutesUntilNextFetch} minutes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}