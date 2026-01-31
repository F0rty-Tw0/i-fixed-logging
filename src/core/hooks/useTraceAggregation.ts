import { useState, useEffect, useRef, useCallback } from 'react';
import { logStore } from '../store';
import { MAX_LOGS } from '../constants';
import { TraceSummary } from '../types/domain';

export const useTraceAggregation = () => {
  const [summaries, setSummaries] = useState<TraceSummary[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const lastProcessedRef = useRef(0);
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

  const feedWorker = useCallback((force = false) => {
    const total = logStore.getTotalIngested();
    const last = lastProcessedRef.current;

    // Reset detection
    if (total < last) {
      workerRef.current?.postMessage({ type: 'RESET' });
      lastProcessedRef.current = 0;
      return;
    }

    if (total === last && !force) return;

    const count = total - last;
    if (count === 0 && !force) return;

    // Limit batch size to prevent blocking the main thread for too long
    // If we have a massive backlog, we process it in chunks or just the latest?
    // The worker aggregates, so it needs all of them to be accurate.
    // MAX_LOGS is 100,000. Extracting 100,000 at once is ~10ms-20ms.
    // That's acceptable for a worker feed, but let's be careful.

    // Actually, we should only process up to MAX_LOGS from the end if we are way behind
    // But since it's a ring buffer, we just need the new ones.

    const journeyIds = new Int32Array(count);
    const timestamps = new Float64Array(count);
    const eventIds = new Uint8Array(count);
    const severities = new Uint8Array(count);
    const customerSegments = new Uint8Array(count);

    for (let i = 0; i < count; i++) {
      const logicalIdx = last + i;
      const physicalIdx = logicalIdx % MAX_LOGS;
      const snap = logStore.getSnapshotByPhysicalIndex(physicalIdx);

      if (snap) {
        journeyIds[i] = snap.journeyId;
        timestamps[i] = snap.timestamp;
        eventIds[i] = snap.eventId;
        severities[i] = snap.severity;
        customerSegments[i] = snap.customerSegment;
      }
    }

    workerRef.current?.postMessage(
      {
        type: 'INGEST',
        payload: {
          journeyIds,
          timestamps,
          eventIds,
          severities,
          customerSegments,
          count,
        },
      },
      [
        journeyIds.buffer,
        timestamps.buffer,
        eventIds.buffer,
        severities.buffer,
        customerSegments.buffer,
      ],
    );

    lastProcessedRef.current = total;
  }, []);

  useEffect(() => {
    // Initialize Worker
    const worker = new Worker(
      new URL('../worker/trace-aggregator.worker.ts', import.meta.url),
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, summaries: newSummaries } = e.data;
      if (type === 'UPDATE') {
        setSummaries(newSummaries);
      }
    };

    // Initial feed
    feedWorker(true);

    const throttledFeed = () => {
      if (throttleRef.current) return;

      throttleRef.current = setTimeout(() => {
        feedWorker();
        throttleRef.current = null;
      }, 100); // 10fps update rate for aggregation is plenty
    };

    const unsub = logStore.subscribe(throttledFeed);

    const refreshInterval = setInterval(feedWorker, 2000);

    return () => {
      unsub();
      clearInterval(refreshInterval);
      if (throttleRef.current) clearTimeout(throttleRef.current);
      worker.terminate();
      workerRef.current = null;
    };
  }, [feedWorker]);

  return summaries;
};
