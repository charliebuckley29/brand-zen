import { useState, useEffect, useCallback, useRef } from 'react';
import { createApiUrl, getAuthHeaders } from '@/lib/api';

interface SSEState {
  isConnected: boolean;
  lastUpdate: number | null;
  error: string | null;
  data: any;
}

interface UseSSEOptions {
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useServerSentEvents(options: UseSSEOptions = {}) {
  const {
    enabled = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [state, setState] = useState<SSEState>({
    isConnected: false,
    lastUpdate: null,
    error: null,
    data: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(async () => {
    if (!enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    try {
      // Get auth headers and append token to URL
      const authHeaders = await getAuthHeaders();
      const token = authHeaders.Authorization?.replace('Bearer ', '');
      
      if (!token) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: 'No authentication token available'
        }));
        return;
      }

      const sseUrl = createApiUrl('/admin/realtime');
      const urlWithToken = `${sseUrl}?token=${encodeURIComponent(token)}`;
      
      const eventSource = new EventSource(urlWithToken, {
        withCredentials: true
      });

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened successfully');
        setState(prev => ({
          ...prev,
          isConnected: true,
          error: null
        }));
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'data_update') {
            setState(prev => ({
              ...prev,
              data: message.data,
              lastUpdate: Date.now(),
              error: null
            }));
          } else if (message.type === 'connection') {
            console.log('SSE connection established:', message.data);
          } else if (message.type === 'error') {
            setState(prev => ({
              ...prev,
              error: message.data.error
            }));
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: 'Connection lost'
        }));

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`SSE: Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('SSE: Max reconnection attempts reached');
          setState(prev => ({
            ...prev,
            error: 'Connection failed after multiple attempts'
          }));
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: 'Failed to create connection'
      }));
    }
  }, [enabled, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false
    }));
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount and when enabled changes
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect
  };
}
