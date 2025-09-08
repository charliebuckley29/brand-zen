import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'mention';
  read: boolean;
  data: any;
  external_delivery: any;
  created_at: string;
  updated_at: string;
}

// Create a notification and store it in the database
export async function createNotification(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' | 'mention' = 'info',
  data: any = {},
  external_delivery: any = {}
): Promise<Notification | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        message,
        type,
        data,
        external_delivery,
        read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return notification as Notification;
  } catch (error) {
    console.error('Unexpected error creating notification:', error);
    return null;
  }
}

// Get user notifications
export async function getUserNotifications(
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<Notification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (notifications || []) as Notification[];
  } catch (error) {
    console.error('Unexpected error fetching notifications:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error marking notification as read:', error);
    return false;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error marking all notifications as read:', error);
    return false;
  }
}

// Enhanced toast notification function that also stores in database
export function showToastWithStorage(
  toast: ReturnType<typeof useToast>['toast'],
  title: string,
  description: string,
  variant: 'default' | 'destructive' = 'default',
  type: 'info' | 'success' | 'warning' | 'error' | 'mention' = 'info',
  data: any = {}
) {
  // Show the toast immediately
  toast({
    title,
    description,
    variant,
  });

  // Store in database for external access
  createNotification(title, description, type, data);
}