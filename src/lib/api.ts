import { config } from "@/config/environment";
import { supabase } from "@/integrations/supabase/client";

/**
 * Get the backend API base URL
 */
export function getBackendUrl(): string {
  return config.api.backendUrl;
}

/**
 * Create a full API endpoint URL
 */
export function createApiUrl(endpoint: string): string {
  const baseUrl = getBackendUrl();
  // Ensure endpoint starts with /api
  if (endpoint.startsWith('/api/')) {
    return `${baseUrl}${endpoint}`;
  } else {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}/api${normalizedEndpoint}`;
  }
}

/**
 * Get authentication headers for API requests
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  return headers;
}

/**
 * Common API endpoints
 */
export const API_ENDPOINTS = {
  // Admin endpoints
  QUEUE_STATUS: '/api/admin/queue-status',
  QUEUE_HEALTH: '/api/admin/queue-health',
  QUEUE_MAINTENANCE: '/api/admin/queue-maintenance',
  QUEUE_MONITOR: '/api/admin/queue-monitor',
  QUEUE_DASHBOARD: '/api/admin/queue-dashboard',
  SYSTEM_HEALTH: '/api/admin/system-health',
  USER_QUOTA_MANAGEMENT: '/api/admin/user-quota-management',
  RESEND_EMAIL_CONFIRMATION: '/api/admin/resend-email-confirmation',
  SEND_PASSWORD_RESET: '/api/admin/send-password-reset',
  DELETE_USER: '/api/admin/delete-user',
  SYSTEM_STATUS: '/api/system/status',
  
  // Debug endpoints
        DETAILED_FETCH_LOGS: '/api/admin/detailed-fetch-logs',
  EMAIL_DIAGNOSIS: '/api/debug/email-diagnosis',
  TEST_NEGATIVE_EMAIL: '/api/debug/test-negative-email',
  
  // User endpoints
  USER_QUEUE_HISTORY: '/api/user/queue-history',
  USER_QUEUE_STATUS: '/api/user/queue-status',
} as const;

/**
 * Fetch with error handling and authentication
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = createApiUrl(endpoint);
  
  try {
    // Get authentication headers
    const authHeaders = await getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error);
    throw error;
  }
}
