// src/lib/websocketClient.ts
import { WSMessage } from "@/types";

class WebSocketClient {
    private ws: WebSocket | null = null;
    private messageListeners: Map<string, Set<(payload: any) => void>> = new Map();
    private connectionStatusListeners: Set<(isConnected: boolean) => void> = new Set();
    private isConnected = false;

    constructor() {
        // This check ensures this logic runs only once on the client-side
        if (typeof window !== 'undefined') {
            this.connect();
        }
    }

    private connect() {
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            return; // Don't create a new connection if one is already active or connecting
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
        console.log('[WSClient] Connecting...');

        this.ws.onopen = () => {
            console.log('[WSClient] Connected.');
            this.isConnected = true;
            this.connectionStatusListeners.forEach(listener => listener(true));
        };

        this.ws.onmessage = (event) => {
            try {
                const message: WSMessage = JSON.parse(event.data);
                console.log('[WSClient] Received:', message);
                // Notify all listeners for this message type
                this.messageListeners.get(message.type)?.forEach(handler => handler(message.payload));
            } catch (error) {
                console.error('[WSClient] Error parsing message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('[WSClient] Disconnected.');
            this.isConnected = false;
            this.connectionStatusListeners.forEach(listener => listener(false));
            // Attempt to reconnect after a short delay
            setTimeout(() => this.connect(), 2000);
        };

        this.ws.onerror = (error) => {
            console.error('[WSClient] Error:', error);
            this.isConnected = false;
            this.connectionStatusListeners.forEach(listener => listener(false));
        };
    }

    public sendMessage(message: WSMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('[WSClient] Not connected. Cannot send message.');
        }
    }

    // Allows React components to subscribe to specific message types
    public onMessage(type: string, handler: (payload: any) => void): () => void {
        if (!this.messageListeners.has(type)) {
            this.messageListeners.set(type, new Set());
        }
        this.messageListeners.get(type)!.add(handler);

        // Return an unsubscribe function
        return () => {
            this.messageListeners.get(type)?.delete(handler);
        };
    }
    
    // Allows React components to subscribe to the connection status
    public onConnectionStatusChange(listener: (isConnected: boolean) => void): () => void {
        this.connectionStatusListeners.add(listener);
        listener(this.isConnected); // Immediately notify with current status
        
        // Return an unsubscribe function
        return () => {
            this.connectionStatusListeners.delete(listener);
        };
    }
}

// Create the single instance that the whole app will use
export const websocketClient = new WebSocketClient();