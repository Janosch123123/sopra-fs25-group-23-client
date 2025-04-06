// src/hooks/useLobbySocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '@/api/websocketService';

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
  const connect = useCallback(async (params?: Record<string, string>) => {
    if (!serviceRef.current) {
      console.error("WebSocket service not initialized");
      return null;
    }
    
    // Format token if not provided in params
    const connectionParams = { ...params };
    if (!connectionParams.token && localStorage.getItem("token")) {
      connectionParams.token = localStorage.getItem("token")?.replace(/"/g, '') || '';
    }
    
    console.log("Connecting to WebSocket with params:", 
      JSON.stringify({
        ...connectionParams,
        token: connectionParams.token ? "****" : undefined // Don't log the actual token
      })
    );
    
    try {
      const socket = await serviceRef.current.connect(connectionParams);
      
      // Update React state based on connection events
      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket disconnected with code: ${event.code}, reason: ${event.reason}`);
        setIsConnected(false);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      };
      
      return socket;
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      setIsConnected(false);
      throw error;
    }
  }, []);
  
  // Wrapper for sending messages
  const send = useCallback((data: any) => {
    if (!serviceRef.current) {
      console.error('Cannot send message: WebSocket service not initialized');
      return false;
    }
    
    if (!serviceRef.current.isConnected()) {
      console.error('Cannot send message: WebSocket is not connected');
      return false;
    }
    
    try {
      console.log('Sending WebSocket message:', data);
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
  
  return {
    isConnected,
    connect,
    send,
    disconnect
  };
}