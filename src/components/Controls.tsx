'use client';

import React from 'react';
import styles from './Controls.module.css';
import { SearchBar } from './controls/SearchBar';
import { SimulationControls } from './controls/SimulationControls';
import { HUD } from './controls/HUD';
import { PageHeader } from './controls/PageHeader';

interface ControlsProps {
  isRunning: boolean;
  activeCount: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUsersChange: (val: number) => void;
  navigation?: React.ReactNode;
}

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  activeCount,
  onStart,
  onStop,
  onReset,
  onUsersChange,
  navigation,
}) => {
  return (
    <div className={styles['controls-container']}>
      <div className={styles['left-panel']}>
        {navigation}
        <PageHeader />

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
