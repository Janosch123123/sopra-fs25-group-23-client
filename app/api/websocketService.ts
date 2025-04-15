import { getWebSocketDomain } from "@/utils/domain";

export class WebSocketService {
    private static instance: WebSocketService;
    private socket: WebSocket | null = null;
    private url: string = getWebSocketDomain();

    constructor() {
      // Prevent new instances if one already exists
      if (WebSocketService.instance) {
        throw new Error("Cannot instantiate more than one WebSocketService, use getInstance() instead");
      }
    }
    
    connect(params?: Record<string, string>): Promise<WebSocket> {
      // Build URL with query parameters if provided
      let connectionUrl = this.url;
      
      console.log("Base WebSocket URL:", connectionUrl);
      
      if (params && Object.keys(params).length > 0) {
        const queryString = Object.entries(params)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        connectionUrl = `${connectionUrl}?${queryString}`;
      }
      
      console.log("Attempting to connect to:", connectionUrl.replace(/token=[^&]+/, 'token=****'));
      
      // Close existing connection if there is one
      if (this.socket) {
        console.log("Closing existing WebSocket connection");
        this.socket.close();
      }
      
      // Create new WebSocket connection
      try {
        this.socket = new WebSocket(connectionUrl);
        console.log("WebSocket instance created");
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        throw new Error(`Failed to create WebSocket: ${error}`);
      }
      
      // Return a promise that resolves when the connection is open
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          const error = new Error('Failed to create WebSocket');
          console.error(error);
          reject(error);
          return;
        }
        
        // If socket is already open, resolve immediately
        if (this.socket.readyState === WebSocket.OPEN) {
          console.log("WebSocket already open");
          resolve(this.socket);
          return;
        }
        
        // Otherwise wait for it to open
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          resolve(this.socket!);
        };
        
        this.socket.onerror = (event) => {
          const error = new Error('WebSocket connection error');
          console.error(error, event);
          reject(error);
        };
        
        // Set a timeout to reject if it takes too long
        setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            const error = new Error('WebSocket connection timeout after 5 seconds');
            console.error(error);
            reject(error);
          }
        }, 5000);
      });
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
    
    // Add a getter for the socket
    public getSocket(): WebSocket | null {
      return this.socket;
    }
    
    // Add a static method to get the instance with proper singleton implementation
    static getInstance(): WebSocketService {
      if (!WebSocketService.instance) {
        WebSocketService.instance = new WebSocketService();
      }
      return WebSocketService.instance;
    }
}