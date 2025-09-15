import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Notification, getUserNotifications, markNotificationAsRead } from '@/lib/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Debug logging for unread count changes
  useEffect(() => {
    console.log('Unread count changed to:', unreadCount);
  }, [unreadCount]);

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
            console.log('New notification received:', payload);
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
            console.log('Notification updated:', payload);
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
    console.log('Marking notification as read:', notificationId);
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      setNotifications(prev => {
        const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
        console.log('Updated notifications:', updated.filter(n => !n.read).length, 'unread');
        return updated;
      });
      setUnreadCount(prev => {
        const newCount = Math.max(0, prev - 1);
        console.log('Updated unread count from', prev, 'to', newCount);
        return newCount;
      });
    }
  };

  const markAllAsReadLocal = () => {
    console.log('Marking all notifications as read locally');
    // Mark all notifications as read in local state
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      console.log('All notifications marked as read locally');
      return updated;
    });
    setUnreadCount(0);
    console.log('Unread count set to 0');
  };

  const forceRefresh = () => {
    loadNotifications();
  };

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsReadLocal,
    forceRefresh,
  };
}