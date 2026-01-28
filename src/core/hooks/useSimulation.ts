import { useEffect, useState, useCallback } from 'react';
import { logStore } from '../store/log-store';
import { workerManager } from '../worker/worker-manager';
import { BatchPayload } from '../types/domain';

export interface SimulationStats {
  activeCount: number;
}

export interface SimulationControls {
  start: () => void;
  stop: () => void;
  reset: () => void;
  setUsers: (count: number) => void;
  isRunning: boolean;
  stats: SimulationStats;
}

export const useSimulation = (): SimulationControls => {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<SimulationStats>({ activeCount: 0 });

  useEffect(() => {
    // Subscribe to BATCH messages via workerManager
    const unsubscribe = workerManager.subscribe<BatchPayload>(
      'BATCH',
      (payload) => {
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
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const start = useCallback(() => {
    workerManager.postMessage({ type: 'START' });
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    workerManager.postMessage({ type: 'STOP' });
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    workerManager.postMessage({ type: 'RESET' });
    setIsRunning(false);
    logStore.clear();
    setStats({ activeCount: 0 });
  }, []);

  const setUsers = useCallback((count: number) => {
    workerManager.postMessage({
      type: 'SET_USERS',
      payload: count,
    });
  }, []);

  return {
    start,
    stop,
    reset,
    setUsers,
    isRunning,
    stats,
  };
};
