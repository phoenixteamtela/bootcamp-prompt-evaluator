import { useEffect, useRef, useState, useCallback } from 'react';

interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export function useSSE(url: string | null) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [done, setDone] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
    setDone(false);
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!url) return;
    reset();

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => setConnected(true);

    const handleEvent = (e: MessageEvent) => {
      try {
        const parsed: SSEEvent = { event: e.type, data: JSON.parse(e.data) };
        setEvents(prev => [...prev, parsed]);
        setLastEvent(parsed);

        if (e.type === 'complete' || e.type === 'error') {
          setDone(true);
          source.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    source.addEventListener('status', handleEvent);
    source.addEventListener('progress', handleEvent);
    source.addEventListener('result', handleEvent);
    source.addEventListener('complete', handleEvent);
    source.addEventListener('error', handleEvent);
    source.addEventListener('ping', () => {}); // keep alive

    source.onerror = () => {
      setConnected(false);
      setDone(true);
      source.close();
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [url, reset]);

  return { events, lastEvent, connected, done, reset };
}
