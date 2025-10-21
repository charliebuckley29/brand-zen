import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { createApiUrl, apiFetch } from '@/lib/api';

export interface QueueEntry {
  id: string;
  user_id: string;
  api_source: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority_score: number;
  queued_at: string;
  last_served_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QueueSummary {
  total: number;
  byStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  byApiSource: Record<string, {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    averagePriority: number;
  }>;
  averagePriorityScore: number;
  oldestPendingEntry?: {
    id: string;
    user_id: string;
    api_source: string;
    queued_at: string;
    priority_score: number;
  };
  newestEntry?: {
    id: string;
    user_id: string;
    api_source: string;
    status: string;
    created_at: string;
  };
}

export interface QueueMonitoringData {
  entries: QueueEntry[];
  summary: QueueSummary;
  timestamp: string;
}

export interface UseQueueMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useQueueMonitoring(options: UseQueueMonitoringOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  
  const [queueData, setQueueData] = useState<QueueMonitoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchQueueStatus = useCallback(async (apiSource?: string) => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = '/admin/queue-status?limit=100';
      if (apiSource) {
        endpoint += `&api_source=${apiSource}`;
      }

      const response = await apiFetch(endpoint);
      const result = await response.json();
      
      if (result.success) {
        setQueueData(result.data);
        setLastRefresh(new Date());
      } else {
        throw new Error(result.error || 'Failed to fetch queue status');
      }
    } catch (err: any) {
      console.error('Error fetching queue status:', err);
      setError('Queue undergoing maintenance - please try again shortly');
      toast.error('Queue undergoing maintenance - please try again shortly');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshQueueStatus = useCallback(() => {
    fetchQueueStatus();
  }, [fetchQueueStatus]);

  const resetAllQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(createApiUrl('/debug/reset-failed-queue'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to reset all queues: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Successfully reset ${result.resetCount} failed queue entries across all APIs`);
        // Refresh the queue status after reset
        await fetchQueueStatus();
      } else {
        throw new Error(result.error || 'Failed to reset all queues');
      }
    } catch (err: any) {
      console.error('Error resetting all queues:', err);
      setError('Queue undergoing maintenance - please try again shortly');
      toast.error('Queue undergoing maintenance - please try again shortly');
    } finally {
      setLoading(false);
    }
  }, [fetchQueueStatus]);

  const resetQueueByApiSource = useCallback(async (apiSource: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(createApiUrl(`/debug/reset-failed-queue?api_source=${apiSource}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to reset ${apiSource} queue: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Successfully reset ${result.resetCount} failed entries in ${apiSource} queue`);
        // Refresh the queue status after reset
        await fetchQueueStatus();
      } else {
        throw new Error(result.error || `Failed to reset ${apiSource} queue`);
      }
    } catch (err: any) {
      console.error(`Error resetting ${apiSource} queue:`, err);
      setError('Queue undergoing maintenance - please try again shortly');
      toast.error('Queue undergoing maintenance - please try again shortly');
    } finally {
      setLoading(false);
    }
  }, [fetchQueueStatus]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchQueueStatus();
      }, refreshInterval);

      // Initial fetch
      fetchQueueStatus();

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchQueueStatus]);

  // Helper functions
  const getQueueStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getQueueStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getApiSourceDisplayName = (apiSource: string): string => {
    const displayNames: Record<string, string> = {
      'youtube': 'YouTube',
      'reddit': 'Reddit',
      'x': 'X (Twitter)',
      'google_alert': 'Google Alerts',
      'rss_news': 'RSS News'
    };
    return displayNames[apiSource] || apiSource;
  };

  const getApiSourceIcon = (apiSource: string) => {
    switch (apiSource) {
      case 'youtube': return '🎥';
      case 'reddit': return '🔴';
      case 'x': return '🐦';
      case 'google_alert': return '🔍';
      case 'rss_news': return '📰';
      default: return '🔗';
    }
  };

  return {
    queueData,
    loading,
    error,
    lastRefresh,
    fetchQueueStatus,
    refreshQueueStatus,
    resetAllQueues,
    resetQueueByApiSource,
    getQueueStatusColor,
    getQueueStatusText,
    formatTimeAgo,
    getApiSourceDisplayName,
    getApiSourceIcon
  };
}
