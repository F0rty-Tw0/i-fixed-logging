import { useState, useEffect, useRef } from 'react';
import { logStore } from '../store/log-store';
import { TraceSummary, MAX_LOGS } from '../types/domain';

export const useTraceAggregation = () => {
  const [summaries, setSummaries] = useState<TraceSummary[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const lastProcessedRef = useRef(0);

  useEffect(() => {
    // Initialize Worker
    workerRef.current = new Worker(
      new URL('../worker/trace-aggregator.worker.ts', import.meta.url),
    );

    workerRef.current.onmessage = (e) => {
      const { type, summaries } = e.data;
      if (type === 'UPDATE') {
        setSummaries(summaries);
      }
    };

    const feedWorker = (force = false) => {
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

      // We limit batch size to avoid freezing main thread during data extraction
      // If we are too far behind, we might need a different strategy, but for now just process all.
      // Actually, if we are 100k behind, extracting 100k items is heavy.
      // But let's assume standard operation.

      const journeyIds = new Int32Array(count);
      const timestamps = new Float64Array(count);
      const eventIds = new Uint8Array(count);
      const severities = new Uint8Array(count);
      const customerSegments = new Uint8Array(count);

      for (let i = 0; i < count; i++) {
        // Physical index logic
        const logicalIdx = last + i;
        // Since we are reading from the raw ring buffer in the store
        // We need to map logicalIdx to physicalIdx.
        // But logStore doesn't expose raw arrays easily if we use `getSnapshot`.
        // `getSnapshotByPhysicalIndex` is fast.
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
      ); // Transferables

      lastProcessedRef.current = total;
    };

    // Initial feed - delay slightly to ensure worker is ready
    // This fixes the issue where navigating back doesn't show traces
    setTimeout(() => {
      feedWorker(true);
    }, 0);

    const unsub = logStore.subscribe(() => {
      // Debounce or throttle?
      // For now, just feed. The worker handles the heavy lifting.
      // Extraction is O(N) but N is small (50-100).
      feedWorker();
    });

    // Also set up a periodic refresh to ensure we catch any missed updates
    const refreshInterval = setInterval(() => {
      feedWorker();
    }, 1000);

    return () => {
      unsub();
      clearInterval(refreshInterval);
      workerRef.current?.terminate();
    };
  }, []);

  return summaries;
};
