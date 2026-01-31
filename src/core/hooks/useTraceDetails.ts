import { useEffect, useMemo } from 'react';
import { useLogQuery } from './useLogQuery';
import { EVENT_NAMES } from '../types/domain';

export interface TraceSpan {
  id: string;
  timestamp: number;
  eventId: number;
  event: string;
  severity: string;
  latency: number;
  relativeStart: number;
  duration: number;
  raw: Record<string, unknown>;
}

// Create correct reverse map
const EVENT_NAME_TO_ID: Record<string, number> = Object.entries(
  EVENT_NAMES,
).reduce(
  (acc, [id, name]) => {
    acc[name] = Number(id);
    return acc;
  },
  {} as Record<string, number>,
);

export const useTraceDetails = (traceId: number | null) => {
  const { results, loading, error, runQuery } = useLogQuery();

  useEffect(() => {
    if (traceId !== null) {
      runQuery(
        `SELECT * FROM logs WHERE journey_id = ${traceId} ORDER BY timestamp ASC`,
      );
    }
  }, [traceId, runQuery]);

  const spans = useMemo(() => {
    if (!results || results.length === 0) return [];

    const startTime = (results[0].timestamp as number) || 0;

    return results.map((row, index) => {
      const ts = (row.timestamp as number) || 0;
      const latency = (row.latency as number) || 0;
      const eventName = (row.event as string) || 'unknown';

      // Try to get ID from row, or derive from name, or default to 0
      let eventId = (row.event_id as number) ?? (row.eventId as number);
      if (eventId === undefined || eventId === null) {
        eventId = EVENT_NAME_TO_ID[eventName] ?? 0;
      }

      return {
        id: `span-${index}`,
        timestamp: ts,
        eventId: eventId,
        event: eventName,
        severity: (row.severity as string) || 'INFO',
        latency: latency,
        relativeStart: ts - startTime,
        duration: latency, // Latency in our simulation is the time since previous event
        raw: row,
      } as TraceSpan;
    });
  }, [results]);

  const totalDuration = useMemo(() => {
    if (spans.length === 0) return 0;
    const lastSpan = spans[spans.length - 1];
    return lastSpan.relativeStart + lastSpan.duration;
  }, [spans]);

  return {
    spans,
    totalDuration,
    loading,
    error,
  };
};
