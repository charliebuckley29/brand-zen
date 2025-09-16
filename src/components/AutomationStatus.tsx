import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Clock, CheckCircle, AlertCircle, Zap, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserFetchStatus } from "@/hooks/useUserFetchStatus";

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
        // Trigger immediate fetch when automation is enabled
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: automatedData, error: automatedError } = await supabase.functions.invoke('automated-mention-fetch', { 
            body: { 
              check_frequencies: false, 
              manual: true,
              user_id: user.id
            } 
          });

          if (automatedError) {
            console.error('Initial automation fetch error:', automatedError);
          } else {
            console.log('Automation enabled, initial fetch successful:', automatedData);
            if (onMentionsUpdated) {
              setTimeout(async () => {
                await onMentionsUpdated();
              }, 2000);
            }
          }
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
              
              {/* Source breakdown */}
              {lastFetchStats.log && (() => {
                const sourceStats = parseSourceStats(lastFetchStats.log);
                const hasSources = Object.values(sourceStats).some(count => count > 0);
                
                if (hasSources) {
                  return (
                    <div className="flex flex-wrap gap-1">
                      {sourceStats.google_alerts > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          📰 {sourceStats.google_alerts}
                        </span>
                      )}
                      {sourceStats.youtube > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          🎥 {sourceStats.youtube}
                        </span>
                      )}
                      {sourceStats.reddit > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                          🔴 {sourceStats.reddit}
                        </span>
                      )}
                      {sourceStats.instagram > 0 && (
                        <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">
                          📸 {sourceStats.instagram}
                        </span>
                      )}
                      {sourceStats.twitter > 0 && (
                        <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
                          🐦 {sourceStats.twitter}
                        </span>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Error indicator */}
              {lastFetchStats.log && lastFetchStats.log.includes('Exception') && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>Some sources had errors</span>
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