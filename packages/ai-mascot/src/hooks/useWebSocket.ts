import { useState, useEffect, useRef, useCallback } from 'react';

if (!import.meta.env.VITE_STAGE_DIRECTER_ENDPOINT) {
  throw new Error('VITE_STAGE_DIRECTER_ENDPOINT is not set in the environment variables.');
}

const WS_URL = import.meta.env.VITE_STAGE_DIRECTER_ENDPOINT as string;

interface UseWebSocketOptions<T> {
  onMessage: (message: T) => void; // Callback to handle validated messages
  onRawMessage?: (data: string) => void; // Optional callback for raw data
  onError?: (error: Event) => void; // Optional callback for errors
  onClose?: (event: CloseEvent) => void; // Optional callback for close events
  onOpen?: (event: Event) => void; // Optional callback for open events
}

export function useWebSocket<T>(options: UseWebSocketOptions<T>) {
  const { onMessage, onRawMessage, onError, onClose, onOpen } = options;
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      console.log(`WebSocket is already ${ws.current.readyState === WebSocket.OPEN ? 'connected' : 'connecting'}.`);
      return;
    }

    console.log(`Attempting to connect to WebSocket at ${WS_URL}...`);
    const newWs = new WebSocket(WS_URL);

    newWs.onopen = event => {
      console.log('WebSocket Connected');
      if (ws.current === newWs) {
        setIsConnected(true);
        onOpen?.(event); // Call the onOpen callback if provided
      } else {
        console.log('Received onopen for a stale WebSocket instance. Closing it.');
        newWs.close();
      }
    };

    newWs.onclose = event => {
      console.log(`WebSocket Disconnected: Code=${event.code}, Reason=${event.reason}`);
      if (ws.current === newWs) {
        setIsConnected(false);
        ws.current = null;
        onClose?.(event); // Call the onClose callback if provided
        // Optional: Implement reconnection logic here
        // console.log('Attempting to reconnect in 5 seconds...');
        // setTimeout(connectWebSocket, 5000);
      } else {
        console.log('Received onclose for a stale WebSocket instance.');
      }
    };

    newWs.onerror = error => {
      console.error('WebSocket Error:', error);
      onError?.(error); // Call the onError callback if provided
    };

    newWs.onmessage = event => {
      if (ws.current !== newWs) {
        console.log('Received message for a stale WebSocket instance.');
        return;
      }
      console.log('Raw message from server:', event.data);
      onRawMessage?.(event.data); // Call the raw message callback

      try {
        const parsedData = JSON.parse(event.data);
        // --- Pass the parsed data to the main message handler ---
        // Validation should happen within the component's handler now
        onMessage(parsedData);
      } catch (error) {
        console.error('Failed to parse message JSON:', error);
        // Optionally handle JSON parse errors specifically
      }
    };

    ws.current = newWs;
  }, [onMessage, onRawMessage, onError, onClose, onOpen]); // Add callbacks to dependencies

  useEffect(() => {
    connectWebSocket();

    return () => {
      const wsInstanceToClose = ws.current;
      ws.current = null;
      if (wsInstanceToClose) {
        wsInstanceToClose.close();
        console.log('WebSocket connection closed on component unmount.');
      }
    };
  }, [connectWebSocket]);

  const sendMessage = useCallback((message: string | object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
      ws.current.send(messageToSend);
      console.log('Sent message:', messageToSend);
    } else {
      console.log('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  return { isConnected, sendMessage };
}
