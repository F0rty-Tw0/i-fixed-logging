'use client';

import React from 'react';
import styles from './Controls.module.css';
import { SearchBar } from './controls/SearchBar';
import { SimulationControls } from './controls/SimulationControls';
import { HUD } from './controls/HUD';
import { PageHeader } from './controls/PageHeader';

import { ThemeToggle } from './ThemeToggle';

interface ControlsProps {
  isRunning: boolean;
  activeCount: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUsersChange: (val: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  activeCount,
  onStart,
  onStop,
  onReset,
  onUsersChange,
}) => {
  return (
    <header className={styles['controls-container']}>
      <div className={styles['left-panel']}>
        <PageHeader />

        <div className={styles.divider} />

        <SimulationControls
          isRunning={isRunning}
          onStart={onStart}
          onStop={onStop}
          onReset={onReset}
          onUsersChange={onUsersChange}
        />
      </div>

      <div className={styles['right-panel']}>
        <SearchBar />
        <HUD activeCount={activeCount} />
        <div className={styles.divider} />
        <ThemeToggle />
      </div>
    </header>
  );
};
