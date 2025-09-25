// Production-ready logging utility
const isDev = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true';

export const logger = {
  // Always log errors in production
  error: (...args: any[]) => {
    console.error('[Brand Protected Error]', ...args);
  },

  // Log warnings in production
  warn: (...args: any[]) => {
    console.warn('[Brand Protected Warning]', ...args);
  },

  // Only log info in development
  info: (...args: any[]) => {
    if (isDev || isDebugEnabled) {
      console.log('[Brand Protected Info]', ...args);
    }
  },

  // Only log debug in development
  debug: (...args: any[]) => {
    if (isDev || isDebugEnabled) {
      console.log('[Brand Protected Debug]', ...args);
    }
  },

  // Performance logging
  performance: (label: string, startTime: number) => {
    if (isDev || isDebugEnabled) {
      const duration = performance.now() - startTime;
      console.log(`[Brand Protected Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
  },

  // Group logging for related operations
  group: (label: string, fn: () => void) => {
    if (isDev || isDebugEnabled) {
      console.group(`[Brand Protected] ${label}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }
};

// Performance monitoring utility
export const performanceMonitor = {
  start: (label: string) => {
    const startTime = performance.now();
    return {
      end: () => logger.performance(label, startTime),
      mark: (subLabel: string) => logger.performance(`${label} - ${subLabel}`, startTime)
    };
  }
};
