import { getWebSocketDomain } from "@/utils/domain";


export class WebSocketService {
    private socket: WebSocket | null = null;
    private url: string = getWebSocketDomain();

    
    connect(params?: Record<string, string>) {
      // Build URL with query parameters if provided
      let connectionUrl = this.url;
      if (params && Object.keys(params).length > 0) {
        const queryString = Object.entries(params)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        connectionUrl = `${connectionUrl}?${queryString}`;
      }
      
      // Create new WebSocket connection
      this.socket = new WebSocket(connectionUrl);
      return this.socket;
    }
    
    send(data: unknown) {
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

    // addEventListener(event: string, callback: (data: unknown) => void): void {
    //   if (!this.socket) {
    //     throw new Error('WebSocket is not connected');
    //   }
    //   this.socket.addEventListener(event, (event) => {
    //     callback(event.data);
    //   });
    // }
  }