import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealTimeIndicatorProps {
  isConnected: boolean;
  isConnecting: boolean;
  lastUpdate?: number;
  connectionAttempts?: number;
  error?: string | null;
  onReconnect?: () => void;
  className?: string;
}

export function RealTimeIndicator({ 
  isConnected, 
  isConnecting, 
  lastUpdate, 
  connectionAttempts = 0,
  error,
  onReconnect,
  className 
}: RealTimeIndicatorProps) {
  const getStatusColor = () => {
    if (isConnecting) return 'bg-yellow-500 hover:bg-yellow-600';
    if (isConnected) return 'bg-green-500 hover:bg-green-600';
    if (error) return 'bg-red-500 hover:bg-red-600';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Live';
    if (error) return 'Error';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnecting) return <Loader2 className="h-3 w-3 animate-spin" />;
    if (isConnected) return <Wifi className="h-3 w-3" />;
    return <WifiOff className="h-3 w-3" />;
  };

  const getLastUpdateText = () => {
    if (!lastUpdate) return '';
    const secondsAgo = Math.floor((Date.now() - lastUpdate) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  };

  const getConnectionStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    if (error) return `Error: ${error}`;
    if (connectionAttempts > 0) return `Reconnecting... (${connectionAttempts}/5)`;
    return 'Disconnected';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant="outline" 
        className={cn(
          "text-white border-0 cursor-pointer transition-colors",
          getStatusColor()
        )}
        title={getConnectionStatusText()}
      >
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <span className="text-xs font-medium">{getStatusText()}</span>
        </div>
      </Badge>
      
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Last update: {getLastUpdateText()}
        </span>
      )}
      
      {!isConnected && !isConnecting && onReconnect && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      )}
      
      {error && (
        <span className="text-xs text-red-500 max-w-xs truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
