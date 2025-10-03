// Core domain types
export interface Mention {
  id: string;
  source_name: string;
  source_url: string;
  source_type: string;
  published_at: string;
  content_snippet: string;
  full_text: string | null;
  cleaned_text: string | null; // Clean, readable version of the content
  sentiment: number | null; // -1 = unknown, 0 = strongly negative, 100 = strongly positive
  topics: string[];
  flagged: boolean;
  escalation_type: string;
  internal_notes: string | null;
  legal_escalated_at: string | null;
  pr_escalated_at: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

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

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  user_type: UserType;
  created_at: string;
  fetch_frequency_minutes: number;
}

export type UserType = 'admin' | 'moderator' | 'legal_user' | 'pr_user' | 'basic_user';

export interface SocialMediaLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

export interface BrandInformation {
  brand_website?: string | null;
  brand_description?: string | null;
  social_media_links?: SocialMediaLinks;
}

export interface ProfileData {
  full_name: string | null;
  phone_number: string | null;
  pr_team_email: string | null;
  legal_team_email: string | null;
  timezone?: string;
  brand_website?: string | null;
  brand_description?: string | null;
  social_media_links?: SocialMediaLinks;
  notification_preferences?: {
    email?: {
      enabled: boolean;
      frequency: 'immediate' | 'daily' | 'weekly';
    };
    // SMS/WhatsApp will be implemented later
    // sms?: boolean;
    // whatsapp?: boolean;
  };
}

// API and data fetching types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

export interface MentionData {
  source_name: string;
  source_url: string;
  published_at: string;
  content_snippet: string;
  full_text?: string;
  sentiment?: number;
  topics?: string[];
  flagged?: boolean;
  escalation_type?: 'none' | 'pr' | 'legal' | 'crisis';
  internal_notes?: string;
}

// UI and component types
export interface ChartData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export interface SourceData {
  source: string;
  count: number;
  percentage: number;
}

export interface Report {
  id: string;
  title: string;
  period: string;
  total_mentions: number;
  positive_mentions: number;
  negative_mentions: number;
  neutral_mentions: number;
  top_sources: SourceData[];
  created_at: string;
}

// Configuration types
export type SourceType = 'rss_news' | 'google_alerts' | 'youtube' | 'reddit' | 'x';

export type SourceCategory = 'news' | 'social' | 'web' | 'video';

export interface SourceConfig {
  id: SourceType;
  name: string;
  category: SourceCategory;
  description: string;
  enabled: boolean;
  icon: string;
  color: string;
  limits: {
    free: number;
    paid: number;
    unit: string;
  };
}

export interface SourceCategoryConfig {
  id: SourceCategory;
  name: string;
  sources: SourceConfig[];
}

// Error handling types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Form types
export interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  browser_info: string;
  console_logs: string;
  screenshots: string[];
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface BugComment {
  id: string;
  bug_report_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Monitoring and analytics types
export interface MonitoringMetrics {
  totalMentions: number;
  totalUsers: number;
  totalApiCalls: number;
  totalEdgeFunctionCalls: number;
  totalNotifications: number;
  apiUsageBySource: Record<string, number>;
  weeklyGrowth: number;
  errorRate: number;
}

export interface UserFetchLog {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  fetch_type: 'manual' | 'automated';
  status: 'running' | 'completed' | 'failed';
  mentions_found: number;
  error_message: string | null;
  duration_seconds: number | null;
}

export interface EdgeFunctionLog {
  id: string;
  function_name: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  duration_ms: number | null;
  error_message: string | null;
  logs: Array<{
    timestamp: string;
    message: string;
    level: string;
  }>;
}

// Navigation and routing types
export interface NavigationContextType {
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedMentionId: string | null;
  setSelectedMentionId: (id: string | null) => void;
  navigateToMention: (mentionId: string) => void;
  clearSelectedMention: () => void;
}

// Settings and preferences types
export interface UserFetchStatus {
  canFetch: boolean;
  minutesUntilNextFetch: number;
  frequency: number;
  lastFetchTime: string | null;
  loading: boolean;
  automationEnabled: boolean;
  updateAutomationEnabled: (enabled: boolean) => Promise<void>;
}

export interface PrefRecord {
  id: string;
  user_id: string;
  source_type: SourceType;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface TableProps<T> extends BaseComponentProps {
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRowClick?: (item: T) => void;
}

// API response types
export interface ApiResponse<T = any> {
  data: T;
  error: null;
  status: number;
  statusText: string;
}

export interface ApiErrorResponse {
  data: null;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  status: number;
  statusText: string;
}
