import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useServerSentEvents } from './useServerSentEvents';
import { createApiUrl } from '@/lib/api';

interface RealTimeData {
  queueStatus: any;
  systemHealth: any;
  apiHealth: any;
  alerts: any[];
  sentimentUpdates: any;
  recoveryActions: any[];
  userActivity: any[];
  emailDelivery: any[];
}

interface RealTimeDataState {
  data: RealTimeData;
  isConnected: boolean;
  lastUpdate: number | null;
  connectionAttempts: number;
  error: string | null;
}

export function useRealTimeData() {
  const [state, setState] = useState<RealTimeDataState>({
    data: {
      queueStatus: null,
      systemHealth: null,
      apiHealth: null,
      alerts: [],
      sentimentUpdates: null,
      recoveryActions: [],
      userActivity: [],
      emailDelivery: []
    },
    isConnected: false,
    lastUpdate: null,
    connectionAttempts: 0,
    error: null
  });

  // Try SSE first (works with Vercel), fallback to WebSocket
  const sse = useServerSentEvents({ enabled: true });
  
  // Create WebSocket URL as fallback
  const wsUrl = createApiUrl('/ws/admin')
    .replace('https://', 'wss://')
    .replace('http://', 'ws://');

  const { isConnected: wsConnected, lastMessage, connectionAttempts, error: wsError, reconnect: wsReconnect } = useWebSocket(wsUrl, { enabled: !sse.isConnected });

  // Update connection state - prefer SSE, fallback to WebSocket
  useEffect(() => {
    const isConnected = sse.isConnected || wsConnected;
    const error = sse.error || wsError;
    const totalConnectionAttempts = sse.isConnected ? 0 : connectionAttempts;
    
    setState(prev => ({
      ...prev,
      isConnected,
      connectionAttempts: totalConnectionAttempts,
      error
    }));
  }, [sse.isConnected, sse.error, wsConnected, wsError, connectionAttempts]);

  // Process SSE data updates (primary method)
  useEffect(() => {
    if (sse.data) {
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          ...sse.data
        },
        lastUpdate: sse.lastUpdate || Date.now()
      }));
    }
  }, [sse.data, sse.lastUpdate]);

  // Process WebSocket messages (fallback only when SSE is not connected)
  useEffect(() => {
    if (!lastMessage || sse.isConnected) return; // Only use WebSocket if SSE is not connected

    const { type, data: messageData, timestamp } = lastMessage;

    setState(prev => ({
      ...prev,
      lastUpdate: timestamp
    }));

    switch (type) {
      case 'initial_data':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            ...messageData
          }
        }));
        break;
      
      case 'queue_update':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            queueStatus: messageData
          }
        }));
        break;
      
      case 'queue_error':
        // Add queue error to alerts
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            alerts: [{
              id: `queue_error_${timestamp}`,
              type: 'queue_error',
              title: 'Queue Error',
              message: messageData.message || 'Queue processing error',
              severity: 'error',
              timestamp,
              data: messageData
            }, ...prev.data.alerts].slice(0, 50) // Keep last 50 alerts
          }
        }));
        break;
      
      case 'system_health':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            systemHealth: messageData
          }
        }));
        break;
      
      case 'api_health':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            apiHealth: messageData
          }
        }));
        break;
      
      case 'system_alert':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            alerts: [messageData, ...prev.data.alerts].slice(0, 50) // Keep last 50 alerts
          }
        }));
        break;
      
      case 'sentiment_update':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            sentimentUpdates: messageData
          }
        }));
        break;
      
      case 'recovery_action':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            recoveryActions: [messageData, ...prev.data.recoveryActions].slice(0, 20) // Keep last 20 actions
          }
        }));
        break;
      
      case 'user_activity':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            userActivity: [messageData, ...prev.data.userActivity].slice(0, 30) // Keep last 30 activities
          }
        }));
        break;
      
      case 'email_delivery':
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            emailDelivery: [messageData, ...prev.data.emailDelivery].slice(0, 20) // Keep last 20 deliveries
          }
        }));
        break;
      
      default:
        console.log('Unknown WebSocket message type:', type, messageData);
    }
  }, [lastMessage]);

  // Clear alerts function
  const clearAlert = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        alerts: prev.data.alerts.filter(alert => alert.id !== alertId)
      }
    }));
  }, []);

  // Clear all alerts function
  const clearAllAlerts = useCallback(() => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        alerts: []
      }
    }));
  }, []);

  // Get critical alerts
  const getCriticalAlerts = useCallback(() => {
    return state.data.alerts.filter(alert => 
      alert.severity === 'critical' || alert.severity === 'error'
    );
  }, [state.data.alerts]);

  // Get recent activity (last 5 minutes)
  const getRecentActivity = useCallback(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return state.data.userActivity.filter(activity => 
      activity.timestamp > fiveMinutesAgo
    );
  }, [state.data.userActivity]);

  // Get queue health status
  const getQueueHealth = useCallback(() => {
    if (!state.data.queueStatus) return 'unknown';
    
    const { failed, total } = state.data.queueStatus;
    if (total === 0) return 'healthy';
    
    const failureRate = failed / total;
    if (failureRate > 0.3) return 'critical';
    if (failureRate > 0.1) return 'warning';
    return 'healthy';
  }, [state.data.queueStatus]);

  // Get system health status
  const getSystemHealth = useCallback(() => {
    if (!state.data.systemHealth) return 'unknown';
    
    const { database, api_endpoints, queue_system } = state.data.systemHealth;
    
    if (database.status === 'unhealthy' || api_endpoints.status === 'unhealthy') {
      return 'critical';
    }
    
    if (queue_system.status === 'unhealthy' || queue_system.status === 'degraded') {
      return 'warning';
    }
    
    return 'healthy';
  }, [state.data.systemHealth]);

  // Combined reconnect function
  const reconnect = useCallback(() => {
    console.log('Real-time: Attempting to reconnect...');
    if (sse.isConnected) {
      sse.reconnect();
    } else {
      wsReconnect();
    }
  }, [sse.isConnected, sse.reconnect, wsReconnect]);

  // Fallback polling when both SSE and WebSocket fail
  useEffect(() => {
    if (!sse.isConnected && !wsConnected && sse.error && wsError) {
      console.log('Real-time: Both SSE and WebSocket failed, enabling fallback polling');
      // Could implement polling fallback here if needed
    }
  }, [sse.isConnected, wsConnected, sse.error, wsError]);

  return {
    data: state.data,
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,
    connectionAttempts: state.connectionAttempts,
    error: state.error,
    reconnect,
    clearAlert,
    clearAllAlerts,
    getCriticalAlerts,
    getRecentActivity,
    getQueueHealth,
    getSystemHealth
  };
}
