import { useEffect, useRef, useState } from 'react';
import { logStore } from '../store/log-store';

export const useSimulation = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ activeCount: 0 });

  useEffect(() => {
    // Instantiate Worker
    const worker = new Worker(
      new URL('../worker/simulation.worker.ts', import.meta.url),
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, payload } = e.data;

      if (type === 'BATCH') {
        const {
          timestamps,
          journeyIds,
          eventIds,
          severities,
          metaIndices,
          customerIds,
          ips,
          waitingRoomIds,
          activeCount,
        } = payload;

        // Ingest into store
        logStore.ingestBatch(
          timestamps,
          journeyIds,
          eventIds,
          severities,
          metaIndices,
          customerIds,
          ips,
          waitingRoomIds,
        );

        // Update local stats (throttled? React handles state updates reasonably well, but at 60fps it might jitter)
        // Ideally we sync this via a separate store or ref, but state is fine for the HUD for now
        setStats({ activeCount });
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const start = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'START' });
      setIsRunning(true);
    }
  };

  const stop = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
      setIsRunning(false);
    }
  };

  const reset = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'RESET' });
      setIsRunning(false);
    }
    logStore.clear();
    setStats({ activeCount: 0 });
  };

  const setUsers = (count: number) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'SET_USERS',
        payload: count,
      });
    }
  };

  return {
    start,
    stop,
    reset,
    setUsers,
    isRunning,
    stats,
  };
};
