import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Clock } from "lucide-react";
import { useUserFetchStatus } from "@/hooks/useUserFetchStatus";

export function RealtimeIndicator() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const { frequency } = useUserFetchStatus();

  useEffect(() => {
    // Set up realtime connection status monitoring
    const channel = supabase
      .channel('realtime-status')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mentions'
        },
        () => {
          setLastActivity(new Date());
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getTimeSinceActivity = () => {
    if (!lastActivity) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span>{isConnected ? 'Live' : 'Offline'}</span>
      </div>
      
      {lastActivity && (
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>Last: {getTimeSinceActivity()}</span>
        </div>
      )}
      
      <Badge variant="secondary" className="text-xs">
        <Clock className="h-3 w-3 mr-1" />
        Auto: {frequency || 15}min
      </Badge>
    </div>
  );
}