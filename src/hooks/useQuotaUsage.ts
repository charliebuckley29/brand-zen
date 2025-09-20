import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuotaStatus } from '@/components/QuotaDisplay';

export function useQuotaUsage() {
  const [quotaData, setQuotaData] = useState<QuotaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotaData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const response = await fetch(`/api/user/quota-usage?user_id=${user.id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch quota data');
      }

      if (result.success && result.data) {
        setQuotaData(result.data);
      } else {
        setError('No quota data available');
      }
    } catch (err: any) {
      console.error('Error fetching quota data:', err);
      setError(err.message || 'Failed to fetch quota data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshQuotaData = useCallback(() => {
    return fetchQuotaData();
  }, [fetchQuotaData]);

  useEffect(() => {
    fetchQuotaData();
  }, [fetchQuotaData]);

  // Get quota status for a specific source
  const getQuotaStatus = useCallback((sourceType: string): QuotaStatus | null => {
    return quotaData.find(q => q.source_type === sourceType) || null;
  }, [quotaData]);

  // Check if user can fetch from a specific source
  const canFetchFromSource = useCallback((sourceType: string): boolean => {
    const status = getQuotaStatus(sourceType);
    return status ? status.can_fetch : true; // Default to true if no data
  }, [getQuotaStatus]);

  // Get total usage across all sources
  const getTotalUsage = useCallback(() => {
    return quotaData.reduce((total, quota) => total + quota.current_usage, 0);
  }, [quotaData]);

  // Get total limits across all sources
  const getTotalLimits = useCallback(() => {
    return quotaData.reduce((total, quota) => total + quota.monthly_limit, 0);
  }, [quotaData]);

  // Get overall usage percentage
  const getOverallUsagePercentage = useCallback(() => {
    const totalUsage = getTotalUsage();
    const totalLimits = getTotalLimits();
    return totalLimits > 0 ? (totalUsage / totalLimits) * 100 : 0;
  }, [getTotalUsage, getTotalLimits]);

  // Get sources that are near or at limit
  const getSourcesNearLimit = useCallback(() => {
    return quotaData.filter(quota => quota.usage_percentage >= 75);
  }, [quotaData]);

  // Get sources that have exceeded quota
  const getSourcesExceeded = useCallback(() => {
    return quotaData.filter(quota => !quota.can_fetch);
  }, [quotaData]);

  return {
    quotaData,
    loading,
    error,
    refreshQuotaData,
    getQuotaStatus,
    canFetchFromSource,
    getTotalUsage,
    getTotalLimits,
    getOverallUsagePercentage,
    getSourcesNearLimit,
    getSourcesExceeded
  };
}
