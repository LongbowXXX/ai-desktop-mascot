const endpoint = import.meta.env.VITE_STAGE_DIRECTER_ENDPOINT;

if (!endpoint) {
  throw new Error('VITE_STAGE_DIRECTER_ENDPOINT is not set in the environment variables.');
}

const WS_URL = endpoint as string;

const RECONNECT_DELAY_MS = 5000;

type RawMessageHandler = (raw: string) => void;
type ParsedMessageHandler<T> = (message: T) => void;
type ConnectionEventHandler = (event: Event) => void;
type CloseEventHandler = (event: CloseEvent) => void;
type ErrorEventHandler = (event: Event) => void;

type ConnectionListener = (isConnected: boolean) => void;

export interface WebSocketHandlerGroup<T> {
  onMessage: ParsedMessageHandler<T>;
  onRawMessage?: RawMessageHandler;
  onOpen?: ConnectionEventHandler;
  onClose?: CloseEventHandler;
  onError?: ErrorEventHandler;
}

type InternalHandlerGroup = WebSocketHandlerGroup<unknown>;

class StageDirectorWebSocketService {
  private socket: WebSocket | null = null;
  private readonly handlerGroups = new Set<InternalHandlerGroup>();
  private readonly connectionListeners = new Set<ConnectionListener>();
  private reconnectTimeoutId: number | null = null;
  private connected = false;

  constructor(
    private readonly url: string,
    private readonly reconnectDelayMs = RECONNECT_DELAY_MS
  ) {}

  registerHandlers<T>(handlers: WebSocketHandlerGroup<T>): () => void {
    const casted = handlers as InternalHandlerGroup;
    this.handlerGroups.add(casted);
    this.ensureSocket();

    return () => {
      this.handlerGroups.delete(casted);
      if (this.handlerGroups.size === 0) {
        this.teardownSocket();
      }
    };
  }

  addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.connected);

    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  send(message: string | object) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Cannot send message.', message);
      return;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.socket.send(payload);
    console.log('Sent message:', payload);
  }

  getIsConnected() {
    return this.connected;
  }

  private ensureSocket() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.openNewSocket();
  }

  private openNewSocket() {
    this.clearReconnect();
    console.log(`Attempting to connect to WebSocket at ${this.url}...`);

    const ws = new WebSocket(this.url);
    this.socket = ws;

    ws.onopen = event => {
      if (this.socket !== ws) {
        console.log('Received onopen for a stale WebSocket instance. Closing it.');
        ws.close();
        return;
      }

      console.log('WebSocket Connected');
      this.updateConnectionState(true);
      this.handlerGroups.forEach(handler => handler.onOpen?.(event));
    };

    ws.onclose = event => {
      if (this.socket !== ws) {
        console.log('Received onclose for a stale WebSocket instance.');
        return;
      }

      console.log(`WebSocket Disconnected: Code=${event.code}, Reason=${event.reason}`);
      this.updateConnectionState(false);
      this.socket = null;
      this.handlerGroups.forEach(handler => handler.onClose?.(event));

      if (this.handlerGroups.size > 0) {
        this.scheduleReconnect();
      }
    };

    ws.onerror = error => {
      console.error('WebSocket Error:', error);
      this.handlerGroups.forEach(handler => handler.onError?.(error));
    };

    ws.onmessage = event => {
      if (this.socket !== ws) {
        console.log('Received message for a stale WebSocket instance.');
        return;
      }

      console.log('Raw message from server:', event.data);
      this.handlerGroups.forEach(handler => {
        handler.onRawMessage?.(event.data);

        try {
          const parsed = JSON.parse(event.data);
          handler.onMessage(parsed);
        } catch (error) {
          console.error('Failed to parse message JSON:', error);
        }
      });
    };
  }

  private teardownSocket() {
    this.clearReconnect();

    if (!this.socket) {
      return;
    }

    const ws = this.socket;
    this.socket = null;
    ws.close();
    console.log('WebSocket connection closed due to no active subscribers.');
  }

  private scheduleReconnect() {
    if (this.reconnectTimeoutId !== null) {
      return;
    }

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectTimeoutId = null;
      if (this.handlerGroups.size > 0 && !this.socket) {
        this.ensureSocket();
      }
    }, this.reconnectDelayMs);
  }

  private clearReconnect() {
    if (this.reconnectTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.reconnectTimeoutId);
    this.reconnectTimeoutId = null;
  }

  private updateConnectionState(isConnected: boolean) {
    if (this.connected === isConnected) {
      return;
    }

    this.connected = isConnected;
    this.connectionListeners.forEach(listener => listener(isConnected));
  }
}

export const stageDirectorWebSocketService = new StageDirectorWebSocketService(WS_URL);
