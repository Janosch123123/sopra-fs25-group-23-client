// src/hooks/useLobbySocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '@/api/websocketService';

// // Define an interface for Player type
// interface Player {
//   id: string;
//   username: string;
//   // Add other properties as needed
// }

export function useLobbySocket() {
  const [isConnected, setIsConnected] = useState(false);
  const serviceRef = useRef<WebSocketService | null>(null);
  
  // Initialize WebSocketService once
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new WebSocketService();
    }
    
    // Clean up on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
    };
  }, []);
  
  // Connect with auth token
  const connect = useCallback((params?: Record<string, string>) => {
    if (!serviceRef.current) return null;
    
    // Format token if not provided in params
    const connectionParams = { ...params };
    if (!connectionParams.token && localStorage.getItem("token")) {
      connectionParams.token = localStorage.getItem("token")?.replace(/"/g, '') || '';
    }
    
    const socket = serviceRef.current.connect(connectionParams);
    
    // Update React state based on connection events
    socket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    return socket;
  }, []);
  
  // Wrapper for sending messages
  const send = useCallback((data: { type: string; payload: unknown }) => {
    if (!serviceRef.current) {
      console.error('Cannot send message: WebSocket service not initialized');
      return false;
    }
    
    try {
      serviceRef.current.send(data);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }, []);
  
  // Wrapper for disconnecting
  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);
  
  useEffect(() => {
    // This effect can be used to set up event handlers in the future
    // For now we're keeping it empty but ready for future implementation
    
    return () => {
      // Clean up event handlers if necessary
    };
  }, []);

  return {
    isConnected,
    connect,
    send,
    disconnect
  };
}