// src/hooks/useLobbySocket.ts
import { useState, useEffect, useCallback } from 'react';
import { WebSocketService } from '@/api/websocketService';

let globalIsConnected = false;

export function useLobbySocket() {
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const service = WebSocketService.getInstance();
  

  // Initialize WebSocketService once
  useEffect(() => {
    setIsConnected(globalIsConnected);

    // Clean up on unmount
    return () => {
    };
  }, []);
  
  // Connect with auth token
  const connect = useCallback((params?: Record<string, string>) => {
    // Format token if not provided in params
    const connectionParams = { ...params };
    if (!connectionParams.token && localStorage.getItem("token")) {
      connectionParams.token = localStorage.getItem("token")?.replace(/"/g, '') || '';
    }
    
    try {
      const socketPromise = service.connect(connectionParams);
      
      socketPromise.then(socket => {
        // Update both local and global connection state
        globalIsConnected = true;
        setIsConnected(true);
        
        // Set up event handlers if not already set
        if (!socket.onclose || !socket.onerror) {
          socket.onclose = () => {
            globalIsConnected = false;
            setIsConnected(false);
          };
          
          socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            globalIsConnected = false;
            setIsConnected(false);
          };
        }
      });
      
      return socketPromise;
    } catch (error) {
      console.error('Connection error:', error);
      return Promise.reject(error);
    }
  }, [service]);
  
  
  // Update disconnect to be more explicit
  const disconnect = useCallback(() => {
    service.disconnect();
    globalIsConnected = false;
    setIsConnected(false);
  }, [service]);
  
  return {
    isConnected,
    connect,
    send: (data: unknown) => service.send(data),
    disconnect,
    // We're now using the getSocket method we added to the WebSocketService class
    getSocket: () => service.isConnected() ? service.getSocket() : null
  };
}