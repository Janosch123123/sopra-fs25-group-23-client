
import { getWebSocketDomain } from "@/utils/domain";


export class WebSocketService {
    private socket: WebSocket | null = null;
    private url: string = getWebSocketDomain();

    
    connect(params?: Record<string, string>): Promise<WebSocket> {
    // Build URL with query parameters if provided
    let connectionUrl = this.url;
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      connectionUrl = `${connectionUrl}?${queryString}`;
    }
    
    // Close existing connection if there is one
    if (this.socket) {
      this.socket.close();
    }
    
    // Create new WebSocket connection
    this.socket = new WebSocket(connectionUrl);
    
    // Return a promise that resolves when the connection is open
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Failed to create WebSocket'));
        return;
      }
      
      // If socket is already open, resolve immediately
      if (this.socket.readyState === WebSocket.OPEN) {
        resolve(this.socket);
        return;
      }
      
      // Otherwise wait for it to open
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        resolve(this.socket!);
      };
      
      this.socket.onerror = (event) => {
        console.error('WebSocket connection error');
        reject(new Error('WebSocket connection error'));
      };
      
      // Set a timeout to reject if it takes too long
      setTimeout(() => {
        if (this.socket?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }
    
    send(data: any) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not connected');
      }
      
      this.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    disconnect() {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
    }
    
    isConnected() {
      return this.socket && this.socket.readyState === WebSocket.OPEN;
    }
  }