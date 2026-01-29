import { useState, useEffect } from 'react';
import { logStore } from '../store/log-store';
import { JourneyEvent, LogSeverityId } from '../types/domain';

export interface TraceSummary {
  traceId: number;
  startTime: number;
  endTime: number;
  duration: number;
  eventCount: number;
  maxSeverity: LogSeverityId;
  lastEvent: JourneyEvent;
  customerSegment: number;
}

export const useTraceAggregation = () => {
  const [summaries, setSummaries] = useState<TraceSummary[]>([]);
  const [lastProcessedTotal, setLastProcessedTotal] = useState(0);

  useEffect(() => {
    const unsub = logStore.subscribe(() => {
      const total = logStore.getTotalIngested();
      // Only re-aggregate if we have significant new data or it's been cleared
      if (total < lastProcessedTotal || total - lastProcessedTotal > 100) {
        aggregate();
      }
    });

    const aggregate = () => {
      const totalLogs = logStore.getLength();
      const traces = new Map<number, TraceSummary>();

      // Scan all logs in the current buffer
      for (let i = 0; i < totalLogs; i++) {
        const snap = logStore.getSnapshot(i);
        if (!snap) continue;

        const existing = traces.get(snap.journeyId);
        if (existing) {
          existing.startTime = Math.min(existing.startTime, snap.timestamp);
          existing.endTime = Math.max(existing.endTime, snap.timestamp);
          existing.eventCount++;
          existing.maxSeverity = Math.max(existing.maxSeverity, snap.severity);

          // We assume logs are mostly chronological, but update lastEvent if this one is newer
          if (snap.timestamp >= existing.endTime) {
            existing.lastEvent = snap.eventId;
          }
        } else {
          traces.set(snap.journeyId, {
            traceId: snap.journeyId,
            startTime: snap.timestamp,
            endTime: snap.timestamp,
            duration: 0,
            eventCount: 1,
            maxSeverity: snap.severity,
            lastEvent: snap.eventId,
            customerSegment: snap.customerSegment,
          });
        }
      }

      // Finalize durations and convert to array
      const results = Array.from(traces.values()).map((t) => ({
        ...t,
        duration: t.endTime - t.startTime,
      }));

      // Sort by start time descending (newest first)
      results.sort((a, b) => b.startTime - a.startTime);

      setSummaries(results);
      setLastProcessedTotal(logStore.getTotalIngested());
    };

    // Initial aggregation
    aggregate();

    return unsub;
  }, [lastProcessedTotal]);

  return summaries;
};
