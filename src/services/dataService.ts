/**
 * Data Service Layer
 * 
 * Centralized service for all data operations with Supabase. This service
 * provides a clean abstraction over database operations and handles:
 * - Data fetching with proper error handling
 * - Type-safe API calls
 * - Consistent error logging
 * - Query optimization and caching integration
 * - Performance monitoring for all operations
 * 
 * All functions are designed to work seamlessly with React Query for
 * automatic caching, background updates, and optimistic updates.
 * 
 * @author Brand Zen Team
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { Mention, Notification, UserType } from '@/types';
import { logger } from '@/lib/logger';
import { usePerformanceMonitor } from '@/store/performanceStore';

/**
 * DataService Class
 * 
 * Singleton class that provides centralized data operations for the entire
 * application. Uses the singleton pattern to ensure consistent state and
 * performance monitoring across all data operations.
 * 
 * Key features:
 * - Singleton pattern for consistent state
 * - Performance monitoring for all operations
 * - Type-safe database operations
 * - Comprehensive error handling
 * - Real-time subscriptions support
 */
export class DataService {
  private static instance: DataService;
  private performanceMonitor = usePerformanceMonitor.getState();

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // ========================================
  // MENTIONS OPERATIONS
  // ========================================

  /**
   * Fetch mentions with pagination and filtering
   * 
   * Retrieves mentions for the authenticated user with support for:
   * - Pagination (page-based)
   * - Source type filtering
   * - Sentiment filtering (including null/unknown values)
   * - Flagged status filtering
   * - Escalation type filtering
   * - Date range filtering
   * 
   * @param page - Page number (1-based)
   * @param pageSize - Number of items per page
   * @param sourceTypes - Array of source types to filter by
   * @param filters - Optional filters for sentiment, flagged status, etc.
   * @returns Promise with paginated mentions data and total count
   */
  async getMentions(
    page: number = 1,
    pageSize: number = 10,
    sourceTypes: string[] = [],
    filters?: {
      sentiment?: number[];
      flagged?: boolean;
      escalationType?: string[];
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<{ data: Mention[]; count: number }> {
    return this.performanceMonitor.measure('getMentions', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from("mentions")
        .select("*", { count: 'exact' })
        .eq('user_id', user.id)
        .order('published_at', { ascending: false });

      // Apply source type filter
      if (sourceTypes.length > 0) {
        query = query.in('source_type', sourceTypes);
      }

      // Apply sentiment filter
      if (filters?.sentiment) {
        if (filters.sentiment.includes(-1)) {
          // Include null and -1 values
          query = query.or('sentiment.is.null,sentiment.eq.-1');
        } else {
          query = query.in('sentiment', filters.sentiment);
        }
      }

      // Apply flagged filter
      if (filters?.flagged !== undefined) {
        query = query.eq('flagged', filters.flagged);
      }

      // Apply escalation type filter
      if (filters?.escalationType && filters.escalationType.length > 0) {
        query = query.in('escalation_type', filters.escalationType);
      }

      // Apply date range filter
      if (filters?.dateFrom) {
        query = query.gte('published_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('published_at', filters.dateTo);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return { data: data || [], count: count || 0 };
    }, { page, pageSize, sourceTypes, filters });
  }

  async getMentionById(id: string): Promise<Mention | null> {
    return this.performanceMonitor.measure('getMentionById', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("mentions")
        .select("*")
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    }, { id });
  }

  async updateMention(id: string, updates: Partial<Mention>): Promise<Mention> {
    return this.performanceMonitor.measure('updateMention', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("mentions")
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, { id, updates });
  }

  async flagMention(id: string, flagged: boolean): Promise<void> {
    return this.performanceMonitor.measure('flagMention', async () => {
      await this.updateMention(id, { flagged });
    }, { id, flagged });
  }

  async escalateMention(id: string, escalationType: 'pr' | 'legal' | 'crisis'): Promise<void> {
    return this.performanceMonitor.measure('escalateMention', async () => {
      const updates: Partial<Mention> = { escalation_type: escalationType };
      
      if (escalationType === 'pr') {
        updates.pr_escalated_at = new Date().toISOString();
      } else if (escalationType === 'legal') {
        updates.legal_escalated_at = new Date().toISOString();
      }
      
      await this.updateMention(id, updates);
    }, { id, escalationType });
  }

  // Notifications operations
  async getNotifications(limit: number = 100): Promise<Notification[]> {
    return this.performanceMonitor.measure('getNotifications', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    }, { limit });
  }

  async markNotificationAsRead(id: string): Promise<void> {
    return this.performanceMonitor.measure('markNotificationAsRead', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    }, { id });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    return this.performanceMonitor.measure('markAllNotificationsAsRead', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    });
  }

  // User operations
  async getUserProfile(): Promise<any> {
    return this.performanceMonitor.measure('getUserProfile', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    });
  }

  async updateUserProfile(updates: any): Promise<any> {
    return this.performanceMonitor.measure('updateUserProfile', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, { updates });
  }

  // Keywords operations
  async getKeywords(): Promise<any[]> {
    return this.performanceMonitor.measure('getKeywords', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("keywords")
        .select("*")
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    });
  }

  async addKeyword(keyword: string, brandName: string): Promise<any> {
    return this.performanceMonitor.measure('addKeyword', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("keywords")
        .insert({
          user_id: user.id,
          keyword,
          brand_name: brandName,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }, { keyword, brandName });
  }

  async updateKeyword(id: string, updates: any): Promise<any> {
    return this.performanceMonitor.measure('updateKeyword', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("keywords")
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, { id, updates });
  }

  async deleteKeyword(id: string): Promise<void> {
    return this.performanceMonitor.measure('deleteKeyword', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from("keywords")
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    }, { id });
  }

  // Source preferences operations
  async getSourcePreferences(): Promise<any[]> {
    return this.performanceMonitor.measure('getSourcePreferences', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("source_preferences")
        .select("*")
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    });
  }

  async updateSourcePreference(sourceType: string, enabled: boolean): Promise<any> {
    return this.performanceMonitor.measure('updateSourcePreference', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("source_preferences")
        .upsert({
          user_id: user.id,
          source_type: sourceType,
          enabled
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }, { sourceType, enabled });
  }

  // Analytics operations
  async getAnalyticsData(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<any> {
    return this.performanceMonitor.measure('getAnalyticsData', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: mentions, error } = await supabase
        .from("mentions")
        .select("*")
        .eq('user_id', user.id)
        .gte('published_at', startDate.toISOString())
        .order('published_at', { ascending: false });

      if (error) throw error;

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
  }

  // Search operations
  async searchMentions(
    searchTerm: string,
    sourceTypes: string[] = [],
    limit: number = 50
  ): Promise<Mention[]> {
    return this.performanceMonitor.measure('searchMentions', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from("mentions")
        .select("*")
        .eq('user_id', user.id)
        .or(`content_snippet.ilike.%${searchTerm}%,full_text.ilike.%${searchTerm}%`)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (sourceTypes.length > 0) {
        query = query.in('source_type', sourceTypes);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, { searchTerm, sourceTypes, limit });
  }

  // Batch operations
  async batchUpdateMentions(updates: Array<{ id: string; updates: Partial<Mention> }>): Promise<void> {
    return this.performanceMonitor.measure('batchUpdateMentions', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const promises = updates.map(({ id, updates }) =>
        supabase
          .from("mentions")
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id)
      );

      const results = await Promise.allSettled(promises);
      
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);

      if (errors.length > 0) {
        logger.error('Batch update errors:', errors);
        throw new Error(`Failed to update ${errors.length} mentions`);
      }
    }, { updateCount: updates.length });
  }

  // Real-time subscriptions
  subscribeToMentions(
    userId: string,
    callback: (mention: Mention) => void
  ): () => void {
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
  }

  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ): () => void {
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
  }
}

// Export singleton instance
export const dataService = DataService.getInstance();
