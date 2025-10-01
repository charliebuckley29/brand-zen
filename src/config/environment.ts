// Environment configuration for production readiness
export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://brandprotected.com/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Performance Configuration
  performance: {
    // Query client configuration
    queryClient: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },

    // Pagination defaults
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 100,
      pageSizeOptions: [10, 25, 50, 100],
    },

    // Virtual scrolling
    virtualScroll: {
      itemHeight: 60,
      overscan: 5,
    },

    // Debounce delays
    debounce: {
      search: 300,
      resize: 100,
      scroll: 16, // ~60fps
    },
  },

  // Feature Flags
  features: {
    enableVirtualScrolling: true,
    enableInfiniteScroll: true,
    enableSearchDebounce: true,
    enablePerformanceMonitoring: import.meta.env.DEV,
    enableErrorReporting: !import.meta.env.DEV,
    enableAnalytics: !import.meta.env.DEV,
  },

  // Error Handling
  errorHandling: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    showErrorBoundary: true,
    logErrors: true,
  },

  // Monitoring and Analytics
  monitoring: {
    // Performance monitoring
    performance: {
      enabled: import.meta.env.DEV,
      sampleRate: 0.1, // 10% of users
      maxMetrics: 100,
    },

    // Error reporting
    errorReporting: {
      enabled: !import.meta.env.DEV,
      sampleRate: 1.0, // 100% of errors
      maxErrors: 50,
    },

    // User analytics
    analytics: {
      enabled: !import.meta.env.DEV,
      trackPageViews: true,
      trackUserInteractions: true,
      trackPerformance: true,
    },
  },

  // Security
  security: {
    // Content Security Policy
    csp: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'", "https://*.supabase.co"],
        'font-src': ["'self'", "data:"],
      },
    },

    // Rate limiting
    rateLimit: {
      enabled: true,
      maxRequests: 100, // per minute
      windowMs: 60000, // 1 minute
    },
  },

  // Development
  development: {
    enableHotReload: import.meta.env.DEV,
    enableSourceMaps: import.meta.env.DEV,
    enableDebugLogging: import.meta.env.DEV,
    enablePerformanceProfiling: import.meta.env.DEV,
  },
};

// Type-safe environment variables
export const env = {
  NODE_ENV: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;

// Validation function for required environment variables
export function validateEnvironment() {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// Initialize environment validation
if (import.meta.env.PROD) {
  validateEnvironment();
}
