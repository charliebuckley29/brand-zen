import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Mention, Notification, UserType } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Data fetching state
interface DataState {
  // Cache state
  mentionsCache: Map<string, Mention[]>;
  notificationsCache: Map<string, Notification[]>;
  lastFetch: Map<string, number>;
  
  // Cache configuration
  cacheExpiry: number; // 5 minutes in milliseconds
  
  // Actions
  getCachedMentions: (key: string) => Mention[] | null;
  setCachedMentions: (key: string, mentions: Mention[]) => void;
  getCachedNotifications: (key: string) => Notification[] | null;
  setCachedNotifications: (key: string, notifications: Notification[]) => void;
  isCacheValid: (key: string) => boolean;
  clearCache: () => void;
  clearExpiredCache: () => void;
  
  // Data fetching actions
  fetchMentions: (page: number, pageSize: number, sourceTypes: string[]) => Promise<{ data: Mention[]; count: number }>;
  fetchNotifications: (limit?: number) => Promise<Notification[]>;
  fetchUserProfile: () => Promise<any>;
  fetchKeywords: () => Promise<any[]>;
  fetchSourcePreferences: () => Promise<any[]>;
  
  // Real-time subscriptions
  subscribeToMentions: (userId: string, callback: (mention: Mention) => void) => () => void;
  subscribeToNotifications: (userId: string, callback: (notification: Notification) => void) => () => void;
}

// Cache expiry time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const useDataStore = create<DataState>()(
  devtools(
    (set, get) => ({
      // Initial state
      mentionsCache: new Map(),
      notificationsCache: new Map(),
      lastFetch: new Map(),
      cacheExpiry: CACHE_EXPIRY,
      
      // Cache actions
      getCachedMentions: (key: string) => {
        const { mentionsCache, isCacheValid } = get();
        if (!isCacheValid(key)) {
          mentionsCache.delete(key);
          return null;
        }
        return mentionsCache.get(key) || null;
      },
      
      setCachedMentions: (key: string, mentions: Mention[]) => {
        const { mentionsCache, lastFetch } = get();
        mentionsCache.set(key, mentions);
        lastFetch.set(key, Date.now());
        set({ mentionsCache: new Map(mentionsCache), lastFetch: new Map(lastFetch) });
      },
      
      getCachedNotifications: (key: string) => {
        const { notificationsCache, isCacheValid } = get();
        if (!isCacheValid(key)) {
          notificationsCache.delete(key);
          return null;
        }
        return notificationsCache.get(key) || null;
      },
      
      setCachedNotifications: (key: string, notifications: Notification[]) => {
        const { notificationsCache, lastFetch } = get();
        notificationsCache.set(key, notifications);
        lastFetch.set(key, Date.now());
        set({ notificationsCache: new Map(notificationsCache), lastFetch: new Map(lastFetch) });
      },
      
      isCacheValid: (key: string) => {
        const { lastFetch, cacheExpiry } = get();
        const lastFetchTime = lastFetch.get(key);
        if (!lastFetchTime) return false;
        return Date.now() - lastFetchTime < cacheExpiry;
      },
      
      clearCache: () => {
        logger.info('Clearing all cache');
        set({
          mentionsCache: new Map(),
          notificationsCache: new Map(),
          lastFetch: new Map(),
        });
      },
      
      clearExpiredCache: () => {
        const { mentionsCache, notificationsCache, lastFetch, cacheExpiry } = get();
        const now = Date.now();
        
        // Clear expired mentions cache
        for (const [key, time] of lastFetch.entries()) {
          if (now - time > cacheExpiry) {
            mentionsCache.delete(key);
            notificationsCache.delete(key);
            lastFetch.delete(key);
          }
        }
        
        set({
          mentionsCache: new Map(mentionsCache),
          notificationsCache: new Map(notificationsCache),
          lastFetch: new Map(lastFetch),
        });
      },
      
      // Data fetching actions
      fetchMentions: async (page: number, pageSize: number, sourceTypes: string[]) => {
        const cacheKey = `mentions_${page}_${pageSize}_${sourceTypes.join(',')}`;
        const { getCachedMentions, setCachedMentions } = get();
        
        // Check cache first
        const cached = getCachedMentions(cacheKey);
        if (cached) {
          logger.debug('Returning cached mentions');
          return { data: cached, count: cached.length };
        }
        
        try {
          logger.debug('Fetching mentions from database');
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          
          const types = sourceTypes;
          
          // Build the query
          let query = supabase
            .from("mentions")
            .select("*", { count: 'exact' })
            .eq('user_id', user.id)
            .in('source_type', types)
            .order('published_at', { ascending: false });
          
          // Apply pagination
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;
          query = query.range(from, to);
          
          const { data, error, count } = await query;
          
          if (error) throw error;
          
          const mentions = data || [];
          
          // Cache the result
          setCachedMentions(cacheKey, mentions);
          
          return { data: mentions, count: count || 0 };
        } catch (error) {
          logger.error('Error fetching mentions:', error);
          throw error;
        }
      },
      
      fetchNotifications: async (limit = 100) => {
        const cacheKey = `notifications_${limit}`;
        const { getCachedNotifications, setCachedNotifications } = get();
        
        // Check cache first
        const cached = getCachedNotifications(cacheKey);
        if (cached) {
          logger.debug('Returning cached notifications');
          return cached;
        }
        
        try {
          logger.debug('Fetching notifications from database');
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          
          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);
          
          if (error) throw error;
          
          const notifications = data || [];
          
          // Cache the result
          setCachedNotifications(cacheKey, notifications);
          
          return notifications;
        } catch (error) {
          logger.error('Error fetching notifications:', error);
          throw error;
        }
      },
      
      fetchUserProfile: async () => {
        try {
          logger.debug('Fetching user profile');
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          return data;
        } catch (error) {
          logger.error('Error fetching user profile:', error);
          throw error;
        }
      },
      
      fetchKeywords: async () => {
        try {
          logger.debug('Fetching keywords');
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          
          // Use the new keywords management API
          const { apiFetch } = await import('@/lib/api');
          const response = await apiFetch(`/admin/keywords-management?user_id=${user.id}`);
          
          if (!response.ok) throw new Error('Failed to fetch keywords');
          
          const result = await response.json();
          if (!result.success) throw new Error(result.error || 'Failed to fetch keywords');
          
          return result.data || [];
        } catch (error) {
          logger.error('Error fetching keywords:', error);
          throw error;
        }
      },
      
      fetchSourcePreferences: async () => {
        try {
          logger.debug('Fetching source preferences');
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          
          // Use the new keyword-source preferences API
          const { apiFetch } = await import('@/lib/api');
          const response = await apiFetch(`/keyword-source-preferences?userId=${user.id}`);
          
          if (!response.ok) throw new Error('Failed to fetch source preferences');
          
          const result = await response.json();
          if (!result.success) throw new Error(result.error || 'Failed to fetch source preferences');
          
          return result.data || [];
        } catch (error) {
          logger.error('Error fetching source preferences:', error);
          throw error;
        }
      },
      
      // Real-time subscriptions
      subscribeToMentions: (userId: string, callback: (mention: Mention) => void) => {
        logger.debug('Setting up mentions subscription');
        
        const channel = supabase
          .channel('mentions_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'mentions',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              const mention = payload.new as Mention;
              logger.debug('New mention received:', mention.id);
              callback(mention);
            }
          )
          .subscribe();
        
        return () => {
          logger.debug('Cleaning up mentions subscription');
          supabase.removeChannel(channel);
        };
      },
      
      subscribeToNotifications: (userId: string, callback: (notification: Notification) => void) => {
        logger.debug('Setting up notifications subscription');
        
        const channel = supabase
          .channel('notifications_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              const notification = payload.new as Notification;
              logger.debug('New notification received:', notification.id);
              callback(notification);
            }
          )
          .subscribe();
        
        return () => {
          logger.debug('Cleaning up notifications subscription');
          supabase.removeChannel(channel);
        };
      },
    }),
    {
      name: 'data-store',
    }
  )
);

// Selectors
export const useCache = () => useDataStore((state) => ({
  isCacheValid: state.isCacheValid,
  clearCache: state.clearCache,
  clearExpiredCache: state.clearExpiredCache,
}));

export const useDataActions = () => useDataStore((state) => ({
  fetchMentions: state.fetchMentions,
  fetchNotifications: state.fetchNotifications,
  fetchUserProfile: state.fetchUserProfile,
  fetchKeywords: state.fetchKeywords,
  fetchSourcePreferences: state.fetchSourcePreferences,
  subscribeToMentions: state.subscribeToMentions,
  subscribeToNotifications: state.subscribeToNotifications,
}));
