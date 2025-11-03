// src/lib/websocketClient.ts
import { WSMessage } from "@/types";

class WebSocketClient {
    private ws: WebSocket | null = null;
    private messageListeners: Map<string, Set<(payload: any) => void>> = new Map();
    private connectionStatusListeners: Set<(isConnected: boolean) => void> = new Set();
    private isConnected = false;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.connect();
        }
    }

    private connect() {
        // ADDED: Clear any existing reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // ADDED: Don't create new connection if already open
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('[WSClient] Connection already exists, skipping...');
            return;
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
                this.messageListeners.get(message.type)?.forEach(handler => handler(message.payload));
            } catch (error) {
                console.error('[WSClient] Error parsing message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('[WSClient] Disconnected.');
            this.isConnected = false;
            this.connectionStatusListeners.forEach(listener => listener(false));
            
            // ADDED: Only reconnect if not intentionally closed
            this.reconnectTimeout = setTimeout(() => this.connect(), 2000);
        };

        this.ws.onerror = (error) => {
            console.error('[WSClient] Error:', error);
        };
    }

    public sendMessage(message: WSMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('[WSClient] Not connected. Cannot send message.');
        }
    }

    public onMessage(type: string, handler: (payload: any) => void): () => void {
        if (!this.messageListeners.has(type)) {
            this.messageListeners.set(type, new Set());
        }
        this.messageListeners.get(type)!.add(handler);

        return () => {
            this.messageListeners.get(type)?.delete(handler);
        };
    }
    
    public onConnectionStatusChange(listener: (isConnected: boolean) => void): () => void {
        this.connectionStatusListeners.add(listener);
        listener(this.isConnected);
        
        return () => {
            this.connectionStatusListeners.delete(listener);
        };
    }

    // ADDED: Method to close connection cleanly
    public close() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const websocketClient = new WebSocketClient();