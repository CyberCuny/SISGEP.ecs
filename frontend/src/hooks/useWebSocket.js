import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(user, onNotification) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const mounted = useRef(true);
  const attemptRef = useRef(0);

  const connect = useCallback(() => {
    if (!user || ws.current?.readyState === WebSocket.OPEN) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/ws/notifications/`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      attemptRef.current = 0;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'notification' && onNotification) {
          onNotification(data);
        }
      } catch { /* ignore */ }
    };

    ws.current.onclose = () => {
      if (mounted.current) {
        attemptRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, attemptRef.current - 1), 30000);
        const jitter = Math.random() * 1000;
        reconnectTimer.current = setTimeout(connect, delay + jitter);
      }
    };
  }, [user, onNotification]);

  useEffect(() => {
    mounted.current = true;
    connect();
    return () => {
      mounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws.current) ws.current.close();
    };
  }, [connect]);

  return ws;
}
