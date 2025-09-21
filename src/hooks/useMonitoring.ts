import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { 
  MonitoringMetrics, 
  EdgeFunctionLog, 
  UserFetchLog, 
  MonitoringState,
  SourceStats,
  ApiUsageData,
  LogEntry
} from '../types/monitoring';

interface UseMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useMonitoring = (options: UseMonitoringOptions = {}) => {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  
  const [state, setState] = useState<MonitoringState>({
    metrics: {
      totalMentions: 0,
      totalApiCalls: 0,
      totalNotifications: 0,
      totalEdgeFunctionCalls: 0,
      apiUsageBySource: {},
      apiUsageData: {},
      lastUpdated: '',
      isLoading: false,
      error: null
    },
    edgeFunctionLogs: [],
    userLogs: [],
    selectedUser: '',
    searchEmail: '',
    showFunctionDetails: false,
    selectedFunction: null,
    autoRefresh,
    lastRefresh: ''
  });

  // Parse source stats from log string
  const parseSourceStats = useCallback((log: string): SourceStats => {
    const stats: SourceStats = {
      google_alerts: 0,
      youtube: 0,
      reddit: 0,
      x: 0,
      rss_news: 0
    };

    if (!log) return stats;

    // Parse patterns like "20 Google Alerts", "5 YouTube", etc.
    const googleMatch = log.match(/(\d+)\s+Google\s+Alerts?/i);
    if (googleMatch) stats.google_alerts = parseInt(googleMatch[1]);

    const youtubeMatch = log.match(/(\d+)\s+YouTube/i);
    if (youtubeMatch) stats.youtube = parseInt(youtubeMatch[1]);

    const redditMatch = log.match(/(\d+)\s+Reddit/i);
    if (redditMatch) stats.reddit = parseInt(redditMatch[1]);

    const xMatch = log.match(/(\d+)\s+X/i);
    if (xMatch) stats.x = parseInt(xMatch[1]);

    const rssMatch = log.match(/(\d+)\s+RSS/i);
    if (rssMatch) stats.rss_news = parseInt(rssMatch[1]);

    return stats;
  }, []);

  // Fetch metrics data
  const fetchMetrics = useCallback(async (): Promise<void> => {
    setState(prev => ({
      ...prev,
      metrics: { ...prev.metrics, isLoading: true, error: null }
    }));

    try {
      // Fetch mentions count with proper counting
      const { count: mentionsCount, error: mentionsError } = await supabase
        .from('mentions')
        .select('*', { count: 'exact', head: true });

      if (mentionsError) throw mentionsError;

      // Fetch notifications count
      const { count: notificationsCount, error: notificationsError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      if (notificationsError) {
        console.warn('Failed to fetch notifications count:', notificationsError);
      }

      // Fetch API usage by source from fetch_logs
      const { data: fetchLogs, error: logsError } = await supabase
        .from('fetch_logs')
        .select('source_stats')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (logsError) throw logsError;

      const sourceStats: Record<string, number> = {};
      fetchLogs?.forEach(log => {
        const stats = parseSourceStats(log.source_stats || '');
        Object.entries(stats).forEach(([source, count]) => {
          sourceStats[source] = (sourceStats[source] || 0) + count;
        });
      });

      // Fetch real API usage data from api_usage_tracking table
      const { data: apiUsageData, error: apiUsageError } = await supabase
        .from('api_usage_tracking')
        .select('api_source, calls_count, response_status')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (apiUsageError) {
        console.warn('Error fetching API usage data:', apiUsageError);
      }

      // Process API usage data
      const processedApiUsage: Record<string, ApiUsageData> = {};

      apiUsageData?.forEach(record => {
        const source = record.api_source;
        if (!processedApiUsage[source]) {
          processedApiUsage[source] = {
            totalCalls: 0,
            errorCalls: 0,
            successCalls: 0,
            errorRate: 0
          };
        }
        
        processedApiUsage[source].totalCalls += record.calls_count;
        
        if (record.response_status && record.response_status >= 400) {
          processedApiUsage[source].errorCalls += record.calls_count;
        } else {
          processedApiUsage[source].successCalls += record.calls_count;
        }
      });

      // Calculate error rates
      Object.keys(processedApiUsage).forEach(source => {
        const data = processedApiUsage[source];
        data.errorRate = data.totalCalls > 0 ? (data.errorCalls / data.totalCalls) * 100 : 0;
      });

      const now = new Date().toISOString();
      
      setState(prev => ({
        ...prev,
        metrics: {
          totalMentions: mentionsCount || 0,
          totalApiCalls: Object.values(sourceStats).reduce((sum, count) => sum + count, 0),
          totalNotifications: notificationsCount || 0,
          totalEdgeFunctionCalls: prev.metrics.totalEdgeFunctionCalls, // Will be updated by fetchEdgeFunctionMetrics
          apiUsageBySource: sourceStats,
          apiUsageData: processedApiUsage,
          lastUpdated: now,
          isLoading: false,
          error: null
        },
        lastRefresh: now
      }));

    } catch (error) {
      console.error('Error fetching metrics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch monitoring metrics';
      
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          isLoading: false,
          error: errorMessage
        }
      }));
      
      toast.error(errorMessage);
    }
  }, [parseSourceStats]);

  // Fetch edge function metrics
  const fetchEdgeFunctionMetrics = useCallback(async (): Promise<void> => {
    try {
      const { data: automationLogs, error } = await supabase
        .from('automation_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching automation logs:', error);
        setState(prev => ({
          ...prev,
          edgeFunctionLogs: []
        }));
        return;
      }

      // Process automation logs to create function metrics
      const functionMetrics: Record<string, EdgeFunctionLog> = {};
      
      automationLogs?.forEach(log => {
        const functionName = log.function_name || 'unknown';
        
        if (!functionMetrics[functionName]) {
          functionMetrics[functionName] = {
            function_name: functionName,
            calls_today: 0,
            errors_today: 0,
            avg_duration: 0,
            last_call: log.created_at,
            description: log.description || 'Automated function',
            status: 'active',
            max_concurrent: 5,
            timeout_seconds: 300,
            recent_logs: [],
            recent_errors: []
          };
        }
        
        functionMetrics[functionName].calls_today++;
        if (log.level === 'error') {
          functionMetrics[functionName].errors_today++;
          functionMetrics[functionName].recent_errors?.push({
            timestamp: log.created_at,
            message: log.message,
            level: log.level
          });
        } else {
          functionMetrics[functionName].recent_logs?.push({
            timestamp: log.created_at,
            message: log.message,
            level: log.level
          });
        }
        
        // Keep only last 5 logs/errors
        if (functionMetrics[functionName].recent_logs && functionMetrics[functionName].recent_logs.length > 5) {
          functionMetrics[functionName].recent_logs = functionMetrics[functionName].recent_logs!.slice(0, 5);
        }
        if (functionMetrics[functionName].recent_errors && functionMetrics[functionName].recent_errors.length > 5) {
          functionMetrics[functionName].recent_errors = functionMetrics[functionName].recent_errors!.slice(0, 5);
        }
      });

      const edgeFunctionLogs = Object.values(functionMetrics);
      
      // Update total edge function calls in metrics
      const totalEdgeFunctionCalls = edgeFunctionLogs.reduce((sum, fn) => sum + fn.calls_today, 0);
      
      setState(prev => ({
        ...prev,
        edgeFunctionLogs,
        metrics: {
          ...prev.metrics,
          totalEdgeFunctionCalls
        }
      }));
      
    } catch (error) {
      console.error('Error fetching edge function metrics:', error);
      setState(prev => ({
        ...prev,
        edgeFunctionLogs: []
      }));
    }
  }, []);

  // Fetch user fetch logs
  const fetchUserFetchLogs = useCallback(async (userId: string): Promise<void> => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('fetch_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const logs: UserFetchLog[] = data?.map(log => {
        let status: UserFetchLog['status'] = 'completed';
        if (!log.completed_at) status = 'running';
        else if (log.failed_keywords > 0) status = 'partial';
        else if (log.error_message) status = 'failed';

        return {
          id: log.id,
          user_name: log.user_name || 'Unknown User',
          started_at: log.created_at,
          completed_at: log.completed_at,
          total_keywords: log.total_keywords || 0,
          failed_keywords: log.failed_keywords || 0,
          sources: log.sources || [],
          mentions_found: log.mentions_found || 0,
          error_message: log.error_message,
          status
        };
      }) || [];

      setState(prev => ({
        ...prev,
        userLogs: logs
      }));
    } catch (error) {
      console.error('Error fetching user logs:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user logs';
      toast.error(errorMessage);
    }
  }, []);

  // Search user by email/name
  const searchUserByEmail = useCallback(async (searchTerm: string): Promise<void> => {
    if (!searchTerm.trim()) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setState(prev => ({
          ...prev,
          selectedUser: data.user_id,
          searchEmail: searchTerm
        }));
        toast.success(`Found user: ${data.full_name}`);
        await fetchUserFetchLogs(data.user_id);
      }
    } catch (error) {
      toast.error('User not found');
    }
  }, [fetchUserFetchLogs]);

  // Refresh all data
  const refreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([
      fetchMetrics(),
      fetchEdgeFunctionMetrics()
    ]);
  }, [fetchMetrics, fetchEdgeFunctionMetrics]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshAll, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAll]);

  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Computed values
  const computedValues = useMemo(() => {
    const totalErrors = Object.values(state.metrics.apiUsageData)
      .reduce((sum, data) => sum + data.errorCalls, 0);
    
    const averageErrorRate = state.metrics.totalApiCalls > 0 
      ? (totalErrors / state.metrics.totalApiCalls) * 100 
      : 0;

    const systemHealth = averageErrorRate < 5 ? 'healthy' : 
                        averageErrorRate < 10 ? 'warning' : 'critical';

    return {
      totalErrors,
      averageErrorRate,
      systemHealth,
      hasActiveFunctions: state.edgeFunctionLogs.some(fn => fn.status === 'active'),
      totalActiveUsers: new Set(state.userLogs.map(log => log.user_name)).size
    };
  }, [state.metrics, state.edgeFunctionLogs, state.userLogs]);

  return {
    ...state,
    fetchMetrics,
    fetchEdgeFunctionMetrics,
    fetchUserFetchLogs,
    searchUserByEmail,
    refreshAll,
    parseSourceStats,
    ...computedValues,
    // Actions
    setSelectedUser: (userId: string) => setState(prev => ({ ...prev, selectedUser: userId })),
    setSearchEmail: (email: string) => setState(prev => ({ ...prev, searchEmail: email })),
    setShowFunctionDetails: (show: boolean) => setState(prev => ({ ...prev, showFunctionDetails: show })),
    setSelectedFunction: (func: EdgeFunctionLog | null) => setState(prev => ({ ...prev, selectedFunction: func })),
    setAutoRefresh: (enabled: boolean) => setState(prev => ({ ...prev, autoRefresh: enabled })),
    clearSelectedUser: () => setState(prev => ({ ...prev, selectedUser: '', searchEmail: '', userLogs: [] }))
  };
};
