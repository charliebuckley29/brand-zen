import { config } from "@/config/environment";

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
  SYSTEM_STATUS: '/api/system/status',
  
  // Debug endpoints
  DETAILED_FETCH_LOGS: '/api/debug/detailed-fetch-logs',
  EMAIL_DIAGNOSIS: '/api/debug/email-diagnosis',
  TEST_NEGATIVE_EMAIL: '/api/debug/test-negative-email',
  
  // User endpoints
  USER_QUEUE_HISTORY: '/api/user/queue-history',
  USER_QUEUE_STATUS: '/api/user/queue-status',
} as const;

/**
 * Fetch with error handling
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = createApiUrl(endpoint);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
