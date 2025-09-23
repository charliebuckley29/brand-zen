// Production-ready type definitions for monitoring system

export interface SourceStats {
  google_alerts: number;
  youtube: number;
  reddit: number;
  x: number;
  rss_news: number;
}

export interface ApiLimit {
  name: string;
  free: number;
  paid: number;
  unit: string;
  description: string;
  warningThreshold: number;
}

export interface ApiUsageData {
  totalCalls: number;
  errorCalls: number;
  successCalls: number;
  errorRate: number;
}

export interface MonitoringMetrics {
  totalMentions: number;
  totalApiCalls: number;
  totalNotifications: number;
  totalEdgeFunctionCalls: number;
  apiUsageBySource: Record<string, number>;
  apiUsageData: Record<string, ApiUsageData>;
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
}

export interface EdgeFunctionLog {
  function_name: string;
  calls_today: number;
  errors_today: number;
  avg_duration: number;
  last_call: string;
  description: string;
  status: 'active' | 'inactive';
  max_concurrent: number;
  timeout_seconds: number;
  recent_logs?: LogEntry[];
  recent_errors?: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: string;
}

export interface UserFetchLog {
  id: string;
  user_name: string;
  started_at: string;
  completed_at: string | null;
  total_keywords: number;
  failed_keywords: number;
  sources: string[];
  mentions_found: number;
  error_message?: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
}

export interface MonitoringState {
  metrics: MonitoringMetrics;
  edgeFunctionLogs: EdgeFunctionLog[];
  userLogs: UserFetchLog[];
  selectedUser: string;
  searchEmail: string;
  showFunctionDetails: boolean;
  selectedFunction: EdgeFunctionLog | null;
  autoRefresh: boolean;
  lastRefresh: string;
}

export interface MonitoringFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  sources: string[];
  status: string[];
  searchQuery: string;
}

export interface AlertThreshold {
  apiUsage: number; // percentage
  errorRate: number; // percentage
  responseTime: number; // milliseconds
  functionFailures: number; // count per hour
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
  autoResolved: boolean;
}

export interface MonitoringConfig {
  refreshInterval: number; // milliseconds
  alertThresholds: AlertThreshold;
  maxRetries: number;
  cacheTimeout: number; // milliseconds
  enableRealTime: boolean;
}

