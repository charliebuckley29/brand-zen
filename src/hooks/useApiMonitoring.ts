import { useState, useEffect } from "react";
import { createApiUrl } from "../lib/api";
import { DashboardData } from "../types/api-monitoring";

export function useApiMonitoring() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const response = await fetch(createApiUrl('/admin/api-source-dashboard'));
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        console.error('Failed to fetch dashboard data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchDashboardData(), 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    dashboardData,
    loading,
    refreshing,
    refetch: fetchDashboardData
  };
}

