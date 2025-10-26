import { useState, useEffect, useMemo, useCallback } from 'react';
import { stageDirectorWebSocketService, WebSocketHandlerGroup } from '../services/websocket_service';

export type UseWebSocketOptions<T> = WebSocketHandlerGroup<T>;

export function useWebSocket<T>(options: UseWebSocketOptions<T>) {
  const { onMessage, onRawMessage, onError, onClose, onOpen } = options;
  const [isConnected, setIsConnected] = useState(stageDirectorWebSocketService.getIsConnected());

  const handlerGroup = useMemo<WebSocketHandlerGroup<T>>(
    () => ({
      onMessage,
      onRawMessage,
      onError,
      onClose,
      onOpen,
    }),
    [onMessage, onRawMessage, onError, onClose, onOpen]
  );

  useEffect(() => {
    const removeHandlers = stageDirectorWebSocketService.registerHandlers(handlerGroup);
    const removeConnectionListener = stageDirectorWebSocketService.addConnectionListener(setIsConnected);

    return () => {
      removeConnectionListener();
      removeHandlers();
    };
  }, [handlerGroup]);

  const sendMessage = useCallback((message: string | object) => {
    stageDirectorWebSocketService.send(message);
  }, []);

  return { isConnected, sendMessage };
}
