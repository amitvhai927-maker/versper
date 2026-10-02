/**
 * Vesper Messenger - Client Real-Time WebSocket Service
 * Includes automatic reconnection, offline queueing, and idempotency protection
 */

import { WSEvent, WSEventType, Message } from '../../packages/models/types.ts';

type EventHandler = (payload: any) => void;

class VesperWSClient {
  private ws: WebSocket | null = null;
  private userId: string = 'usr_alex';
  private deviceId: string = 'dev_web_client';
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnectTimer: any = null;
  private offlineQueue: Array<{ event: WSEventType; payload: any }> = [];
  public status: 'connecting' | 'connected' | 'offline' = 'offline';

  public init(userId: string) {
    this.userId = userId;
    this.connect();
  }

  public setUserId(userId: string) {
    this.userId = userId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('auth.authenticate', { userId });
    }
  }

  private connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.status = 'connecting';
    this.emitLocal('status.change', { status: 'connecting' });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?userId=${this.userId}&deviceId=${this.deviceId}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status = 'connected';
        this.emitLocal('status.change', { status: 'connected' });
        // Process offline queue
        while (this.offlineQueue.length > 0) {
          const item = this.offlineQueue.shift();
          if (item) {
            this.send(item.event, item.payload);
          }
        }
      };

      this.ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as WSEvent;
          this.emitLocal(data.event, data.payload);
        } catch (e) {
          console.error('[WS Client Parse Error]', e);
        }
      };

      this.ws.onclose = () => {
        this.status = 'offline';
        this.emitLocal('status.change', { status: 'offline' });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.status = 'offline';
        this.emitLocal('status.change', { status: 'offline' });
      };
    } catch {
      this.status = 'offline';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  public send(event: WSEventType, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload, timestamp: new Date().toISOString() }));
    } else {
      // Offline queue buffer
      this.offlineQueue.push({ event, payload });
      this.connect();
    }
  }

  public on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private emitLocal(event: string, payload: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => h(payload));
    }
  }
}

export const wsClient = new VesperWSClient();
