import { useEffect, useMemo } from 'react';
import { useLogQuery } from './useLogQuery';

export interface TraceSpan {
  timestamp: number;
  eventId: number;
  event: string;
  severity: string;
  latency: number;
  relativeStart: number;
  duration: number;
  raw: Record<string, unknown>;
}

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

    return results.map((row) => {
      const ts = (row.timestamp as number) || 0;
      const latency = (row.latency as number) || 0;

      return {
        timestamp: ts,
        eventId: row.event_id as number,
        event: (row.event as string) || 'unknown',
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
