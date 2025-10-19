import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  connectionAttempts: number;
}

export function useWebSocket(url: string) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionAttempts: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setState(prev => ({ 
        ...prev, 
        error: 'No authentication token available',
        isConnecting: false 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isConnecting: true, 
      error: null 
    }));

    try {
      // Create WebSocket connection with authentication
      const ws = new WebSocket(url, [], {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false,
          error: null,
          connectionAttempts: 0
        }));
        console.log('WebSocket connected successfully');
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false 
        }));
        
        console.log('WebSocket closed:', event.code, event.reason);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && state.connectionAttempts < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, state.connectionAttempts);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${state.connectionAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ 
              ...prev, 
              connectionAttempts: prev.connectionAttempts + 1 
            }));
            connect();
          }, delay);
        } else if (state.connectionAttempts >= maxReconnectAttempts) {
          setState(prev => ({ 
            ...prev, 
            error: 'Max reconnection attempts reached' 
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'WebSocket connection error',
          isConnecting: false 
        }));
      };

    } catch (error: any) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to create WebSocket connection',
        isConnecting: false 
      }));
    }
  }, [url, state.connectionAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
      connectionAttempts: 0
    });
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setState(prev => ({ ...prev, connectionAttempts: 0 }));
    connect();
  }, [disconnect, connect]);

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
