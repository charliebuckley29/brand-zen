import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mention, PaginatedResponse } from '@/types';
import { useDebounce } from './usePerformance';

// Optimized mentions query with caching and pagination
export function useMentionsQuery(
  page: number = 1,
  pageSize: number = 10,
  sourceTypes?: string[],
  options?: Partial<UseQueryOptions<PaginatedResponse<Mention>>>
) {
  const queryClient = useQueryClient();
  
  const queryKey = useMemo(
    () => ['mentions', page, pageSize, sourceTypes],
    [page, pageSize, sourceTypes]
  );

  const queryFn = useCallback(async (): Promise<PaginatedResponse<Mention>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let mentionsQuery = supabase
      .from("mentions")
      .select("*", { count: 'exact' })
      .eq('user_id', user.id)
      .order("published_at", { ascending: false })
      .range((page - 1) * pageSize, (page * pageSize) - 1);

    if (sourceTypes && sourceTypes.length > 0 && sourceTypes.length < 4) {
      mentionsQuery = mentionsQuery.in("source_type", sourceTypes);
    }

    const { data, count, error } = await mentionsQuery;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
    };
  }, [page, pageSize, sourceTypes]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Keep previous data while fetching new page
    ...options,
  });
}

// Optimized stats query with separate caching
export function useMentionsStatsQuery(sourceTypes?: string[]) {
  const queryKey = useMemo(
    () => ['mentions-stats', sourceTypes],
    [sourceTypes]
  );

  const queryFn = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let statsQuery = supabase
      .from("mentions")
      .select('id, sentiment, flagged', { count: 'exact' })
      .eq('user_id', user.id);

    if (sourceTypes && sourceTypes.length > 0 && sourceTypes.length < 4) {
      statsQuery = statsQuery.in("source_type", sourceTypes);
    }

    const { data, count, error } = await statsQuery;

    if (error) throw error;

    const total = count || 0;
    const positive = data?.filter(m => m.sentiment !== null && m.sentiment !== -1 && m.sentiment >= 51).length || 0;
    const neutral = data?.filter(m => m.sentiment === 50).length || 0;
    const negative = data?.filter(m => m.sentiment !== null && m.sentiment !== -1 && m.sentiment <= 49).length || 0;
    const flagged = data?.filter(m => m.flagged).length || 0;

    return {
      total,
      positive,
      neutral,
      negative,
      flagged,
    };
  }, [sourceTypes]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Search mentions with debounced input
export function useMentionsSearch(
  searchTerm: string,
  sourceTypes?: string[],
  debounceMs: number = 300
) {
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);
  const [isSearching, setIsSearching] = useState(false);

  const queryKey = useMemo(
    () => ['mentions-search', debouncedSearchTerm, sourceTypes],
    [debouncedSearchTerm, sourceTypes]
  );

  const queryFn = useCallback(async (): Promise<Mention[]> => {
    if (!debouncedSearchTerm.trim()) return [];

    setIsSearching(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let searchQuery = supabase
        .from("mentions")
        .select("*")
        .eq('user_id', user.id)
        .or(`content_snippet.ilike.%${debouncedSearchTerm}%,source_name.ilike.%${debouncedSearchTerm}%`)
        .order("published_at", { ascending: false })
        .limit(50);

      if (sourceTypes && sourceTypes.length > 0 && sourceTypes.length < 4) {
        searchQuery = searchQuery.in("source_type", sourceTypes);
      }

      const { data, error } = await searchQuery;

      if (error) throw error;

      return data || [];
    } finally {
      setIsSearching(false);
    }
  }, [debouncedSearchTerm, sourceTypes]);

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: debouncedSearchTerm.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  return {
    ...query,
    isSearching: isSearching || query.isLoading,
  };
}

// Infinite scroll for mentions
export function useInfiniteMentions(
  sourceTypes?: string[],
  pageSize: number = 20
) {
  const queryClient = useQueryClient();

  const queryFn = useCallback(async ({ pageParam = 0 }): Promise<PaginatedResponse<Mention>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let mentionsQuery = supabase
      .from("mentions")
      .select("*", { count: 'exact' })
      .eq('user_id', user.id)
      .order("published_at", { ascending: false })
      .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

    if (sourceTypes && sourceTypes.length > 0 && sourceTypes.length < 4) {
      mentionsQuery = mentionsQuery.in("source_type", sourceTypes);
    }

    const { data, count, error } = await mentionsQuery;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
    };
  }, [sourceTypes, pageSize]);

  return useInfiniteQuery({
    queryKey: ['mentions-infinite', sourceTypes, pageSize],
    queryFn,
    getNextPageParam: (lastPage, pages) => {
      const totalLoaded = pages.reduce((acc, page) => acc + page.data.length, 0);
      return totalLoaded < lastPage.count ? pages.length : undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Optimized analytics data query
export function useAnalyticsData(
  period: string,
  startDate?: Date,
  endDate?: Date,
  sourceTypes?: string[]
) {
  const queryKey = useMemo(
    () => ['analytics', period, startDate, endDate, sourceTypes],
    [period, startDate, endDate, sourceTypes]
  );

  const queryFn = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const days = parseInt(period);
    const isCustom = Boolean(startDate && endDate);
    const rangeStart = isCustom 
      ? startDate! 
      : (() => { const d = new Date(); d.setDate(d.getDate() - days); return d; })();
    const rangeEnd = isCustom ? endDate! : new Date();

    let baseQuery = supabase
      .from('mentions')
      .select('published_at, sentiment, source_name', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('published_at', rangeStart.toISOString())
      .lte('published_at', rangeEnd.toISOString())
      .order('published_at');

    if (sourceTypes && sourceTypes.length > 0 && sourceTypes.length < 4) {
      baseQuery = baseQuery.in('source_type', sourceTypes);
    }

    // Get count first
    const { count, error: countError } = await baseQuery;
    if (countError) throw countError;

    if (!count) {
      return { chartData: [], sourceData: [] };
    }

    // Fetch data in chunks for large datasets
    const chunkSize = 1000;
    const chunks = Math.ceil(count / chunkSize);
    let allData: any[] = [];

    for (let i = 0; i < chunks; i++) {
      const { data: chunkData, error: fetchError } = await baseQuery
        .range(i * chunkSize, (i + 1) * chunkSize - 1);
      
      if (fetchError) throw fetchError;
      if (chunkData) {
        allData = [...allData, ...chunkData];
      }
    }

    // Process data
    const dailyData = new Map<string, { positive: number; negative: number; neutral: number; total: number }>();
    const sourceCount = new Map<string, number>();

    allData.forEach((mention) => {
      const date = new Date(mention.published_at);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { positive: 0, negative: 0, neutral: 0, total: 0 });
      }
      
      const dayData = dailyData.get(dateKey)!;
      dayData.total++;
      
      if (mention.sentiment !== null && mention.sentiment !== -1) {
        if (mention.sentiment >= 51) dayData.positive++;
        else if (mention.sentiment <= 49) dayData.negative++;
        else dayData.neutral++;
      }
      
      sourceCount.set(mention.source_name, (sourceCount.get(mention.source_name) || 0) + 1);
    });

    const chartData = Array.from(dailyData.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const sourceData = Array.from(sourceCount.entries())
      .map(([source, count]) => ({
        source,
        count,
        percentage: (count / allData.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { chartData, sourceData };
  }, [period, startDate, endDate, sourceTypes]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// Cache invalidation utilities
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  const invalidateMentions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mentions'] });
    queryClient.invalidateQueries({ queryKey: ['mentions-stats'] });
    queryClient.invalidateQueries({ queryKey: ['mentions-search'] });
    queryClient.invalidateQueries({ queryKey: ['mentions-infinite'] });
  }, [queryClient]);

  const invalidateAnalytics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return {
    invalidateMentions,
    invalidateAnalytics,
    invalidateAll,
  };
}
