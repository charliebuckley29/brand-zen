import React from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '@/lib/logger';

// Performance metrics interface
interface PerformanceMetric {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceState {
  // Metrics storage
  metrics: PerformanceMetric[];
  activeMetrics: Map<string, PerformanceMetric>;
  
  // Performance configuration
  maxMetrics: number;
  slowThreshold: number; // milliseconds
  
  // Actions
  startMetric: (name: string, id?: string, metadata?: Record<string, any>) => string;
  endMetric: (id: string) => void;
  getMetric: (id: string) => PerformanceMetric | undefined;
  getMetricsByName: (name: string) => PerformanceMetric[];
  getSlowMetrics: () => PerformanceMetric[];
  clearMetrics: () => void;
  clearOldMetrics: () => void;
  
  // Performance analysis
  getAverageDuration: (name: string) => number;
  getPerformanceReport: () => {
    total: number;
    slow: number;
    average: number;
    byName: Record<string, { count: number; average: number; slow: number }>;
  };
}

export const usePerformanceStore = create<PerformanceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      metrics: [],
      activeMetrics: new Map(),
      maxMetrics: 1000,
      slowThreshold: 1000, // 1 second
      
      // Actions
      startMetric: (name: string, id?: string, metadata?: Record<string, any>) => {
        const metricId = id || `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = performance.now();
        
        const metric: PerformanceMetric = {
          id: metricId,
          name,
          startTime,
          metadata,
        };
        
        const { activeMetrics } = get();
        activeMetrics.set(metricId, metric);
        
        set({ activeMetrics: new Map(activeMetrics) });
        
        logger.debug(`Started metric: ${name} (${metricId})`);
        return metricId;
      },
      
      endMetric: (id: string) => {
        const { activeMetrics, metrics, maxMetrics, slowThreshold } = get();
        const metric = activeMetrics.get(id);
        
        if (!metric) {
          logger.warn(`Metric not found: ${id}`);
          return;
        }
        
        const endTime = performance.now();
        const duration = endTime - metric.startTime;
        
        const completedMetric: PerformanceMetric = {
          ...metric,
          endTime,
          duration,
        };
        
        // Remove from active metrics
        activeMetrics.delete(id);
        
        // Add to completed metrics
        const newMetrics = [completedMetric, ...metrics].slice(0, maxMetrics);
        
        set({
          activeMetrics: new Map(activeMetrics),
          metrics: newMetrics,
        });
        
        // Log slow metrics
        if (duration > slowThreshold) {
          logger.warn(`Slow metric detected: ${metric.name} took ${duration.toFixed(2)}ms`, {
            id,
            duration,
            metadata: metric.metadata,
          });
        } else {
          logger.debug(`Completed metric: ${metric.name} (${duration.toFixed(2)}ms)`);
        }
      },
      
      getMetric: (id: string) => {
        const { activeMetrics, metrics } = get();
        return activeMetrics.get(id) || metrics.find(m => m.id === id);
      },
      
      getMetricsByName: (name: string) => {
        const { metrics } = get();
        return metrics.filter(m => m.name === name);
      },
      
      getSlowMetrics: () => {
        const { metrics, slowThreshold } = get();
        return metrics.filter(m => (m.duration || 0) > slowThreshold);
      },
      
      clearMetrics: () => {
        logger.info('Clearing all performance metrics');
        set({
          metrics: [],
          activeMetrics: new Map(),
        });
      },
      
      clearOldMetrics: () => {
        const { metrics, maxMetrics } = get();
        const newMetrics = metrics.slice(0, maxMetrics);
        set({ metrics: newMetrics });
      },
      
      // Performance analysis
      getAverageDuration: (name: string) => {
        const { metrics } = get();
        const namedMetrics = metrics.filter(m => m.name === name && m.duration);
        if (namedMetrics.length === 0) return 0;
        
        const total = namedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
        return total / namedMetrics.length;
      },
      
      getPerformanceReport: () => {
        const { metrics, slowThreshold } = get();
        const completedMetrics = metrics.filter(m => m.duration);
        
        const total = completedMetrics.length;
        const slow = completedMetrics.filter(m => (m.duration || 0) > slowThreshold).length;
        const average = total > 0 ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / total : 0;
        
        // Group by name
        const byName: Record<string, { count: number; average: number; slow: number }> = {};
        completedMetrics.forEach(metric => {
          if (!byName[metric.name]) {
            byName[metric.name] = { count: 0, average: 0, slow: 0 };
          }
          byName[metric.name].count++;
          if ((metric.duration || 0) > slowThreshold) {
            byName[metric.name].slow++;
          }
        });
        
        // Calculate averages for each name
        Object.keys(byName).forEach(name => {
          const namedMetrics = completedMetrics.filter(m => m.name === name);
          byName[name].average = namedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / namedMetrics.length;
        });
        
        return {
          total,
          slow,
          average,
          byName,
        };
      },
    }),
    {
      name: 'performance-store',
    }
  )
);

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const { startMetric, endMetric, getPerformanceReport } = usePerformanceStore();
  
  const measure = async <T,>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const id = startMetric(name, undefined, metadata);
    try {
      const result = await fn();
      return result;
    } finally {
      endMetric(id);
    }
  };
  
  const measureSync = <T,>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T => {
    const id = startMetric(name, undefined, metadata);
    try {
      const result = fn();
      return result;
    } finally {
      endMetric(id);
    }
  };
  
  return {
    measure,
    measureSync,
    getPerformanceReport,
  };
};

// Performance component for React
export const PerformanceMonitor: React.FC = () => {
  const { getPerformanceReport, clearMetrics } = usePerformanceStore();
  const report = getPerformanceReport();
  
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div>Total Metrics: {report.total}</div>
      <div>Slow Metrics: {report.slow}</div>
      <div>Average Duration: {report.average.toFixed(2)}ms</div>
      <button onClick={clearMetrics} style={{ marginTop: '5px', fontSize: '10px' }}>
        Clear
      </button>
    </div>
  );
};
