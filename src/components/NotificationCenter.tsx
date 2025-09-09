import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, CheckCheck, MessageCircle } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { formatDistanceToNow } from 'date-fns';

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsReadLocal } = useNotifications();
  const { navigateToMention } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllAsRead = async () => {
    console.log('NotificationCenter: Marking all as read');
    await markAllAsReadLocal();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <MessageCircle className="h-4 w-4" />;
      case 'error':
        return <span className="text-destructive">⚠</span>;
      case 'success':
        return <span className="text-success">✓</span>;
      case 'warning':
        return <span className="text-warning">!</span>;
      default:
        return <span className="text-primary">ℹ</span>;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'mention':
        return 'bg-primary/10 border-primary/20';
      case 'error':
        return 'bg-destructive/10 border-destructive/20';
      case 'success':
        return 'bg-success/10 border-success/20';
      case 'warning':
        return 'bg-warning/10 border-warning/20';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] leading-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-8 px-2 text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-l-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                        !notification.read 
                          ? `${getNotificationColor(notification.type)} border-l-current` 
                          : 'bg-muted/20 border-l-transparent'
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          console.log('NotificationCenter: Marking notification as read:', notification.id);
                          markAsRead(notification.id);
                        }
                        
                        // If this is a mention notification and has mention_id data, navigate to it
                        if (notification.type === 'mention' && notification.data?.mention_id) {
                          console.log('NotificationCenter: Navigating to mention:', notification.data.mention_id);
                          navigateToMention(notification.data.mention_id);
                          setIsOpen(false); // Close the notification popup
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${
                              !notification.read ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('NotificationCenter: Marking notification as read (button):', notification.id);
                                  markAsRead(notification.id);
                                }}
                                className="h-6 w-6 p-0 flex-shrink-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className={`text-xs mt-1 line-clamp-2 ${
                            !notification.read ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}