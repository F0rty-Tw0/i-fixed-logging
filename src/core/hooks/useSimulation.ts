import { useEffect, useState, useCallback, useRef } from 'react';
import { logStore } from '../store';
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
  const [isFinished, setIsFinished] = useState(false);
  const [stats, setStats] = useState<SimulationStats>({ activeCount: 0 });

  const lastStatsUpdateTimeRef = useRef(0);
  const pendingActiveCountRef = useRef(0);
  const statsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const flushStats = () => {
      setStats({ activeCount: pendingActiveCountRef.current });
      lastStatsUpdateTimeRef.current = Date.now();
      statsTimeoutRef.current = null;
    };

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
          customerSegments,
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
          customerSegments,
          ips,
          waitingRoomIds,
        );

        // Throttle the stats state update
        pendingActiveCountRef.current = activeCount;
        const now = Date.now();
        const throttleMs = 150;

        if (now - lastStatsUpdateTimeRef.current > throttleMs) {
          if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
          flushStats();
        } else if (!statsTimeoutRef.current) {
          statsTimeoutRef.current = setTimeout(flushStats, throttleMs);
        }
      },
    );

    const unsubscribeFinished = workerManager.subscribe('FINISHED', () => {
      setIsRunning(false);
      setIsFinished(true);
    });

    return () => {
      unsubscribe();
      unsubscribeFinished();
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    workerManager.postMessage({ type: 'RESET' });
    setIsRunning(false);
    setIsFinished(false);
    logStore.clear();
    setStats({ activeCount: 0 });
  }, []);

  const start = useCallback(() => {
    if (isFinished) {
      reset();
    }
    workerManager.postMessage({ type: 'START' });
    setIsRunning(true);
    setIsFinished(false);
  }, [isFinished, reset]);

  const stop = useCallback(() => {
    workerManager.postMessage({ type: 'STOP' });
    setIsRunning(false);
  }, []);

  const setUsers = useCallback((count: number) => {
    workerManager.postMessage({
      type: 'SET_USERS',
      payload: count,
    });
  }, []);

  useEffect(() => {
    logStore.setSimulationRunning(isRunning);
  }, [isRunning]);

  return {
    start,
    stop,
    reset,
    setUsers,
    isRunning,
    stats,
  };
};
