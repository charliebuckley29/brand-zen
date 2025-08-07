import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Play, Pause } from "lucide-react";
import { startMonitoring, getUserKeywords } from "@/lib/monitoring";
import { useToast } from "@/hooks/use-toast";

interface MonitoringControlsProps {
  onMentionsUpdated: () => void;
}

export function MonitoringControls({ onMentionsUpdated }: MonitoringControlsProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { toast } = useToast();

  const handleStartMonitoring = async () => {
    try {
      setIsMonitoring(true);
      
      // Get user's keywords
      const keywords = await getUserKeywords();
      
      if (keywords.length === 0) {
        toast({
          title: "No brands to monitor",
          description: "Please set up a brand first.",
          variant: "destructive"
        });
        return;
      }

      // Start monitoring for each keyword
      for (const keyword of keywords) {
        await startMonitoring(keyword.id);
      }

      toast({
        title: "Monitoring started!",
        description: `Now monitoring ${keywords.length} brand(s) for new mentions.`,
      });

      // Refresh mentions
      onMentionsUpdated();
      
    } catch (error) {
      console.error("Error starting monitoring:", error);
      toast({
        title: "Error",
        description: "Failed to start monitoring. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Monitoring Controls
        </CardTitle>
        <CardDescription>
          Generate new mentions and monitor your brand across the web
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button 
            onClick={handleStartMonitoring}
            disabled={isMonitoring}
            className="w-full sm:w-auto"
          >
            {isMonitoring ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate New Mentions
              </>
            )}
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>Click "Generate New Mentions" to simulate finding new brand mentions across various sources.</p>
        </div>
      </CardContent>
    </Card>
  );
}