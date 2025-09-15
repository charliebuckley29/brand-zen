import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Notification, getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/notifications';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsReadLocal: () => void;
  forceRefresh: () => void;
  loadNotifications: (silent?: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();


  // Load initial notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  // Refresh notifications when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications(true); // Silent refresh
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            
            // Add to notifications list
            setNotifications(prev => [newNotification, ...prev]);
            
            // Update unread count
            setUnreadCount(prev => prev + 1);
            
            // Show toast notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: newNotification.type === 'error' ? 'destructive' : 'default',
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            
            // Update notifications list
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            // Recalculate unread count
            setUnreadCount(prev => {
              const oldNotification = payload.old as Notification;
              if (!oldNotification.read && updatedNotification.read) {
                return Math.max(0, prev - 1);
              }
              return prev;
            });
          }
        )
        .subscribe();

      // Set up periodic refresh to catch any missed updates
      const refreshInterval = setInterval(() => {
        loadNotifications(true); // Silent refresh
      }, 30000); // Refresh every 30 seconds

      return () => {
        supabase.removeChannel(channel);
        clearInterval(refreshInterval);
      };
    };

    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [toast]);

  const loadNotifications = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const fetchedNotifications = await getUserNotifications(false, 100);
      setNotifications(fetchedNotifications);
      
      // Count unread notifications
      const unread = fetchedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      setNotifications(prev => {
        const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
        return updated;
      });
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsReadLocal = async () => {
    // Update local state immediately
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Update database
    await markAllNotificationsAsRead();
  };

  const forceRefresh = () => {
    loadNotifications(true);
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsReadLocal,
    forceRefresh,
    loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
