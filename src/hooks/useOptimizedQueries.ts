import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mention, PaginatedResponse, Notification } from '@/types';
import { useDebounce } from './usePerformance';
import { useDataStore } from '@/store/dataStore';
import { useAppStore } from '@/store/appStore';
import { usePerformanceMonitor } from '@/store/performanceStore';
import { logger } from '@/lib/logger';

// Enhanced mentions query with caching and performance monitoring
export function useMentionsQuery(
  page: number,
  pageSize: number,
  sourceTypes: string[],
  options?: UseQueryOptions<PaginatedResponse<Mention>, Error>
) {
  const queryKey = useMemo(() => ['mentions', page, pageSize, sourceTypes], [page, pageSize, sourceTypes]);
  const { fetchMentions } = useDataStore();
  const { measure } = usePerformanceMonitor();
  const { setMentions, setTotalMentions, setMentionsLoading, setMentionsError } = useAppStore();

  const queryFn = useCallback(async () => {
    return measure('fetchMentions', async () => {
      const result = await fetchMentions(page, pageSize, sourceTypes);
      
      // Update global state
      setMentions(result.data);
      setTotalMentions(result.count);
      
      return result;
    }, { page, pageSize, sourceTypes });
  }, [page, pageSize, sourceTypes, fetchMentions, measure, setMentions, setTotalMentions]);

  const query = useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });

  // Update loading and error states
  useEffect(() => {
    setMentionsLoading(query.isLoading);
    setMentionsError(query.error?.message || null);
  }, [query.isLoading, query.error, setMentionsLoading, setMentionsError]);

  return query;
}

// Infinite scroll mentions query
export function useInfiniteMentionsQuery(
  pageSize: number,
  sourceTypes: string[],
  options?: any
) {
  const { fetchMentions } = useDataStore();
  const { measure } = usePerformanceMonitor();

  return useInfiniteQuery({
    queryKey: ['mentions', 'infinite', pageSize, sourceTypes],
    queryFn: async ({ pageParam = 1 }) => {
      return measure('fetchInfiniteMentions', async () => {
        return await fetchMentions(pageParam, pageSize, sourceTypes);
      }, { page: pageParam, pageSize, sourceTypes });
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = Math.ceil(lastPage.count / pageSize);
      return allPages.length < totalPages ? allPages.length + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    keepPreviousData: true,
    ...options,
  });
}

// Enhanced notifications query
export function useNotificationsQuery(
  limit: number = 100,
  options?: UseQueryOptions<Notification[], Error>
) {
  const queryKey = useMemo(() => ['notifications', limit], [limit]);
  const { fetchNotifications } = useDataStore();
  const { measure } = usePerformanceMonitor();
  const { setNotifications, setUnreadCount, setNotificationsLoading } = useAppStore();

  const queryFn = useCallback(async () => {
    return measure('fetchNotifications', async () => {
      const notifications = await fetchNotifications(limit);
      
      // Update global state
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
      
      return notifications;
    }, { limit });
  }, [limit, fetchNotifications, measure, setNotifications, setUnreadCount]);

  const query = useQuery({
    queryKey,
    queryFn,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    ...options,
  });

  // Update loading state
  useEffect(() => {
    setNotificationsLoading(query.isLoading);
  }, [query.isLoading, setNotificationsLoading]);

  return query;
}

// User profile query
export function useUserProfileQuery(options?: UseQueryOptions<any, Error>) {
  const queryKey = ['userProfile'];
  const { fetchUserProfile } = useDataStore();
  const { measure } = usePerformanceMonitor();
  const { setUser, setUserRole } = useAppStore();

  const queryFn = useCallback(async () => {
    return measure('fetchUserProfile', async () => {
      const profile = await fetchUserProfile();
      
      // Update global state
      setUser(profile);
      setUserRole(profile.user_type);
      
      return profile;
    });
  }, [fetchUserProfile, measure, setUser, setUserRole]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// Keywords query
export function useKeywordsQuery(options?: UseQueryOptions<any[], Error>) {
  const queryKey = ['keywords'];
  const { fetchKeywords } = useDataStore();
  const { measure } = usePerformanceMonitor();

  const queryFn = useCallback(async () => {
    return measure('fetchKeywords', async () => {
      return await fetchKeywords();
    });
  }, [fetchKeywords, measure]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

// Source preferences query
export function useSourcePreferencesQuery(options?: UseQueryOptions<any[], Error>) {
  const queryKey = ['sourcePreferences'];
  const { fetchSourcePreferences } = useDataStore();
  const { measure } = usePerformanceMonitor();

  const queryFn = useCallback(async () => {
    return measure('fetchSourcePreferences', async () => {
      return await fetchSourcePreferences();
    });
  }, [fetchSourcePreferences, measure]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

// Search mentions query with debouncing
export function useMentionsSearch(
  searchTerm: string,
  sourceTypes: string[],
  options?: UseQueryOptions<Mention[], Error>
) {
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryKey = useMemo(() => ['mentions', 'search', debouncedSearchTerm, sourceTypes], [debouncedSearchTerm, sourceTypes]);
  const { measure } = usePerformanceMonitor();

  const queryFn = useCallback(async () => {
    if (!debouncedSearchTerm.trim()) return [];

    return measure('searchMentions', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("mentions")
        .select("*")
        .eq('user_id', user.id)
        .in('source_type', sourceTypes)
        .or(`content_snippet.ilike.%${debouncedSearchTerm}%,full_text.ilike.%${debouncedSearchTerm}%`)
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    }, { searchTerm: debouncedSearchTerm, sourceTypes });
  }, [debouncedSearchTerm, sourceTypes, measure]);

  return useQuery({
    queryKey,
    queryFn,
    enabled: debouncedSearchTerm.length > 2,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

// Analytics data query
export function useAnalyticsData(
  timeRange: '7d' | '30d' | '90d' = '30d',
  options?: UseQueryOptions<any, Error>
) {
  const queryKey = useMemo(() => ['analytics', timeRange], [timeRange]);
  const { measure } = usePerformanceMonitor();

  const queryFn = useCallback(async () => {
    return measure('fetchAnalyticsData', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch mentions data for analytics
      const { data: mentions, error: mentionsError } = await supabase
        .from("mentions")
        .select("*")
        .eq('user_id', user.id)
        .gte('published_at', startDate.toISOString())
        .order('published_at', { ascending: false });

      if (mentionsError) throw mentionsError;

      // Process analytics data
      const analytics = {
        totalMentions: mentions?.length || 0,
        positiveMentions: mentions?.filter(m => m.sentiment && m.sentiment >= 51).length || 0,
        negativeMentions: mentions?.filter(m => m.sentiment && m.sentiment <= 49).length || 0,
        neutralMentions: mentions?.filter(m => m.sentiment && m.sentiment === 50).length || 0,
        unknownMentions: mentions?.filter(m => m.sentiment === null || m.sentiment === -1).length || 0,
        flaggedMentions: mentions?.filter(m => m.flagged).length || 0,
        escalatedMentions: mentions?.filter(m => m.escalation_type !== 'none').length || 0,
        bySource: {} as Record<string, number>,
        byDay: {} as Record<string, number>,
        sentimentTrend: [] as Array<{ date: string; positive: number; negative: number; neutral: number }>,
      };

      // Group by source
      mentions?.forEach(mention => {
        analytics.bySource[mention.source_type] = (analytics.bySource[mention.source_type] || 0) + 1;
      });

      // Group by day
      mentions?.forEach(mention => {
        const date = new Date(mention.published_at).toISOString().split('T')[0];
        analytics.byDay[date] = (analytics.byDay[date] || 0) + 1;
      });

      // Calculate sentiment trend
      const sentimentByDay: Record<string, { positive: number; negative: number; neutral: number }> = {};
      mentions?.forEach(mention => {
        const date = new Date(mention.published_at).toISOString().split('T')[0];
        if (!sentimentByDay[date]) {
          sentimentByDay[date] = { positive: 0, negative: 0, neutral: 0 };
        }
        
        if (mention.sentiment !== null && mention.sentiment !== -1) {
          if (mention.sentiment >= 51) {
            sentimentByDay[date].positive++;
          } else if (mention.sentiment <= 49) {
            sentimentByDay[date].negative++;
          } else {
            sentimentByDay[date].neutral++;
          }
        }
      });

      analytics.sentimentTrend = Object.entries(sentimentByDay)
        .map(([date, sentiment]) => ({ date, ...sentiment }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return analytics;
    }, { timeRange });
  }, [timeRange, measure]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

// Real-time subscriptions hook
export function useRealtimeSubscriptions() {
  const { subscribeToMentions, subscribeToNotifications } = useDataStore();
  const { addMention, addNotification } = useAppStore();
  const { measure } = usePerformanceMonitor();

  useEffect(() => {
    const { data: { user } } = supabase.auth.getUser();
    if (!user) return;

    // Subscribe to mentions
    const unsubscribeMentions = subscribeToMentions(user.id, (mention) => {
      measure('realtimeMention', () => {
        addMention(mention);
        logger.info('New mention received via realtime:', mention.id);
      });
    });

    // Subscribe to notifications
    const unsubscribeNotifications = subscribeToNotifications(user.id, (notification) => {
      measure('realtimeNotification', () => {
        addNotification(notification);
        logger.info('New notification received via realtime:', notification.id);
      });
    });

    return () => {
      unsubscribeMentions();
      unsubscribeNotifications();
    };
  }, [subscribeToMentions, subscribeToNotifications, addMention, addNotification, measure]);
}

// Cache management hook
export function useCacheManagement() {
  const queryClient = useQueryClient();
  const { clearCache, clearExpiredCache } = useDataStore();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
    clearCache();
  }, [queryClient, clearCache]);

  const invalidateMentions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mentions'] });
  }, [queryClient]);

  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const clearAllCache = useCallback(() => {
    queryClient.clear();
    clearCache();
  }, [queryClient, clearCache]);

  // Auto-clear expired cache every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpiredCache();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [clearExpiredCache]);

  return {
    invalidateAll,
    invalidateMentions,
    invalidateNotifications,
    clearAllCache,
  };
}