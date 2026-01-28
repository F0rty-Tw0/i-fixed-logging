import { useEffect, useState } from 'react';
import { logStore } from '../store/log-store';
import { workerManager } from '../worker/worker-manager';

export const useSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ activeCount: 0 });

  useEffect(() => {
    // Subscribe to BATCH messages via workerManager
    const unsubscribe = workerManager.subscribe('BATCH', (payload) => {
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

      setStats({ activeCount });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const start = () => {
    workerManager.postMessage({ type: 'START' });
    setIsRunning(true);
  };

  const stop = () => {
    workerManager.postMessage({ type: 'STOP' });
    setIsRunning(false);
  };

  const reset = () => {
    workerManager.postMessage({ type: 'RESET' });
    setIsRunning(false);
    logStore.clear();
    setStats({ activeCount: 0 });
  };

  const setUsers = (count: number) => {
    workerManager.postMessage({
      type: 'SET_USERS',
      payload: count,
    });
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
