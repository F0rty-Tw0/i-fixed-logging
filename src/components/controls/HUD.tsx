'use client';
import React, { useSyncExternalStore } from 'react';
import { logStore } from '../../core/store/log-store';
import styles from './HUD.module.css';

// Stable function references for useSyncExternalStore
const subscribeToStore = (cb: () => void) => logStore.subscribe(cb);
const getTotalLogsSnapshot = () => logStore.getTotalIngested();
const getServerTotalLogsSnapshot = () => 0;

interface HUDProps {
  activeCount: number;
}

export const HUD: React.FC<HUDProps> = ({ activeCount }) => {
  const totalLogs = useSyncExternalStore(
    subscribeToStore,
    getTotalLogsSnapshot,
    getServerTotalLogsSnapshot,
  );

  return (
    <div className={styles['container']}>
      <div className={styles['hud-stat']}>
        <span className={styles['label']}>Active Journeys</span>
        <span className={styles['value']}>{activeCount.toLocaleString()}</span>
      </div>
      <div className={styles['hud-stat']}>
        <span className={styles['label']}>Total Logs</span>
        <span className={styles['value']}>{totalLogs.toLocaleString()}</span>
      </div>
    </div>
  );
};
