import React, { useMemo, useCallback, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Notification } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X,
  ExternalLink,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface VirtualizedNotificationsListProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (notificationId: string) => void;
  height?: number;
  itemHeight?: number;
  className?: string;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
    onMarkAsRead: (notificationId: string) => void;
    onDismiss: (notificationId: string) => void;
  };
}

// Individual notification row component
const NotificationRow: React.FC<RowProps> = ({ index, style, data }) => {
  const { notifications, onNotificationClick, onMarkAsRead, onDismiss } = data;
  const notification = notifications[index];

  if (!notification) {
    return (
      <div style={style} className="p-2">
        <Card className="animate-pulse">
          <CardContent className="p-3">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'mention':
        return 'border-blue-200 bg-blue-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'mention':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleClick = () => {
    onNotificationClick(notification);
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(notification.id);
  };

  return (
    <div style={style} className="p-2">
      <Card 
        className={cn(
          "hover:shadow-md transition-all cursor-pointer",
          !notification.read && "ring-2 ring-primary/20",
          getNotificationColor(notification.type)
        )}
        onClick={handleClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getNotificationIcon(notification.type)}
                <h4 className={cn(
                  "font-medium text-sm truncate",
                  !notification.read && "font-semibold"
                )}>
                  {notification.title}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getTypeBadgeColor(notification.type))}
                >
                  {notification.type}
                </Badge>
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {notification.message}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </div>
              
              {notification.data && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {notification.data.mention_id && (
                    <span className="inline-block bg-muted px-2 py-1 rounded mr-2">
                      Mention ID: {notification.data.mention_id}
                    </span>
                  )}
                  {notification.data.source_name && (
                    <span className="inline-block bg-muted px-2 py-1 rounded">
                      Source: {notification.data.source_name}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
              
              {notification.external_delivery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle external link
                    if (notification.data?.source_url) {
                      window.open(notification.data.source_url, '_blank');
                    }
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main virtualized notifications list component
export const VirtualizedNotificationsList: React.FC<VirtualizedNotificationsListProps> = ({
  notifications,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  height = 400,
  itemHeight = 120,
  className
}) => {
  const [isScrolling, setIsScrolling] = useState(false);

  // Memoize the data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    notifications,
    onNotificationClick,
    onMarkAsRead,
    onDismiss,
  }), [notifications, onNotificationClick, onMarkAsRead, onDismiss]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    setTimeout(() => setIsScrolling(false), 150);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4 p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="font-medium text-sm">
            Notifications ({notifications.length})
          </span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {isScrolling && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="text-xs">
            Scrolling...
          </Badge>
        </div>
      )}
      
      <List
        height={height - 60} // Account for header
        itemCount={notifications.length}
        itemSize={itemHeight}
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={3}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {NotificationRow}
      </List>
    </div>
  );
};

// Compact version for dropdowns
export const CompactVirtualizedNotificationsList: React.FC<VirtualizedNotificationsListProps> = ({
  notifications,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  height = 300,
  itemHeight = 80,
  className
}) => {
  const [isScrolling, setIsScrolling] = useState(false);

  const itemData = useMemo(() => ({
    notifications,
    onNotificationClick,
    onMarkAsRead,
    onDismiss,
  }), [notifications, onNotificationClick, onMarkAsRead, onDismiss]);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    setTimeout(() => setIsScrolling(false), 150);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Compact header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-sm font-medium">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
        </span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="h-6 px-2 text-xs"
          >
            Mark all
          </Button>
        )}
      </div>

      <List
        height={height - 40}
        itemCount={notifications.length}
        itemSize={itemHeight}
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={2}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {NotificationRow}
      </List>
    </div>
  );
};
