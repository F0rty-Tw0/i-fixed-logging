'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logStore } from '../core/store/log-store';
import styles from './Controls.module.css';
import { ViewMode } from '../core/types/domain';
import { SearchBar } from './controls/SearchBar';
import { SimulationControls } from './controls/SimulationControls';
import { HUD } from './controls/HUD';

interface ControlsProps {
  isRunning: boolean;
  activeCount: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUsersChange: (val: number) => void;
  navigation?: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'QUEUE SIMULATOR',
  [`/${ViewMode.TAIL_SAMPLING}`]: 'TAIL SAMPLING',
  [`/${ViewMode.WIDE_EVENT}`]: 'WIDE EVENTS',
  [`/${ViewMode.STRUCTURED_LOGS}`]: 'STRUCTURED LOGS',
  [`/${ViewMode.DISTRIBUTED_TRACING}`]: 'DISTRIBUTED TRACING',
};

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  activeCount,
  onStart,
  onStop,
  onReset,
  onUsersChange,
  navigation,
}) => {
  const pathname = usePathname();

  // Sync simulation state to LogStore for search inhibition
  useEffect(() => {
    logStore.setSimulationRunning(isRunning);
  }, [isRunning]);

  const currentTitle = PAGE_TITLES[pathname] || 'QUEUE SIMULATOR';

  return (
    <div className={styles['controls-container']}>
      <div className={styles['left-panel']}>
        {navigation}
        <span className={styles['title']}>{currentTitle}</span>

        <SimulationControls
          isRunning={isRunning}
          onStart={onStart}
          onStop={onStop}
          onReset={onReset}
          onUsersChange={onUsersChange}
        />

        <SearchBar />
      </div>

      <HUD activeCount={activeCount} />
    </div>
  );
};
